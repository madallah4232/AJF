-- H: السجل يظهر لمدالله فقط (15024232) — حتى المشرفين ما يشوفونه
-- شغّل هذا الملف مرة واحدة في Supabase: SQL Editor ← New query ← الصق ← Run

-- لمدالله فقط (15024232) — حتى المشرفين ما يشوفونه: آخر الحركات (الكل أو موظف واحد)، 250 حركة في كل صفحة
create or replace function public.ajf_act_list(p_token text, p_device text, p_emp text default null, p_before timestamptz default null, p_self boolean default true)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare e public.employees; res jsonb;
begin
  e := ajf__who(p_token, p_device);
  if e.emp is null then return jsonb_build_object('s','out'); end if;
  if e.emp <> '15024232' then return jsonb_build_object('s','denied'); end if;
  select coalesce(jsonb_agg(x order by x.at desc, x.id desc), '[]'::jsonb) into res from (
    select a.id, a.at, a.emp, m.name, m.title, a.ev, a.d
    from ajf_act a left join employees m on m.emp = a.emp
    where (p_emp is null or a.emp = p_emp)
      and (p_self or p_emp is not null or a.emp <> e.emp)
      and (p_before is null or a.at < p_before)
    order by a.at desc, a.id desc limit 250) x;
  return jsonb_build_object('s','ok','rows',res);
end $$;

revoke all on function public.ajf_act_list(text,text,text,timestamptz,boolean) from public;
grant execute on function public.ajf_act_list(text,text,text,timestamptz,boolean) to anon, authenticated;
