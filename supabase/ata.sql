-- وقت الهبوط المشترك: أي موظف مسجّل يعتمده فيظهر عند الكل ويرسل تنبيه «هبطت»
-- شغّل هذا الملف مرة واحدة في Supabase: SQL Editor ← New query ← الصق ← Run

create table if not exists public.ajf_ata (
  day    date not null,
  flight text not null,
  t      text not null,
  emp    text not null,
  name   text,
  at     timestamptz not null default now(),
  primary key (day, flight)
);
alter table public.ajf_ata enable row level security;
revoke all on public.ajf_ata from public, anon, authenticated;

-- اعتماد أو مسح وقت الهبوط (p_t فاضي = مسح ورجوع للوقت التلقائي)
create or replace function public.ajf_ata_set(p_token text, p_device text, p_day date, p_flight text, p_t text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me jsonb; today date := (now() at time zone 'Asia/Riyadh')::date;
begin
  me := to_jsonb(public.ajf_me(p_token => p_token, p_device => p_device));
  if me is null or coalesce(me->>'emp','') = '' or me->>'s' = 'out' then return jsonb_build_object('s','out'); end if;
  if p_flight is null or p_flight !~ '^[A-Z0-9]{2,8}$' or p_day is null or p_day < today - 1 or p_day > today then
    return jsonb_build_object('s','bad');
  end if;
  if coalesce(p_t,'') = '' then
    delete from public.ajf_ata where day = p_day and flight = p_flight;
    return jsonb_build_object('s','ok');
  end if;
  if p_t !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then return jsonb_build_object('s','bad'); end if;
  insert into public.ajf_ata(day,flight,t,emp,name) values (p_day,p_flight,p_t,me->>'emp',me->>'name')
  on conflict (day,flight) do update set t=excluded.t, emp=excluded.emp, name=excluded.name, at=now();
  delete from public.ajf_ata where day < today - 7;
  return jsonb_build_object('s','ok');
end $$;

-- قراءة أوقات اليوم (للموظف المسجّل فقط)
create or replace function public.ajf_ata_get(p_token text, p_device text, p_day date)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me jsonb;
begin
  me := to_jsonb(public.ajf_me(p_token => p_token, p_device => p_device));
  if me is null or coalesce(me->>'emp','') = '' or me->>'s' = 'out' then return jsonb_build_object('s','out'); end if;
  return jsonb_build_object('s','ok','rows',coalesce((select jsonb_agg(jsonb_build_object('flight',flight,'t',t,'name',name,'emp',emp)) from public.ajf_ata where day = p_day),'[]'::jsonb));
end $$;

-- للخادم فقط (تنبيه «هبطت»)
create or replace function public.ajf_ata_day(p_day date)
returns jsonb language sql security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(flight, t), '{}'::jsonb) from public.ajf_ata where day = p_day;
$$;

revoke all on function public.ajf_ata_set(text,text,date,text,text), public.ajf_ata_get(text,text,date), public.ajf_ata_day(date) from public, anon, authenticated;
grant execute on function public.ajf_ata_set(text,text,date,text,text), public.ajf_ata_get(text,text,date) to anon, authenticated;
grant execute on function public.ajf_ata_day(date) to service_role;
