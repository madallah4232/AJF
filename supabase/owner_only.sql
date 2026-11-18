-- 2026-11-18: إضافة الموظفين وصلاحية المشرف للمالك فقط
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
  -- الإضافة وإعطاء/سحب الإشراف لمدالله (15024232) فقط، وما أحد يقدر يعدّل حسابه غيره
  if p_action in ('add','set_admin') and e.emp<>'15024232' then return json_build_object('s','forbidden'); end if;
  if v_emp='15024232' and e.emp<>'15024232' and p_action in ('active','reset_pass','unlock','delete','set_admin') then return json_build_object('s','forbidden'); end if;
  if p_action='device' and e.emp<>'15024232' and exists(select 1 from devices where id=(p_arg->>'id')::bigint and emp='15024232') then return json_build_object('s','forbidden'); end if;
  if p_action='list' then
    return json_build_object('s','ok','me',e.emp,'emps',coalesce((select json_agg(json_build_object(
      'emp',x.emp,'name',x.name,'title',x.title,'admin',x.is_admin,'active',x.active,'activated',x.pass_hash is not null,
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
    insert into employees(emp,name,title) values(v_emp,left(trim(coalesce(p_arg->>'name','')),80),nullif(left(trim(coalesce(p_arg->>'title','')),80),''))
      on conflict(emp) do update set name=excluded.name,title=coalesce(excluded.title,employees.title),active=true;
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
