-- 👥 قائمة موظفي SGS الجوف: الاسم والمسمى الوظيفي محفوظين بالرقم الوظيفي (رقم الراتب)
-- شغّل هذا الملف مرة واحدة في Supabase: SQL Editor ← New query ← الصق ← Run
-- آمن: ما يحذف أي موظف، ما يلمس الرقم السري ولا الجوالات ولا الجلسات ولا الصلاحيات.
--   • الموظف المسجّل من قبل: يتحدّث اسمه ويُضاف مسماه الوظيفي فقط، ويبقى داخل بدون تسجيل جديد.
--   • الموظف الجديد: رقمه ينحفظ جاهز، يدخل رقمه ← يطلع له اسمه ومسماه ← ينشئ رقمه السري ← يوصلك طلب الموافقة كالمعتاد.
--   • الموظف الموقوف يبقى موقوف (ما نغيّر حالته).

alter table public.employees add column if not exists title text;

insert into public.employees(emp,name,title) values
  ('11023088','Naif Alrowaily','Assistant, Station Executive Supervisor'),
  ('15002039','Ahmad A. Aleyadah','Station Duty Manager'),
  ('15024232','Madallah G. Alrewely','Operations Supervisor (A)'),
  ('15025749','Fahad A. Alrwily','Operations Supervisor (A)'),
  ('15026196','Wafi S. Alanazi','Operations Supervisor (A)'),
  ('15025748','Ghasan Y. Khan','Operations Supervisor'),
  ('15016456','Zyad H. Alsalm','Ramp Supervisor (A)'),
  ('15002047','Thamer K. Alshmari','Baggage Services Supervisor (A)'),
  ('15030648','Yazeed H. Alrwuaili','Turnaround Coordinator (A)'),
  ('15027211','Fahhad J. Alshammary','Turnaround Coordinator (A)'),
  ('15026197','Rayan A. Alrais','Turnaround Coordinator (LS) (A)'),
  ('15011528','Fahad H. Almoisheer','Turnaround Coordinator (LS) (A)'),
  ('15036823','Hamzah Alnoor','Turnaround Coordinator (LS) (A)'),
  ('15002038','Maged F. Alotibi','Load Control and Flight Information Center Agent'),
  ('15003399','Moshari Alrweli','Load Control and Flight Information Center Agent'),
  ('15025750','Abdulaelah M. Alsalem','Load Control and Flight Information Center Agent'),
  ('15002045','Abdullah A. Alsultan','Load Control and Flight Information Center Agent'),
  ('15030642','Manal M. Aljohani','Customer Service Agent'),
  ('15040841','Saud H Aljumaid','Customer Service Agent'),
  ('15040590','Ghada M Alenezi','Customer Service Agent'),
  ('15040594','Yusra M Alanazi','Customer Service Agent'),
  ('15043734','Haneen A Alsrhani','Customer Service Agent'),
  ('15043694','Maysam A Almugbil','Customer Service Agent'),
  ('15044459','Amnah Alrawilly','Customer Service Agent'),
  ('15044458','Bandar Aldera','Customer Service Agent'),
  ('15042997','Sama Alruwaili','Customer Service Agent'),
  ('15042999','Omnyah Alswilem','Customer Service Agent'),
  ('15025787','Ahmed M. Alqaid','Customer Service Agent'),
  ('15029820','Yazeed B. Alfaqir','Customer Service Agent'),
  ('15040831','Abrar A Alruwaili','Customer Service Agent'),
  ('15044457','Suad M. Alruwaili','Customer Service Agent'),
  ('15043732','Rana A Algader','Customer Service Agent'),
  ('15043731','Yazeed A. Alsharari','Customer Service Agent'),
  ('15043730','Abdullrahman A Faleh','Customer Service Agent'),
  ('15002532','Waleed Alabdullah','Customer Service Agent'),
  ('15040830','Ahmad A. Alsabilah','Customer Service Agent'),
  ('15029445','Abdullah K. Alsultan','Customer Service Agent'),
  ('15029450','Muath F. Alonazi','Customer Service Agent'),
  ('15043733','Aminah A Alruwaili','Customer Service Agent'),
  ('15036821','Amal Abdulhadi','Admin Operations')
on conflict (emp) do update set name=excluded.name, title=excluded.title;

-- خطوة الرقم الوظيفي: تقبل الرقم وترجع الاسم والمسمى (بدون أي بيانات ثانية)
drop function if exists public.ajf_check(text);
create function public.ajf_check(p_emp text)
returns json language plpgsql security definer set search_path to 'public' as $$
declare e public.employees;
begin
  select * into e from public.employees where emp=upper(trim(coalesce(p_emp,'')));
  if not found or not e.active then return json_build_object('s','no'); end if;
  return json_build_object('s',case when e.pass_hash is null then 'new' else 'existing' end,'name',e.name,'title',e.title);
end $$;
grant execute on function public.ajf_check(text) to anon, authenticated;

-- نفس دوال login_once.sql مع إضافة المسمى الوظيفي فقط
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
  return json_build_object('s','ok','emp',e.emp,'name',e.name,'title',e.title,'admin',e.is_admin,
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

