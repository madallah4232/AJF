-- 📻 الراديو: تنبيهات مكتوبة من المشرف (توصل على شاشة القفل) + سجل البث الصوتي المباشر
-- شغّل هذا الملف مرة واحدة في Supabase: SQL Editor ← New query ← الصق ← Run
-- يعتمد على ajf_me و ajf_cfg و ajf_push الموجودين، وما يغيّر أي بيانات قديمة.
-- الإرسال والتكلم: للمشرف ولمن يعطيه المشرف صلاحية (مفتاح bcp في ajf_cfg). الاستقبال: كل موظف مسجّل.

create table if not exists public.ajf_bc (
  id      bigserial primary key,
  at      timestamptz not null default now(),
  emp     text not null,
  name    text,
  kind    text not null default 'text' check (kind in ('text','voice')),
  body    text not null default '',
  urgent  boolean not null default false,
  secs    int
);
create table if not exists public.ajf_bc_read (
  id   bigint not null references public.ajf_bc(id) on delete cascade,
  emp  text not null,
  at   timestamptz not null default now(),
  primary key (id, emp)
);
alter table public.ajf_bc enable row level security;
alter table public.ajf_bc_read enable row level security;
revoke all on public.ajf_bc, public.ajf_bc_read from public, anon, authenticated;

-- من يقدر يرسل ويتكلم
create or replace function public.ajf_bc__can(me jsonb)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((me->>'admin')::boolean,false)
      or exists (select 1 from public.ajf_cfg c, jsonb_array_elements_text(coalesce(c.v->'l','[]'::jsonb)) x
                 where c.k = 'bcp' and x = me->>'emp');
$$;

-- قناة الصوت: اسم سري عشوائي ما يوصله إلا الموظف المسجّل
create or replace function public.ajf_bc__room()
returns text language plpgsql security definer set search_path = public, extensions as $$
declare r text;
begin
  select v->>'r' into r from public.ajf_cfg where k = 'bc_room';
  if r is null then
    r := encode(gen_random_bytes(16),'hex');
    insert into public.ajf_cfg(k,v,by) values ('bc_room', jsonb_build_object('r',r), 'system') on conflict (k) do nothing;
    select v->>'r' into r from public.ajf_cfg where k = 'bc_room';
  end if;
  return r;
end $$;

-- الموظف: آخر التنبيهات (48 ساعة) + هل قرأها + قناة الصوت + هل يقدر يرسل
create or replace function public.ajf_bc_get(p_token text, p_device text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me jsonb; can boolean;
begin
  me := to_jsonb(public.ajf_me(p_token => p_token, p_device => p_device));
  if me is null or coalesce(me->>'emp','') = '' or me->>'s' = 'out' then return jsonb_build_object('s','out'); end if;
  can := public.ajf_bc__can(me);
  return jsonb_build_object('s','ok','can',can,'room',public.ajf_bc__room(),
    'perm', case when coalesce((me->>'admin')::boolean,false) then coalesce((select v->'l' from public.ajf_cfg where k='bcp'),'[]'::jsonb) else '[]'::jsonb end,
    'items', coalesce((select jsonb_agg(jsonb_build_object('id',b.id,'at',b.at,'emp',b.emp,'name',b.name,'kind',b.kind,'body',b.body,'urgent',b.urgent,'secs',b.secs,
        'read', b.emp = me->>'emp' or exists (select 1 from public.ajf_bc_read r where r.id = b.id and r.emp = me->>'emp'),
        'n', case when can then (select count(*) from public.ajf_bc_read r where r.id = b.id) end) order by b.id desc)
      from (select * from public.ajf_bc where at > now() - interval '48 hours' order by id desc limit 60) b), '[]'::jsonb));
end $$;

-- إرسال تنبيه مكتوب
create or replace function public.ajf_bc_send(p_token text, p_device text, p_body text, p_urgent boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me jsonb; nid bigint; t text := btrim(coalesce(p_body,''));
begin
  me := to_jsonb(public.ajf_me(p_token => p_token, p_device => p_device));
  if me is null or coalesce(me->>'emp','') = '' or me->>'s' = 'out' then return jsonb_build_object('s','out'); end if;
  if not public.ajf_bc__can(me) then return jsonb_build_object('s','denied'); end if;
  if length(t) = 0 or length(t) > 600 then return jsonb_build_object('s','bad'); end if;
  insert into public.ajf_bc(emp,name,kind,body,urgent) values (me->>'emp', me->>'name', 'text', t, coalesce(p_urgent,false)) returning id into nid;
  delete from public.ajf_bc where at < now() - interval '30 days';
  return jsonb_build_object('s','ok','id',nid);
end $$;

-- سجل البث الصوتي: يُسجَّل عند البدء (p_id فاضي) ويُحدَّث بعدد الثواني عند الانتهاء
create or replace function public.ajf_bc_talk(p_token text, p_device text, p_id bigint, p_secs int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me jsonb; nid bigint;
begin
  me := to_jsonb(public.ajf_me(p_token => p_token, p_device => p_device));
  if me is null or coalesce(me->>'emp','') = '' or me->>'s' = 'out' then return jsonb_build_object('s','out'); end if;
  if not public.ajf_bc__can(me) then return jsonb_build_object('s','denied'); end if;
  if p_id is null then
    insert into public.ajf_bc(emp,name,kind) values (me->>'emp', me->>'name', 'voice') returning id into nid;
    return jsonb_build_object('s','ok','id',nid);
  end if;
  update public.ajf_bc set secs = greatest(0, least(coalesce(p_secs,0), 600)) where id = p_id and emp = me->>'emp' and kind = 'voice';
  return jsonb_build_object('s','ok','id',p_id);
end $$;

-- تم الاطلاع
create or replace function public.ajf_bc_seen(p_token text, p_device text, p_ids bigint[])
returns jsonb language plpgsql security definer set search_path = public as $$
declare me jsonb;
begin
  me := to_jsonb(public.ajf_me(p_token => p_token, p_device => p_device));
  if me is null or coalesce(me->>'emp','') = '' or me->>'s' = 'out' then return jsonb_build_object('s','out'); end if;
  insert into public.ajf_bc_read(id,emp) select b.id, me->>'emp' from public.ajf_bc b where b.id = any(coalesce(p_ids,'{}')) and b.emp <> me->>'emp'
    on conflict do nothing;
  return jsonb_build_object('s','ok');
end $$;

-- للمرسل والمشرف: مين قرأ ومين ما قرأ تنبيه معيّن
create or replace function public.ajf_bc_reads(p_token text, p_device text, p_id bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me jsonb; snd text;
begin
  me := to_jsonb(public.ajf_me(p_token => p_token, p_device => p_device));
  if me is null or coalesce(me->>'emp','') = '' or me->>'s' = 'out' then return jsonb_build_object('s','out'); end if;
  if not public.ajf_bc__can(me) then return jsonb_build_object('s','denied'); end if;
  select emp into snd from public.ajf_bc where id = p_id;
  return jsonb_build_object('s','ok',
    'read', coalesce((select jsonb_agg(jsonb_build_object('emp',e.emp,'name',e.name,'at',r.at) order by r.at)
       from public.ajf_bc_read r join public.employees e on e.emp = r.emp where r.id = p_id), '[]'::jsonb),
    'unread', coalesce((select jsonb_agg(jsonb_build_object('emp',e.emp,'name',e.name) order by e.name)
       from public.employees e where e.active and e.pass_hash is not null and e.emp <> coalesce(snd,'')
         and not exists (select 1 from public.ajf_bc_read r where r.id = p_id and r.emp = e.emp)), '[]'::jsonb));
end $$;

-- للخادم فقط (وسيط ADS-B): التنبيهات المكتوبة الجديدة لإرسالها على شاشة القفل
create or replace function public.ajf_bc_due()
returns table(id bigint, name text, body text, urgent boolean)
language sql security definer set search_path = public as $$
  select b.id, b.name, b.body, b.urgent from public.ajf_bc b
  where b.kind = 'text' and b.at > now() - interval '20 minutes' order by b.id;
$$;

revoke all on function public.ajf_bc__can(jsonb), public.ajf_bc__room(), public.ajf_bc_get(text,text), public.ajf_bc_send(text,text,text,boolean),
  public.ajf_bc_talk(text,text,bigint,int), public.ajf_bc_seen(text,text,bigint[]), public.ajf_bc_reads(text,text,bigint), public.ajf_bc_due() from public, anon, authenticated;
grant execute on function public.ajf_bc_get(text,text), public.ajf_bc_send(text,text,text,boolean), public.ajf_bc_talk(text,text,bigint,int),
  public.ajf_bc_seen(text,text,bigint[]), public.ajf_bc_reads(text,text,bigint) to anon, authenticated;
grant execute on function public.ajf_bc_due() to service_role;
