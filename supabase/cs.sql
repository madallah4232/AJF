-- الكوردنيتر شيت المشترك: يظهر عند كل الموظفين المسجّلين مع اسم اللي سجّل كل وقت
-- الكتابة والتعديل (ومنها Push Back / ATD) للمشرف ومن يعطيه المشرف صلاحية فقط
-- شغّل هذا الملف مرة واحدة في Supabase: SQL Editor ← New query ← الصق ← Run
-- يعتمد على ajf_me (نفس دالة الدخول)، وما يغيّر أي جدول موجود.

create table if not exists public.ajf_cs (
  day    date not null,
  flight text not null,           -- رقم رحلة المغادرة
  k      text not null,           -- اسم الخانة (مثل act.open.s أو atd)
  v      text not null,
  emp    text not null,
  name   text,
  at     timestamptz not null default now(),
  primary key (day, flight, k)
);
alter table public.ajf_cs enable row level security;
revoke all on public.ajf_cs from public, anon, authenticated;

-- الموظفين اللي أعطاهم المشرف صلاحية الكتابة في الكوردنيتر شيت
create table if not exists public.ajf_cs_perm (
  emp  text primary key,
  by   text,
  at   timestamptz not null default now()
);
alter table public.ajf_cs_perm enable row level security;
revoke all on public.ajf_cs_perm from public, anon, authenticated;

create or replace function public.ajf_cs_can(me jsonb)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((me->>'admin')::boolean, false)
      or exists (select 1 from public.ajf_cs_perm p where p.emp = me->>'emp');
$$;

-- قراءة شيتات اليوم وأمس (لأي موظف مسجّل) + هل عنده صلاحية الكتابة
create or replace function public.ajf_cs_get(p_token text, p_device text, p_day date)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me jsonb; adm boolean;
begin
  me := to_jsonb(public.ajf_me(p_token => p_token, p_device => p_device));
  if me is null or coalesce(me->>'emp','') = '' or me->>'s' = 'out' then return jsonb_build_object('s','out'); end if;
  adm := coalesce((me->>'admin')::boolean, false);
  return jsonb_build_object('s','ok','can',public.ajf_cs_can(me),'admin',adm,
    'rows',coalesce((select jsonb_agg(jsonb_build_object('day',day,'flight',flight,'k',k,'v',v,'name',name,'emp',emp))
                     from public.ajf_cs where day between p_day - 1 and p_day),'[]'::jsonb),
    'perm',case when adm then coalesce((select jsonb_agg(emp order by at) from public.ajf_cs_perm),'[]'::jsonb) else '[]'::jsonb end);
end $$;

-- كتابة / تعديل / مسح خانة (p_v فاضي = مسح) · p_k = '*' يمسح شيت الرحلة كامل
create or replace function public.ajf_cs_set(p_token text, p_device text, p_day date, p_flight text, p_k text, p_v text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me jsonb; today date := (now() at time zone 'Asia/Riyadh')::date;
begin
  me := to_jsonb(public.ajf_me(p_token => p_token, p_device => p_device));
  if me is null or coalesce(me->>'emp','') = '' or me->>'s' = 'out' then return jsonb_build_object('s','out'); end if;
  if not public.ajf_cs_can(me) then return jsonb_build_object('s','denied'); end if;
  if p_flight is null or p_flight !~ '^[A-Z0-9]{2,8}$' or p_day is null or p_day < today - 1 or p_day > today + 1
     or p_k is null or (p_k <> '*' and p_k !~ '^[A-Za-z0-9_.]{1,40}$') or length(coalesce(p_v,'')) > 400 then
    return jsonb_build_object('s','bad');
  end if;
  if p_k = '*' then
    delete from public.ajf_cs where day = p_day and flight = p_flight;
  elsif coalesce(btrim(p_v),'') = '' then
    delete from public.ajf_cs where day = p_day and flight = p_flight and k = p_k;
  else
    insert into public.ajf_cs(day,flight,k,v,emp,name) values (p_day,p_flight,p_k,btrim(p_v),me->>'emp',me->>'name')
    on conflict (day,flight,k) do update set v=excluded.v, emp=excluded.emp, name=excluded.name, at=now();
  end if;
  delete from public.ajf_cs where day < today - 30;
  return jsonb_build_object('s','ok','name',me->>'name');
end $$;

-- إعطاء / سحب الصلاحية (للمشرف فقط)
create or replace function public.ajf_cs_perm_set(p_token text, p_device text, p_emp text, p_on boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me jsonb; e text := upper(btrim(coalesce(p_emp,'')));
begin
  me := to_jsonb(public.ajf_me(p_token => p_token, p_device => p_device));
  if me is null or coalesce(me->>'emp','') = '' or me->>'s' = 'out' then return jsonb_build_object('s','out'); end if;
  if not coalesce((me->>'admin')::boolean, false) then return jsonb_build_object('s','denied'); end if;
  if e !~ '^[A-Z0-9]{1,20}$' then return jsonb_build_object('s','bad'); end if;
  if p_on then
    insert into public.ajf_cs_perm(emp,by) values (e, me->>'emp') on conflict (emp) do nothing;
  else
    delete from public.ajf_cs_perm where emp = e;
  end if;
  return jsonb_build_object('s','ok','perm',coalesce((select jsonb_agg(emp order by at) from public.ajf_cs_perm),'[]'::jsonb));
end $$;

revoke all on function public.ajf_cs_can(jsonb), public.ajf_cs_get(text,text,date), public.ajf_cs_set(text,text,date,text,text,text),
  public.ajf_cs_perm_set(text,text,text,boolean) from public, anon, authenticated;
grant execute on function public.ajf_cs_get(text,text,date), public.ajf_cs_set(text,text,date,text,text,text),
  public.ajf_cs_perm_set(text,text,text,boolean) to anon, authenticated;
