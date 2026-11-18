-- شريط التعاميم في الرئيسية: يرجّع فقط التعاميم اللي اختارها المشرف للشريط (الخاصة بمطار الجوف)
-- العنوان + الملخص العربي فقط — قراءة فقط، للموظفين المسجّلين
create or replace function public.ajf_circ_tick(p_token text, p_device text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me jsonb; res jsonb; ids jsonb;
begin
  me := public.ajf_circ_me(p_token, p_device);
  if me is null then return jsonb_build_object('s','out'); end if;
  select coalesce(v->'ids','[]'::jsonb) into ids from public.ajf_cfg where k = 'tick';
  ids := coalesce(ids,'[]'::jsonb);
  select coalesce(jsonb_agg(r order by r.o), '[]'::jsonb) into res from (
    select c.title, c.ai, x.o from jsonb_array_elements_text(ids) with ordinality x(id,o)
    join public.ajf_circ c on c.id = x.id
  ) r;
  return jsonb_build_object('s','ok','rows',res);
end $$;
revoke all on function public.ajf_circ_tick(text,text) from public;
grant execute on function public.ajf_circ_tick(text,text) to anon, authenticated;
