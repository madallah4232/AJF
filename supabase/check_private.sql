-- 2026-11-25: شاشة الدخول ما عاد تكشف اسم صاحب الرقم الوظيفي ولا مسماه لأي أحد من برا.
-- الاسم والمسمى يظهرون بعد ما يدخل الموظف رقمه السري الصحيح (من ajf_login و ajf_me).
-- آمن ويتكرر تشغيله: الدالة الأصلية تنحفظ باسم ajf_check_full وتنقفل، وajf_check صارت غلاف يحذف الاسم والمسمى.
do $$ begin
  if to_regprocedure('public.ajf_check_full(text)') is null then
    alter function public.ajf_check(text) rename to ajf_check_full;
  end if;
end $$;
revoke all on function public.ajf_check_full(text) from public, anon, authenticated;

create or replace function public.ajf_check(p_emp text)
returns json language plpgsql security definer set search_path = public as $$
begin
  return ((public.ajf_check_full(p_emp))::jsonb - 'name' - 'title')::json;
end $$;
revoke all on function public.ajf_check(text) from public;
grant execute on function public.ajf_check(text) to anon, authenticated;
