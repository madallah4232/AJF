-- تحدي التشغيل: توجيه الأسئلة حسب اختصاص كل موظف (من مسماه الوظيفي)
-- شغّل هذا الملف مرة واحدة في Supabase: SQL Editor ← New query ← الصق ← Run
-- ما يمسح أي شي. يضيف لكل سؤال اختصاص (tp): chk كاونتر · gate بوابة · ramp ساحة · lc لود كنترول · فاضي = عام للكل.
--   Customer Service Agent                         ← كاونتر + بوابة
--   Turnaround Coordinator / Ramp / Baggage Supv.  ← كاونتر + بوابة + ساحة (بدون لود كنترول)
--   Load Control / المشرفين والمدراء / غيرهم        ← كل الأسئلة

alter table public.ajf_quiz_q add column if not exists tp text;
do $$ begin
  alter table public.ajf_quiz_q add constraint ajf_quiz_q_tp check (tp is null or tp in ('chk','gate','ramp','lc'));
exception when duplicate_object then null; end $$;

-- الاختصاصات المسموحة لكل مسمى وظيفي
create or replace function public.ajf__qz_tps(p_title text)
returns text[] language sql immutable as $$
  select case
    when coalesce(p_title,'') ~* 'load control' then array['chk','gate','ramp','lc']
    when coalesce(p_title,'') ~* 'customer service|admin operations' then array['chk','gate']
    when coalesce(p_title,'') ~* 'turnaround|ramp|baggage' then array['chk','gate','ramp']
    else array['chk','gate','ramp','lc'] end;
$$;

-- تخمين اختصاص السؤال من كلماته (للأسئلة القديمة واللي تنضاف بدون اختصاص). المشرف يقدر يغيّره من إدارة الأسئلة
create or replace function public.ajf__qz_guess(p_q text, p_src text)
returns text language sql immutable as $$
  select case
    when t ~* '(load ?sheet|loadsheet|load control|اللود|لود كنترول|التحكم بالحمولة|ورقة الحمولة|\mlir\M|loading instruction|trim|mzfw|mtow|\mzfw\M|\mmlw\M|balance|توازن|notoc|\mlmc\M|\mdow\M|\mdoi\M|index|مؤشر|الوزن الأقصى)' then 'lc'
    when t ~* '(ramp|الساحة|ساحة|apron|عنبر|\mhold\M|\muld\M|حاوية|container|تحميل العفش|تنزيل|التحميل|loader|لودر|push ?back|دفع الطائرة|\mgpu\M|chock|كوابح|عوائق|cone|أقماع|marshal|سلم الطائرة|عربة|tow|الجرار|fuel|الوقود|dangerous goods|بضائع خطرة)' then 'ramp'
    when t ~* '(boarding|البوابة|بوابة|التصعيد|الصعود|gate|no.?show|لم يحضر|offload|إنزال الراكب|head ?count|عد الركاب|final call|النداء الأخير|إغلاق البوابة)' then 'gate'
    when t ~* '(check.?in|الكاونتر|كاونتر|إنهاء إجراءات|إجراءات السفر|counter|جواز|passport|تأشيرة|visa|إقامة|iqama|وثائق السفر|العفش المسموح|وزن زائد|excess|baggage allowance|بطاقة صعود|boarding pass|حجز|pnr|تذكرة|ticket|رضيع|infant|wchr|كرسي متحرك)' then 'chk'
    else null end
  from (select coalesce(p_q,'') || ' ' || coalesce(p_src,'') as t) s;
$$;

update public.ajf_quiz_q set tp = public.ajf__qz_guess(q, src_title) where tp is null;

create or replace function public.ajf__qz_tp_trg() returns trigger language plpgsql as $$
begin
  if new.tp is null then new.tp := public.ajf__qz_guess(new.q, new.src_title); end if;
  return new;
end $$;
drop trigger if exists ajf_quiz_q_tp on public.ajf_quiz_q;
create trigger ajf_quiz_q_tp before insert on public.ajf_quiz_q for each row execute function public.ajf__qz_tp_trg();

-- السؤال التالي: نفس السابق + بس الأسئلة اللي من اختصاص الموظف (أو العامة)
create or replace function public.ajf_qz_next(p_token text, p_device text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare e public.employees; r public.ajf_quiz_round; ri jsonb; dy int; cnt int; tgt int; q public.ajf_quiz_q; pm int[]; aid bigint; tps text[];
begin
  e := ajf__who(p_token, p_device);
  if e.emp is null then return jsonb_build_object('s','out'); end if;
  perform pg_advisory_xact_lock(hashtext('ajf_qz_' || e.emp));
  perform ajf__qz_close(e.emp);
  r := ajf__qz_cur(); ri := ajf__qz_rinfo(r);
  if ri is null or ri->>'ph' <> 'on' then return jsonb_build_object('s','noround'); end if;
  dy := (ri->>'day')::int;
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

-- إدارة الأسئلة: نفس السابق + الاختصاص tp
create or replace function public.ajf_qz_admin(p_token text, p_device text, p_action text, p_arg jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare e public.employees; res jsonb; v_n int; v_st timestamptz; v_o jsonb;
begin
  e := ajf__who(p_token, p_device);
  if e.emp is null then return jsonb_build_object('s','out'); end if;
  if not e.is_admin then return jsonb_build_object('s','denied'); end if;
  p_arg := coalesce(p_arg, '{}'::jsonb);

  if p_action = 'list' then
    select count(*) into v_n from ajf_quiz_q where st = coalesce(p_arg->>'st', 'pending');
    select coalesce(jsonb_agg(x), '[]'::jsonb) into res from (
      select q.id, q.q, q.o, q.a, q.d, q.why, q.src_title, q.page, q.st, q.at, q.tp,
        (select count(*) from ajf_quiz_a y where y.qid = q.id) as used,
        (select count(*) from ajf_quiz_a y where y.qid = q.id and y.ok) as good
      from ajf_quiz_q q where q.st = coalesce(p_arg->>'st', 'pending')
      order by q.id desc offset greatest(0, coalesce((p_arg->>'off')::int, 0)) limit 25) x;
    return jsonb_build_object('s','ok', 'n', v_n, 'rows', res);
  end if;

  if p_action = 'set' then
    if coalesce(p_arg->>'st', '') not in ('pending','ok','no') then return jsonb_build_object('s','bad'); end if;
    update ajf_quiz_q set st = p_arg->>'st' where id in (select (jsonb_array_elements_text(p_arg->'ids'))::bigint);
    get diagnostics v_n = row_count;
    return jsonb_build_object('s','ok', 'n', v_n);
  end if;

  if p_action in ('edit','add') then
    v_o := p_arg->'o';
    if jsonb_typeof(v_o) <> 'array' or jsonb_array_length(v_o) <> 4 or length(trim(coalesce(p_arg->>'q', ''))) < 5
       or coalesce((p_arg->>'a')::int, -1) not between 0 and 3
       or exists (select 1 from jsonb_array_elements_text(v_o) t where length(trim(t)) = 0) then
      return jsonb_build_object('s','bad');
    end if;
    if p_action = 'edit' then
      update ajf_quiz_q set q = left(trim(p_arg->>'q'), 600), o = v_o, a = (p_arg->>'a')::int,
        tp = case when p_arg ? 'tp' then nullif(p_arg->>'tp','') else tp end,
        d = coalesce((p_arg->>'d')::int, d), why = left(coalesce(p_arg->>'why', why), 800) where id = (p_arg->>'id')::bigint;
    else
      insert into ajf_quiz_q(q, o, a, d, why, src_title, st, by_ai, tp)
        values (left(trim(p_arg->>'q'), 600), v_o, (p_arg->>'a')::int, coalesce((p_arg->>'d')::int, 2), left(coalesce(p_arg->>'why', ''), 800),
          left(coalesce(p_arg->>'src', ''), 200), 'ok', false, nullif(p_arg->>'tp',''));
    end if;
    return jsonb_build_object('s','ok');
  end if;

  if p_action = 'del' then
    delete from ajf_quiz_q where id in (select (jsonb_array_elements_text(p_arg->'ids'))::bigint)
      and not exists (select 1 from ajf_quiz_a y where y.qid = ajf_quiz_q.id);
    get diagnostics v_n = row_count;
    -- اللي سبق ظهر لموظفين يُرفض بدل الحذف حتى تبقى نتائجهم
    update ajf_quiz_q set st = 'no' where id in (select (jsonb_array_elements_text(p_arg->'ids'))::bigint);
    return jsonb_build_object('s','ok', 'n', v_n);
  end if;

  -- بدء جولة جديدة: p_arg = {date:'YYYY-MM-DD', days, per, secs, auto}
  if p_action = 'round' then
    v_st := ((coalesce(p_arg->>'date', to_char(now() at time zone 'Asia/Riyadh', 'YYYY-MM-DD')))::date::timestamp) at time zone 'Asia/Riyadh';
    update ajf_quiz_round set stopped = true where not stopped and starts + make_interval(days => days) > now();
    insert into ajf_quiz_round(starts, days, per_day, secs, auto, by_emp)
      values (v_st, coalesce((p_arg->>'days')::int, 3), coalesce((p_arg->>'per')::int, 10), coalesce((p_arg->>'secs')::int, 30),
        coalesce((p_arg->>'auto')::boolean, true), e.emp);
    return jsonb_build_object('s','ok', 'round', ajf__qz_rinfo(ajf__qz_cur()));
  end if;

  -- تحديد اختصاص الأسئلة: {ids:[..], tp} أو بعد التوليد مباشرة {last:n, tp} لآخر n سؤال انولّد خلال 5 دقايق
  if p_action = 'tag' then
    if coalesce(p_arg->>'tp','') not in ('', 'chk','gate','ramp','lc') then return jsonb_build_object('s','bad'); end if;
    if p_arg ? 'last' then
      update ajf_quiz_q set tp = nullif(p_arg->>'tp','') where id in (select id from ajf_quiz_q where by_ai and at > now() - interval '5 minutes'
        order by id desc limit greatest(0, least(30, (p_arg->>'last')::int)));
    else
      update ajf_quiz_q set tp = nullif(p_arg->>'tp','') where id in (select (jsonb_array_elements_text(p_arg->'ids'))::bigint);
    end if;
    get diagnostics v_n = row_count;
    return jsonb_build_object('s','ok', 'n', v_n);
  end if;

  if p_action = 'stop' then
    update ajf_quiz_round set stopped = true where id = (select max(id) from ajf_quiz_round);
    return jsonb_build_object('s','ok');
  end if;

  return jsonb_build_object('s','bad');
end $$;

revoke all on function public.ajf__qz_tps(text), public.ajf__qz_guess(text,text) from public, anon, authenticated;
revoke all on function public.ajf_qz_next(text,text), public.ajf_qz_admin(text,text,text,jsonb) from public;
grant execute on function public.ajf_qz_next(text,text), public.ajf_qz_admin(text,text,text,jsonb) to anon, authenticated;

