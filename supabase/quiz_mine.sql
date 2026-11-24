-- 📚 أسئلتي: كل موظف يشوف أسئلة التحدي اليومي اللي جاوبها، مع جوابه والجواب الصحيح والشرح والمرجع (الصفحة)
-- شغّل هذا الملف مرة واحدة في Supabase: SQL Editor ← New query ← الصق ← Run. ما يمسح أي شي.
-- يطلع بس الأسئلة اللي انقفلت (جاوبها أو خلص وقتها)، فما ينكشف سؤال مفتوح.

-- 📖 شرح الكلمات الإنجليزية بالعربي لكل سؤال: [{"t":"CUTE","ar":"..."}] (يعبّيها Gemini)
alter table public.ajf_quiz_q add column if not exists gl jsonb;

-- نتيجة السؤال بعد الجواب في التحدي اليومي: نضيف شرح الكلمات الإنجليزية
create or replace function public.ajf__qz_res(p_id bigint)
returns jsonb language sql security definer set search_path = public as $$
  select jsonb_build_object('s','ok', 'ok', a.ok, 'why', a.why, 'ms', a.ms, 'n', a.n,
    'right', array_position(a.perm, q.a) - 1, 'pick', case when a.pick is null then null else array_position(a.perm, a.pick) - 1 end,
    'exp', q.why, 'src', q.src_title, 'page', q.page, 'gl', q.gl)
  from ajf_quiz_a a join ajf_quiz_q q on q.id = a.qid where a.id = p_id
$$;

create or replace function public.ajf_qz_mine(p_token text, p_device text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare e public.employees; res jsonb;
begin
  e := ajf__who(p_token, p_device);
  if e.emp is null then return jsonb_build_object('s','out'); end if;
  select coalesce(jsonb_agg(x order by x.rid desc, x.day desc, x.n), '[]'::jsonb) into res from (
    select a.rid, (select count(*) from ajf_quiz_round z where z.id <= a.rid) as rno, a.day, a.n, a.shown, a.ans, a.ok, a.ms,
      q.q, q.d, q.why, q.src_title as src, q.page, q.gl,
      (select jsonb_agg(q.o->p order by i) from unnest(a.perm) with ordinality t(p, i)) as o,
      array_position(a.perm, q.a) - 1 as right,
      case when a.pick is null then null else array_position(a.perm, a.pick) - 1 end as pick
    from ajf_quiz_a a join ajf_quiz_q q on q.id = a.qid
    where a.emp = e.emp and a.ans is not null
    order by a.id desc limit 300) x;
  return jsonb_build_object('s','ok', 'name', e.name, 'title', e.title, 'emp', e.emp, 'mine', true, 'rows', res);
end $$;

-- صفحة المشرف لأسئلة موظف: نضيف رقم الصفحة للمرجع
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
      q.q, q.d, q.why, q.src_title as src, q.page, q.gl,
      (select jsonb_agg(q.o->p order by i) from unnest(a.perm) with ordinality t(p, i)) as o,
      array_position(a.perm, q.a) - 1 as right,
      case when a.pick is null then null else array_position(a.perm, a.pick) - 1 end as pick
    from ajf_quiz_a a join ajf_quiz_q q on q.id = a.qid
    where a.emp = p_emp
    order by a.id desc limit 300) x;
  return jsonb_build_object('s','ok', 'name', m.name, 'title', m.title, 'emp', m.emp, 'rows', res);
end $$;

revoke all on function public.ajf_qz_mine(text,text), public.ajf_qz_emp(text,text,text) from public;
grant execute on function public.ajf_qz_mine(text,text), public.ajf_qz_emp(text,text,text) to anon, authenticated;
