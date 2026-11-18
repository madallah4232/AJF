-- شريط التعاميم في الرئيسية: آخر 8 تعاميم (العنوان + الملخص العربي فقط) — قراءة فقط، للموظفين المسجّلين
create or replace function public.ajf_circ_tick(p_token text, p_device text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me jsonb; res jsonb;
begin
  me := public.ajf_circ_me(p_token, p_device);
  if me is null then return jsonb_build_object('s','out'); end if;
  select coalesce(jsonb_agg(r), '[]'::jsonb) into res from (
    select title, ai, at from public.ajf_circ order by at desc limit 8
  ) r;
  return jsonb_build_object('s','ok','rows',res);
end $$;
revoke all on function public.ajf_circ_tick(text,text) from public;
grant execute on function public.ajf_circ_tick(text,text) to anon, authenticated;
