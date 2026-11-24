-- دخول الموظفين: موافقة المشرف مرة وحدة للموظف، وبعدها يدخل بالرقم السري من أي جوال بدون طلب موافقة
-- شغّل هذا الملف مرة واحدة في Supabase: SQL Editor ← New query ← الصق ← Run
-- ما يمسح أي حساب ولا رقم سري. الموظف اللي ما وافقت عليه أبداً يبقى ممنوع حتى توافق.

alter table public.devices add column if not exists auto boolean not null default false;

CREATE OR REPLACE FUNCTION public.ajf_login(p_emp text, p_pass text, p_device text, p_label text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare e public.employees; d public.devices; tok text; v_emp text:=upper(trim(coalesce(p_emp,''))); newacct boolean:=false;
begin
  if coalesce(length(p_device),0) not between 16 and 80 then return json_build_object('s','bad'); end if;
  select * into e from employees where emp=v_emp for update;
  if not found or not e.active then return json_build_object('s','bad'); end if;
  if e.locked_until is not null and e.locked_until>now() then return json_build_object('s','locked','min',ceil(extract(epoch from e.locked_until-now())/60)); end if;
  if e.pass_hash is null then
    if coalesce(length(p_pass),0)<6 then return json_build_object('s','weak'); end if;
    update employees set pass_hash=crypt(p_pass,gen_salt('bf',10)),activated_at=now(),fails=0 where emp=v_emp;
    newacct:=true;
  elsif crypt(coalesce(p_pass,''),e.pass_hash)<>e.pass_hash then
    update employees set fails=case when fails+1>=5 then 0 else fails+1 end,
      locked_until=case when fails+1>=5 then now()+interval '15 minutes' else locked_until end where emp=v_emp;
    return json_build_object('s','bad');
  else
    update employees set fails=0 where emp=v_emp;
  end if;
  insert into devices(emp,device,label,first_login) values(v_emp,p_device,left(coalesce(p_label,''),200),newacct) on conflict(emp,device) do nothing;
  select * into d from devices where emp=v_emp and device=p_device;
  -- أول جهاز للمشرف يُعتمد تلقائياً (تهيئة النظام)
  if d.status='pending' and e.is_admin and not exists(select 1 from devices where emp=v_emp and status='approved') then
    update devices set status='approved',decided_at=now() where id=d.id; d.status:='approved';
  end if;
  -- موظف سبق اعتماده: أي جوال جديد يدخل بالرقم السري الصحيح يُعتمد تلقائياً بدون موافقة جديدة
  if d.status='pending' and exists(select 1 from devices where emp=v_emp and status='approved' and id<>d.id) then
    update devices set status='approved',decided_at=now(),auto=true where id=d.id; d.status:='approved';
    -- جوال واحد شغّال للموظف: الجوال القديم يطلع تلقائياً (المشرف مستثنى)
    if not e.is_admin then
      delete from sessions where emp=v_emp and device<>p_device;
      delete from devices where emp=v_emp and status='approved' and id<>d.id;
    end if;
  end if;
  if d.status='rejected' then return json_build_object('s','rejected'); end if;
  if d.status<>'approved' then return json_build_object('s','pending','new',newacct); end if;
  tok:=encode(gen_random_bytes(32),'hex');
  insert into sessions(token_hash,emp,device,expires_at) values(ajf__h(tok),v_emp,p_device,now()+interval '365 days');
  update devices set last_seen=now() where id=d.id;
  delete from sessions where expires_at<now();
  return json_build_object('s','ok','token',tok,'name',e.name,'admin',e.is_admin);
end $function$;

CREATE OR REPLACE FUNCTION public.ajf_me(p_token text, p_device text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare e public.employees;
begin
  e:=ajf__who(p_token,p_device);
  if e.emp is null then return json_build_object('s','out'); end if;
  update devices set last_seen=now() where emp=e.emp and device=p_device;
  -- الجلسة تتجدد كل ما فتح التطبيق، فيبقى متصل
  update sessions set expires_at=now()+interval '365 days' where token_hash=ajf__h(coalesce(p_token,'')) and expires_at<now()+interval '300 days';
  return json_build_object('s','ok','emp',e.emp,'name',e.name,'admin',e.is_admin,
    'pending',case when e.is_admin then (select count(*) from devices where status='pending') else 0 end);
end $function$;

CREATE OR REPLACE FUNCTION public.ajf_admin(p_token text, p_device text, p_action text, p_arg json)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare e public.employees; v_emp text; n int;
begin
  e:=ajf__who(p_token,p_device);
  if e.emp is null then return json_build_object('s','out'); end if;
  if not e.is_admin then return json_build_object('s','forbidden'); end if;
  v_emp:=upper(trim(coalesce(p_arg->>'emp','')));
  if p_action='list' then
    return json_build_object('s','ok','me',e.emp,'emps',coalesce((select json_agg(json_build_object(
      'emp',x.emp,'name',x.name,'admin',x.is_admin,'active',x.active,'activated',x.pass_hash is not null,
      'locked',x.locked_until>now(),
      'devices',coalesce((select json_agg(json_build_object('id',d.id,'label',d.label,'status',d.status,'first',d.first_login,
         'created',d.created_at,'seen',d.last_seen,'auto',d.auto,'decided',d.decided_at) order by d.created_at desc) from devices d where d.emp=x.emp),'[]'::json))
      order by x.name,x.emp) from employees x),'[]'::json));
  elsif p_action='device' then
    if p_arg->>'status'='delete' then
      delete from sessions s using devices d where d.id=(p_arg->>'id')::bigint and s.emp=d.emp and s.device=d.device;
      delete from devices where id=(p_arg->>'id')::bigint;
    elsif p_arg->>'status' in ('approved','rejected') then
      update devices set status=p_arg->>'status',decided_at=now() where id=(p_arg->>'id')::bigint;
      if p_arg->>'status'='rejected' then
        delete from sessions s using devices d where d.id=(p_arg->>'id')::bigint and s.emp=d.emp and s.device=d.device;
      end if;
    else return json_build_object('s','bad'); end if;
  elsif p_action='add' then
    if v_emp !~ '^[0-9A-Z]{2,20}$' then return json_build_object('s','bad'); end if;
    insert into employees(emp,name) values(v_emp,left(trim(coalesce(p_arg->>'name','')),80))
      on conflict(emp) do update set name=excluded.name,active=true;
  elsif p_action='active' then
    if v_emp=e.emp then return json_build_object('s','self'); end if;
    update employees set active=(p_arg->>'active')::boolean where emp=v_emp;
    if not (p_arg->>'active')::boolean then delete from sessions where emp=v_emp; end if;
  elsif p_action='reset_pass' then
    update employees set pass_hash=null,activated_at=null,fails=0,locked_until=null where emp=v_emp;
    delete from sessions where emp=v_emp;
  elsif p_action='unlock' then
    update employees set fails=0,locked_until=null where emp=v_emp;
  elsif p_action='set_admin' then
    if v_emp=e.emp then return json_build_object('s','self'); end if;
    update employees set is_admin=(p_arg->>'admin')::boolean where emp=v_emp;
  elsif p_action='delete' then
    if v_emp=e.emp then return json_build_object('s','self'); end if;
    delete from employees where emp=v_emp;
  else return json_build_object('s','bad'); end if;
  return json_build_object('s','ok');
end $function$;

-- حذف دالة القراءة المؤقتة
drop function if exists public.ajf_tmp_read(text);
