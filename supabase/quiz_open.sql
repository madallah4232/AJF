-- اختبر معلوماتك (تحدي التشغيل سابقاً): بدون عدّاد وقت، والخروج من التطبيق ما ينحسب خطأ
-- السؤال المفتوح يرجع لنفس الموظف لين يجاوبه. 10 أسئلة كل يوم مثل قبل.
-- شغّل هذا الملف مرة واحدة في Supabase: SQL Editor ← New query ← الصق ← Run
-- ما يمسح أي شي موجود.

-- يقفل بس أسئلة الأيام/الجولات السابقة اللي ما انجاوبت، وسؤال اليوم المفتوح يبقى لين يجاوبه
create or replace function public.ajf__qz_close(p_emp text)
returns void language plpgsql security definer set search_path = public as $$
declare r public.ajf_quiz_round; ri jsonb; dy int;
begin
  r := ajf__qz_cur(); ri := ajf__qz_rinfo(r);
  dy := case when ri is not null and ri->>'ph' = 'on' then (ri->>'day')::int end;
  update ajf_quiz_a set ans = now(), ok = false, why = 'time', ms = 0
    where emp = p_emp and ans is null and (dy is null or rid <> r.id or day <> dy);
end $$;

create or replace function public.ajf_qz_next(p_token text, p_device text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare e public.employees; r public.ajf_quiz_round; ri jsonb; dy int; cnt int; tgt int; q public.ajf_quiz_q; pm int[]; aid bigint; tps text[]; op public.ajf_quiz_a;
begin
  e := ajf__who(p_token, p_device);
  if e.emp is null then return jsonb_build_object('s','out'); end if;
  perform pg_advisory_xact_lock(hashtext('ajf_qz_' || e.emp));
  r := ajf__qz_cur(); ri := ajf__qz_rinfo(r);
  if ri is null or ri->>'ph' <> 'on' then perform ajf__qz_close(e.emp); return jsonb_build_object('s','noround'); end if;
  dy := (ri->>'day')::int;
  -- أسئلة الأيام السابقة تنقفل، وسؤال اليوم المفتوح يرجع لصاحبه نفسه
  perform ajf__qz_close(e.emp);
  select y.* into op from ajf_quiz_a y where y.emp = e.emp and y.ans is null and y.rid = r.id and y.day = dy order by y.id desc limit 1;
  if found then
    select x.* into q from ajf_quiz_q x where x.id = op.qid;
    return jsonb_build_object('s','ok', 'id', op.id, 'n', op.n, 'of', r.per_day, 'secs', 0, 'd', q.d, 'q', q.q,
      'o', (select jsonb_agg(q.o->>(op.perm[i]) order by i) from generate_subscripts(op.perm, 1) i));
  end if;
  tps := ajf__qz_tps(e.title);
  select count(*) into cnt from ajf_quiz_a where rid = r.id and emp = e.emp and day = dy;
  if cnt >= r.per_day then return jsonb_build_object('s','done'); end if;
  tgt := case when cnt < ceil(r.per_day * 0.3) then 1 when cnt < r.per_day - ceil(r.per_day * 0.3) then 2 else 3 end;
  select x.* into q from ajf_quiz_q x
    where x.st = 'ok' and (x.tp is null or x.tp = any(tps)) and not exists (select 1 from ajf_quiz_a y where y.emp = e.emp and y.qid = x.id)
    order by (x.d <> tgt), abs(x.d - tgt), (select count(*) from ajf_quiz_a z where z.rid = r.id and z.qid = x.id), random() limit 1;
  if not found then
    -- البنك خلص لهذا الموظف: نعيد له سؤال قديم ما ظهر له في هذي الجولة
    select x.* into q from ajf_quiz_q x
      where x.st = 'ok' and (x.tp is null or x.tp = any(tps)) and not exists (select 1 from ajf_quiz_a y where y.emp = e.emp and y.qid = x.id and y.rid = r.id)
      order by (select max(y.shown) from ajf_quiz_a y where y.emp = e.emp and y.qid = x.id) nulls first, random() limit 1;
  end if;
  if not found then return jsonb_build_object('s','empty'); end if;
  pm := array(select g from generate_series(0, 3) g order by random());
  insert into ajf_quiz_a(rid, emp, day, n, qid, perm, secs) values (r.id, e.emp, dy, cnt + 1, q.id, pm, r.secs) returning id into aid;
  return jsonb_build_object('s','ok', 'id', aid, 'n', cnt + 1, 'of', r.per_day, 'secs', r.secs, 'd', q.d, 'q', q.q,
    'o', (select jsonb_agg(q.o->>(pm[i]) order by i) from generate_subscripts(pm, 1) i));
end $$;

-- الجواب: بدون حد للوقت
create or replace function public.ajf_qz_answer(p_token text, p_device text, p_id bigint, p_pick int)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare e public.employees; a public.ajf_quiz_a; qa int; el bigint; orig int;
begin
  e := ajf__who(p_token, p_device);
  if e.emp is null then return jsonb_build_object('s','out'); end if;
  select * into a from ajf_quiz_a where id = p_id and emp = e.emp for update;
  if not found then return jsonb_build_object('s','bad'); end if;
  if a.ans is null then
    if p_pick is null or p_pick < 0 or p_pick > 3 then return jsonb_build_object('s','bad'); end if;
    el := (extract(epoch from now() - a.shown) * 1000)::bigint;
    select x.a into qa from ajf_quiz_q x where x.id = a.qid;
    orig := a.perm[p_pick + 1];
    update ajf_quiz_a set ans = now(), pick = orig, ok = (orig = qa), why = 'ans', ms = least(el, 2000000000)::int where id = a.id;
  end if;
  return ajf__qz_res(a.id);
end $$;

-- الخروج من التطبيق ما عاد ينحسب خطأ (للنسخ القديمة من التطبيق)
create or replace function public.ajf_qz_leave(p_token text, p_device text, p_id bigint)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare e public.employees;
begin
  e := ajf__who(p_token, p_device);
  if e.emp is null then return jsonb_build_object('s','out'); end if;
  return jsonb_build_object('s','open');
end $$;

revoke all on function public.ajf__qz_close(text) from public, anon, authenticated;
revoke all on function public.ajf_qz_next(text,text), public.ajf_qz_answer(text,text,bigint,int), public.ajf_qz_leave(text,text,bigint) from public;
grant execute on function public.ajf_qz_next(text,text), public.ajf_qz_answer(text,text,bigint,int), public.ajf_qz_leave(text,text,bigint) to anon, authenticated;
