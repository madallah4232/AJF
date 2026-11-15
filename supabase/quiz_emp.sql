-- تحدي التشغيل: المشرف يدخل على أي موظف ويشوف أسئلته وإجاباته (الصح والغلط)
-- شغّل هذا الملف مرة واحدة في Supabase: SQL Editor ← New query ← الصق ← Run
-- ما يمسح أي شي موجود. الموظف العادي ما يقدر يشوف إجابات غيره.

-- لوحة المراكز: نفسها، بس المشرف يوصله الرقم الوظيفي لكل صف عشان يفتح تفاصيله
create or replace function public.ajf_qz_board(p_token text, p_device text, p_scope text default 'round')
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare e public.employees; r public.ajf_quiz_round; ri jsonb; dy int; res jsonb;
begin
  e := ajf__who(p_token, p_device);
  if e.emp is null then return jsonb_build_object('s','out'); end if;
  r := ajf__qz_cur(); ri := ajf__qz_rinfo(r); dy := coalesce((ri->>'day')::int, (r.days));
  select coalesce(jsonb_agg(x order by x.rk), '[]'::jsonb) into res from (
    select row_number() over (order by count(*) filter (where a.ok) desc, sum(a.ms) asc, min(a.shown)) as rk,
      m.name, (a.emp = e.emp) as me, case when e.is_admin then a.emp end as emp,
      count(*) filter (where a.ok) as ok, count(*) as n, sum(a.ms) as ms
    from ajf_quiz_a a join employees m on m.emp = a.emp
    where a.ans is not null and not m.is_admin
      and (p_scope = 'all' or (r.id is not null and a.rid = r.id and (p_scope <> 'day' or a.day = dy)))
    group by a.emp, m.name) x;
  return jsonb_build_object('s','ok', 'rows', res, 'round', ri);
end $$;

-- تفاصيل موظف (للمشرف فقط): كل سؤال طلع له، الخيارات بنفس الترتيب اللي شافه، وش اختار، والصحيح
create or replace function public.ajf_qz_emp(p_token text, p_device text, p_emp text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare e public.employees; m public.employees; res jsonb;
begin
  e := ajf__who(p_token, p_device);
  if e.emp is null then return jsonb_build_object('s','out'); end if;
  if not e.is_admin then return jsonb_build_object('s','denied'); end if;
  select * into m from employees where emp = p_emp;
  if m.emp is null then return jsonb_build_object('s','bad'); end if;
  select coalesce(jsonb_agg(x order by x.rid desc, x.day desc, x.n), '[]'::jsonb) into res from (
    select a.rid, (select count(*) from ajf_quiz_round z where z.id <= a.rid) as rno, a.day, a.n, a.shown, a.ans, a.ok, a.ms,
      q.q, q.d, q.why, q.src_title as src,
      (select jsonb_agg(q.o->p order by i) from unnest(a.perm) with ordinality t(p, i)) as o,
      array_position(a.perm, q.a) - 1 as right,
      case when a.pick is null then null else array_position(a.perm, a.pick) - 1 end as pick
    from ajf_quiz_a a join ajf_quiz_q q on q.id = a.qid
    where a.emp = p_emp
    order by a.id desc limit 300) x;
  return jsonb_build_object('s','ok', 'name', m.name, 'title', m.title, 'emp', m.emp, 'rows', res);
end $$;

revoke all on function public.ajf_qz_board(text,text,text), public.ajf_qz_emp(text,text,text) from public;
grant execute on function public.ajf_qz_board(text,text,text), public.ajf_qz_emp(text,text,text) to anon, authenticated;
