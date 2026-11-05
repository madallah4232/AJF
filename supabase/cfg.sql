-- إعدادات محمية (مثل إيميلات برقيات MVT): يقرأها الموظف المسجّل فقط، ويعدّلها المشرف فقط
-- شغّل هذا الملف مرة واحدة في Supabase: SQL Editor ← New query ← الصق ← Run

create table if not exists public.ajf_cfg (
  k   text primary key,
  v   jsonb not null,
  by  text,
  at  timestamptz not null default now()
);
alter table public.ajf_cfg enable row level security;
revoke all on public.ajf_cfg from public, anon, authenticated;

create or replace function public.ajf_cfg_get(p_token text, p_device text, p_k text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me jsonb;
begin
  me := to_jsonb(public.ajf_me(p_token => p_token, p_device => p_device));
  if me is null or coalesce(me->>'emp','') = '' or me->>'s' = 'out' then return jsonb_build_object('s','out'); end if;
  return jsonb_build_object('s','ok','v',(select v from public.ajf_cfg where k = p_k));
end $$;

create or replace function public.ajf_cfg_set(p_token text, p_device text, p_k text, p_v jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me jsonb;
begin
  me := to_jsonb(public.ajf_me(p_token => p_token, p_device => p_device));
  if me is null or coalesce(me->>'emp','') = '' or me->>'s' = 'out' then return jsonb_build_object('s','out'); end if;
  if not coalesce((me->>'admin')::boolean, false) then return jsonb_build_object('s','denied'); end if;
  if p_k is null or p_k !~ '^[a-z0-9_]{1,40}$' or length(p_v::text) > 8000 then return jsonb_build_object('s','bad'); end if;
  insert into public.ajf_cfg(k,v,by) values (p_k,p_v,me->>'emp')
  on conflict (k) do update set v=excluded.v, by=excluded.by, at=now();
  return jsonb_build_object('s','ok');
end $$;

revoke all on function public.ajf_cfg_get(text,text,text), public.ajf_cfg_set(text,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.ajf_cfg_get(text,text,text), public.ajf_cfg_set(text,text,text,jsonb) to anon, authenticated;
