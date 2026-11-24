-- تنبيه المشرف بطلبات الدخول الجديدة (Web Push)
-- شغّل هذا الملف مرة واحدة في Supabase: SQL Editor ← New query ← الصق ← Run
-- يعتمد على ajf_me (نفس دالة الدخول) وجدول ajf_push الموجودين، وما يغيّر أي بيانات.

-- للخادم فقط: أجهزة المشرفين المشتركة في التنبيهات + عدد الطلبات المعلّقة
create or replace function public.ajf_admin_alerts()
returns table(endpoint text, p256dh text, auth text, pending int)
language plpgsql security definer set search_path = public as $$
declare r record; me jsonb;
begin
  for r in select * from public.ajf_push loop
    begin
      me := to_jsonb(public.ajf_me(p_token => r.token, p_device => r.device));
    exception when others then continue;
    end;
    if me is null or me->>'s' = 'out' then continue; end if;
    if coalesce((me->>'admin')::boolean, false) and coalesce((me->>'pending')::int, 0) > 0 then
      endpoint := r.endpoint; p256dh := r.p256dh; auth := r.auth; pending := (me->>'pending')::int;
      return next;
    end if;
  end loop;
end $$;

revoke all on function public.ajf_admin_alerts() from public, anon, authenticated;
grant execute on function public.ajf_admin_alerts() to service_role;
