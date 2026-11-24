-- تنبيهات وصول الرحلات على الجوال (Web Push)
-- شغّل هذا الملف مرة واحدة في Supabase: SQL Editor ← New query ← الصق ← Run

-- 1) اشتراكات الأجهزة. الجدول مقفل: لا يقرأه ولا يكتبه إلا الخادم (service_role) والدوال تحت.
create table if not exists public.ajf_push (
  endpoint text primary key,
  p256dh   text not null,
  auth     text not null,
  emp      text not null,
  device   text not null,
  token    text not null,
  created  timestamptz not null default now(),
  updated  timestamptz not null default now()
);
alter table public.ajf_push enable row level security;
revoke all on public.ajf_push from public, anon, authenticated;

-- 2) سجل التنبيهات المرسلة (يمنع تكرار نفس التنبيه لو اشتغل الوسيط مرتين)
create table if not exists public.ajf_push_log (
  day    date not null,
  flight text not null,
  stage  text not null,
  sent   timestamptz not null default now(),
  primary key (day, flight, stage)
);
alter table public.ajf_push_log enable row level security;
revoke all on public.ajf_push_log from public, anon, authenticated;

-- 3) اشتراك جوال: يتحقق من الجلسة بنفس دالة الدخول الموجودة (ajf_me)
create or replace function public.ajf_push_sub(p_token text, p_device text, p_sub jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me jsonb; ep text; k1 text; k2 text;
begin
  me := to_jsonb(public.ajf_me(p_token => p_token, p_device => p_device));
  if me is null or coalesce(me->>'emp','') = '' or me->>'s' = 'out' then return jsonb_build_object('s','out'); end if;
  ep := p_sub->>'endpoint'; k1 := p_sub#>>'{keys,p256dh}'; k2 := p_sub#>>'{keys,auth}';
  if ep is null or ep !~ '^https://' or length(ep) > 1000 or k1 is null or k2 is null then return jsonb_build_object('s','bad'); end if;
  insert into public.ajf_push(endpoint,p256dh,auth,emp,device,token)
  values (ep,k1,k2,me->>'emp',p_device,p_token)
  on conflict (endpoint) do update set p256dh=excluded.p256dh, auth=excluded.auth, emp=excluded.emp,
    device=excluded.device, token=excluded.token, updated=now();
  -- جهاز واحد = اشتراك واحد
  delete from public.ajf_push where device = p_device and endpoint <> ep;
  return jsonb_build_object('s','ok');
end $$;

-- 4) إلغاء الاشتراك (عند إيقاف التنبيهات أو تسجيل الخروج)
create or replace function public.ajf_push_unsub(p_endpoint text)
returns jsonb language sql security definer set search_path = public as $$
  delete from public.ajf_push where endpoint = p_endpoint;
  select jsonb_build_object('s','ok');
$$;

-- 5) قائمة الأجهزة المستلمة (للخادم فقط): تستبعد أي جلسة انتهت أو جوال أُلغي اعتماده
create or replace function public.ajf_push_targets()
returns table(endpoint text, p256dh text, auth text)
language plpgsql security definer set search_path = public as $$
declare r record; me jsonb;
begin
  for r in select * from public.ajf_push loop
    begin
      me := to_jsonb(public.ajf_me(p_token => r.token, p_device => r.device));
    exception when others then me := null;
    end;
    if me is not null and coalesce(me->>'emp','') <> '' and coalesce(me->>'s','') <> 'out' then
      endpoint := r.endpoint; p256dh := r.p256dh; auth := r.auth; return next;
    else
      delete from public.ajf_push where ajf_push.endpoint = r.endpoint;
    end if;
  end loop;
end $$;

-- 6) حجز تنبيه قبل إرساله: يرجع true مرة واحدة فقط لكل (يوم، رحلة، مرحلة)
create or replace function public.ajf_push_claim(p_day date, p_flight text, p_stage text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  insert into public.ajf_push_log(day,flight,stage) values (p_day,p_flight,p_stage);
  delete from public.ajf_push_log where day < current_date - 7;
  return true;
exception when unique_violation then return false;
end $$;

-- 7) حذف اشتراك منتهي (يرجعه خادم Apple/Google بخطأ 404/410)
create or replace function public.ajf_push_drop(p_endpoint text)
returns void language sql security definer set search_path = public as $$
  delete from public.ajf_push where endpoint = p_endpoint;
$$;

-- الصلاحيات: الجوال يقدر يشترك ويلغي فقط، والباقي للخادم
revoke all on function public.ajf_push_sub(text,text,jsonb), public.ajf_push_unsub(text),
  public.ajf_push_targets(), public.ajf_push_claim(date,text,text), public.ajf_push_drop(text) from public, anon, authenticated;
grant execute on function public.ajf_push_sub(text,text,jsonb), public.ajf_push_unsub(text) to anon, authenticated;
grant execute on function public.ajf_push_targets(), public.ajf_push_claim(date,text,text), public.ajf_push_drop(text) to service_role;
