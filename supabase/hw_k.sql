-- مفتاح خط Madallah (hw_k): الخادم ما يعطيه إلا لمدالله (15024232)
-- شغّل هذا الملف مرة واحدة في Supabase: SQL Editor ← New query ← الصق ← Run
create or replace function public.ajf_cfg_get(p_token text, p_device text, p_k text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me jsonb;
begin
  me := to_jsonb(public.ajf_me(p_token => p_token, p_device => p_device));
  if me is null or coalesce(me->>'emp','') = '' or me->>'s' = 'out' then return jsonb_build_object('s','out'); end if;
  if p_k = 'hw_k' and me->>'emp' <> '15024232' then return jsonb_build_object('s','denied'); end if;
  return jsonb_build_object('s','ok','v',(select v from public.ajf_cfg where k = p_k));
end $$;
revoke all on function public.ajf_cfg_get(text,text,text) from public, anon, authenticated;
grant execute on function public.ajf_cfg_get(text,text,text) to anon, authenticated;
