-- سجل الحركات (H): كل دخول وكل حركة للموظف داخل التطبيق (أي لوحة فتح، الراديو، التحدي، النماذج…) مع اسمه ووقته
-- شغّل هذا الملف مرة واحدة في Supabase: SQL Editor ← New query ← الصق ← Run
-- ما يمسح أي شي موجود. يشوفه المشرف فقط. السجل يحتفظ بآخر 60 يوم ويمسح الأقدم تلقائياً.

create table if not exists public.ajf_act(
  id bigserial primary key,
  emp text not null,
  at timestamptz not null default now(),
  ev text not null,
  d text,
  dev text
);
create index if not exists ajf_act_at on public.ajf_act(at desc);
create index if not exists ajf_act_emp on public.ajf_act(emp, at desc);
alter table public.ajf_act enable row level security;
revoke all on public.ajf_act from anon, authenticated;

-- التطبيق يرسل الحركات دفعات: [{e:"board", d:"lc", t:<وقت الحركة بالملي ثانية>}, ...]
create or replace function public.ajf_act_log(p_token text, p_device text, p_ev jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare e public.employees; x jsonb; n int := 0; t timestamptz;
begin
  e := ajf__who(p_token, p_device);
  if e.emp is null then return jsonb_build_object('s','out'); end if;
  if jsonb_typeof(p_ev) <> 'array' then return jsonb_build_object('s','bad'); end if;
  for x in select * from jsonb_array_elements(p_ev) limit 60 loop
    if coalesce(x->>'e','') !~ '^[a-z_]{1,12}$' then continue; end if;
    begin t := to_timestamp((x->>'t')::double precision / 1000); exception when others then t := now(); end;
    t := least(now(), greatest(now() - interval '3 days', coalesce(t, now())));
    insert into ajf_act(emp, at, ev, d, dev) values (e.emp, t, x->>'e', left(coalesce(x->>'d',''), 80), left(p_device, 40));
    n := n + 1;
  end loop;
  if random() < 0.02 then delete from ajf_act where at < now() - interval '60 days'; end if;
  return jsonb_build_object('s','ok','n',n);
end $$;

-- للمشرف فقط: آخر الحركات (الكل أو موظف واحد)، 250 حركة في كل صفحة
create or replace function public.ajf_act_list(p_token text, p_device text, p_emp text default null, p_before timestamptz default null, p_self boolean default true)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare e public.employees; res jsonb;
begin
  e := ajf__who(p_token, p_device);
  if e.emp is null then return jsonb_build_object('s','out'); end if;
  if not e.is_admin then return jsonb_build_object('s','denied'); end if;
  select coalesce(jsonb_agg(x order by x.at desc, x.id desc), '[]'::jsonb) into res from (
    select a.id, a.at, a.emp, m.name, m.title, a.ev, a.d
    from ajf_act a left join employees m on m.emp = a.emp
    where (p_emp is null or a.emp = p_emp)
      and (p_self or p_emp is not null or a.emp <> e.emp)
      and (p_before is null or a.at < p_before)
    order by a.at desc, a.id desc limit 250) x;
  return jsonb_build_object('s','ok','rows',res);
end $$;

revoke all on function public.ajf_act_log(text,text,jsonb), public.ajf_act_list(text,text,text,timestamptz,boolean) from public;
grant execute on function public.ajf_act_log(text,text,jsonb), public.ajf_act_list(text,text,text,timestamptz,boolean) to anon, authenticated;
