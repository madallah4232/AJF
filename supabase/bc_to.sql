-- 📢 التنبيه المكتوب لموظفين محددين (اختيار المستلم بالاسم) — يكمّل bcast.sql
-- شغّل هذا الملف مرة واحدة في Supabase: SQL Editor ← New query ← الصق ← Run
-- ما يغيّر أي بيانات قديمة: التنبيهات القديمة تبقى "لكل الموظفين".

alter table public.ajf_bc add column if not exists to_emps text[];  -- فاضي = لكل الموظفين

-- قائمة الموظفين (للي يقدر يرسل فقط) عشان يختار المستلم بالاسم
create or replace function public.ajf_bc_emps(p_token text, p_device text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me jsonb;
begin
  me := to_jsonb(public.ajf_me(p_token => p_token, p_device => p_device));
  if me is null or coalesce(me->>'emp','') = '' or me->>'s' = 'out' then return jsonb_build_object('s','out'); end if;
  if not public.ajf_bc__can(me) then return jsonb_build_object('s','denied'); end if;
  return jsonb_build_object('s','ok','emps', coalesce((select jsonb_agg(jsonb_build_object('emp',e.emp,'name',e.name) order by e.name)
    from public.employees e where e.active and e.pass_hash is not null and e.emp <> me->>'emp'), '[]'::jsonb));
end $$;

-- إرسال تنبيه مكتوب لكل الموظفين (p_to فاضي) أو لموظفين محددين
create or replace function public.ajf_bc_send(p_token text, p_device text, p_body text, p_urgent boolean, p_to text[])
returns jsonb language plpgsql security definer set search_path = public as $$
declare me jsonb; nid bigint; t text := btrim(coalesce(p_body,'')); tos text[];
begin
  me := to_jsonb(public.ajf_me(p_token => p_token, p_device => p_device));
  if me is null or coalesce(me->>'emp','') = '' or me->>'s' = 'out' then return jsonb_build_object('s','out'); end if;
  if not public.ajf_bc__can(me) then return jsonb_build_object('s','denied'); end if;
  if length(t) = 0 or length(t) > 600 then return jsonb_build_object('s','bad'); end if;
  if p_to is not null then
    select array_agg(distinct e.emp) into tos from public.employees e where e.emp = any(p_to) and e.active;
    if tos is null then return jsonb_build_object('s','bad'); end if;
  end if;
  insert into public.ajf_bc(emp,name,kind,body,urgent,to_emps) values (me->>'emp', me->>'name', 'text', t, coalesce(p_urgent,false), tos) returning id into nid;
  delete from public.ajf_bc where at < now() - interval '30 days';
  return jsonb_build_object('s','ok','id',nid);
end $$;

-- الموظف يشوف التنبيه إذا كان لكل الموظفين أو موجّه له؛ المرسلين (المشرف ومن عنده صلاحية) يشوفون الكل
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
        'to', case when can and b.to_emps is not null then (select jsonb_agg(coalesce(e.name,x)) from unnest(b.to_emps) x left join public.employees e on e.emp = x) end,
        'mine', b.to_emps is not null and me->>'emp' = any(b.to_emps),
        'read', b.emp = me->>'emp' or exists (select 1 from public.ajf_bc_read r where r.id = b.id and r.emp = me->>'emp'),
        'n', case when can then (select count(*) from public.ajf_bc_read r where r.id = b.id) end) order by b.id desc)
      from (select * from public.ajf_bc where at > now() - interval '48 hours'
              and (can or to_emps is null or emp = me->>'emp' or me->>'emp' = any(to_emps))
            order by id desc limit 60) b), '[]'::jsonb));
end $$;

-- مين قرأ ومين ما قرأ: للتنبيه الموجّه تطلع أسماء المستلمين فقط
create or replace function public.ajf_bc_reads(p_token text, p_device text, p_id bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me jsonb; snd text; tos text[];
begin
  me := to_jsonb(public.ajf_me(p_token => p_token, p_device => p_device));
  if me is null or coalesce(me->>'emp','') = '' or me->>'s' = 'out' then return jsonb_build_object('s','out'); end if;
  if not public.ajf_bc__can(me) then return jsonb_build_object('s','denied'); end if;
  select emp, to_emps into snd, tos from public.ajf_bc where id = p_id;
  return jsonb_build_object('s','ok',
    'read', coalesce((select jsonb_agg(jsonb_build_object('emp',e.emp,'name',e.name,'at',r.at) order by r.at)
       from public.ajf_bc_read r join public.employees e on e.emp = r.emp where r.id = p_id), '[]'::jsonb),
    'unread', coalesce((select jsonb_agg(jsonb_build_object('emp',e.emp,'name',e.name) order by e.name)
       from public.employees e where e.active and e.pass_hash is not null and e.emp <> coalesce(snd,'')
         and (tos is null or e.emp = any(tos))
         and not exists (select 1 from public.ajf_bc_read r where r.id = p_id and r.emp = e.emp)), '[]'::jsonb));
end $$;

-- الدالة القديمة (ترسل للكل) ما ترجع التنبيه الموجّه أبداً، احتياط لو اشتغل الوسيط القديم
create or replace function public.ajf_bc_due()
returns table(id bigint, name text, body text, urgent boolean)
language sql security definer set search_path = public as $$
  select b.id, b.name, b.body, b.urgent from public.ajf_bc b
  where b.kind = 'text' and b.to_emps is null and b.at > now() - interval '20 minutes' order by b.id;
$$;

-- للخادم فقط: التنبيهات الجديدة مع المستلمين، واشتراكات شاشة القفل مع رقم الموظف
create or replace function public.ajf_bc_due2()
returns table(id bigint, name text, body text, urgent boolean, to_emps text[])
language sql security definer set search_path = public as $$
  select b.id, b.name, b.body, b.urgent, b.to_emps from public.ajf_bc b
  where b.kind = 'text' and b.at > now() - interval '20 minutes' order by b.id;
$$;
create or replace function public.ajf_push_targets_emp()
returns table(endpoint text, p256dh text, auth text, emp text)
language plpgsql security definer set search_path = public as $$
declare r record; me jsonb;
begin
  for r in select * from public.ajf_push loop
    begin
      me := to_jsonb(public.ajf_me(p_token => r.token, p_device => r.device));
    exception when others then me := null;
    end;
    if me is not null and coalesce(me->>'emp','') <> '' and coalesce(me->>'s','') <> 'out' then
      endpoint := r.endpoint; p256dh := r.p256dh; auth := r.auth; emp := me->>'emp'; return next;
    else
      delete from public.ajf_push where ajf_push.endpoint = r.endpoint;
    end if;
  end loop;
end $$;

revoke all on function public.ajf_bc_emps(text,text), public.ajf_bc_send(text,text,text,boolean,text[]),
  public.ajf_bc_due2(), public.ajf_push_targets_emp() from public, anon, authenticated;
grant execute on function public.ajf_bc_emps(text,text), public.ajf_bc_send(text,text,text,boolean,text[]) to anon, authenticated;
grant execute on function public.ajf_bc_due2(), public.ajf_push_targets_emp() to service_role;
