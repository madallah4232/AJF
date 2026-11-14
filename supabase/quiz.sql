-- تحدي التشغيل: أسئلة يومية من التعاميم ودليل العمليات (السعودية وSGS) + لوحة المراكز
-- شغّل هذا الملف مرة واحدة في Supabase: SQL Editor ← New query ← الصق ← Run
-- ما يمسح أي شي موجود. الجواب الصحيح يبقى في قاعدة البيانات ولا يوصل جوال الموظف إلا بعد ما يجاوب.

-- بنك الأسئلة: st = pending (بانتظار اعتماد المشرف) / ok (معتمد) / no (مرفوض)
create table if not exists public.ajf_quiz_q (
  id        bigserial primary key,
  q         text not null,
  o         jsonb not null,            -- 4 خيارات
  a         int  not null check (a between 0 and 3),
  d         int  not null default 2 check (d between 1 and 3),
  why       text not null default '',
  src_id    text,
  src_title text not null default '',
  page      text not null default '',
  st        text not null default 'pending' check (st in ('pending','ok','no')),
  by_ai     boolean not null default true,
  at        timestamptz not null default now()
);
create index if not exists ajf_quiz_q_st on public.ajf_quiz_q (st, d);

-- الجولات: كل جولة أيام (افتراضياً 3) تبدأ 00:00 بتوقيت الرياض، وكل يوم 24 ساعة
create table if not exists public.ajf_quiz_round (
  id      bigserial primary key,
  starts  timestamptz not null,
  days    int not null default 3 check (days between 1 and 14),
  per_day int not null default 10 check (per_day between 1 and 30),
  secs    int not null default 30 check (secs between 10 and 120),
  auto    boolean not null default true,     -- بعد ما تخلص تبدأ اللي بعدها تلقائياً
  stopped boolean not null default false,
  by_emp  text,
  at      timestamptz not null default now()
);

-- أسئلة كل موظف: perm = ترتيب الخيارات اللي ظهرت له (مثل {2,0,3,1})
create table if not exists public.ajf_quiz_a (
  id    bigserial primary key,
  rid   bigint not null references public.ajf_quiz_round(id) on delete cascade,
  emp   text not null,
  day   int  not null,
  n     int  not null,
  qid   bigint not null references public.ajf_quiz_q(id) on delete cascade,
  perm  int[] not null,
  secs  int not null,
  shown timestamptz not null default now(),
  ans   timestamptz,
  pick  int,
  ok    boolean,
  ms    int,
  why   text,                               -- ans جاوب / time انتهى الوقت / left خرج من التطبيق
  unique (rid, emp, day, n)
);
create index if not exists ajf_quiz_a_emp on public.ajf_quiz_a (emp, qid);
create index if not exists ajf_quiz_a_rq on public.ajf_quiz_a (rid, qid);
create index if not exists ajf_quiz_a_open on public.ajf_quiz_a (emp) where ans is null;

alter table public.ajf_quiz_q enable row level security;
alter table public.ajf_quiz_round enable row level security;
alter table public.ajf_quiz_a enable row level security;
revoke all on public.ajf_quiz_q, public.ajf_quiz_round, public.ajf_quiz_a from public, anon, authenticated;

-- الجولة الحالية (آخر جولة). إذا خلصت وهي تلقائية تنشأ اللي بعدها
create or replace function public.ajf__qz_cur()
returns public.ajf_quiz_round language plpgsql security definer set search_path = public as $$
declare r public.ajf_quiz_round; nx timestamptz;
begin
  select * into r from ajf_quiz_round order by id desc limit 1;
  if not found then return null; end if;
  if r.auto and not r.stopped and now() >= r.starts + make_interval(days => r.days) then
    perform pg_advisory_xact_lock(hashtext('ajf_qz_round'));
    select * into r from ajf_quiz_round order by id desc limit 1;
    if r.auto and not r.stopped and now() >= r.starts + make_interval(days => r.days) then
      nx := r.starts + make_interval(days => r.days);
      while now() >= nx + make_interval(days => r.days) loop nx := nx + make_interval(days => r.days); end loop;
      insert into ajf_quiz_round(starts, days, per_day, secs, auto, by_emp)
        values (nx, r.days, r.per_day, r.secs, true, r.by_emp) returning * into r;
    end if;
  end if;
  return r;
end $$;

-- أي سؤال مفتوح للموظف: إذا انتهى وقته = انتهى الوقت، وإذا رجع يطلبه وهو داخل الوقت = خرج من التطبيق
create or replace function public.ajf__qz_close(p_emp text)
returns void language sql security definer set search_path = public as $$
  update ajf_quiz_a set ans = now(), ok = false, ms = secs * 1000,
    why = case when now() > shown + make_interval(secs => secs + 3) then 'time' else 'left' end
  where emp = p_emp and ans is null
$$;

create or replace function public.ajf__qz_rinfo(r public.ajf_quiz_round)
returns jsonb language sql stable set search_path = public as $$
  select case when r.id is null then null else jsonb_build_object(
    'id', r.id, 'no', (select count(*) from ajf_quiz_round x where x.id <= r.id),
    'starts', r.starts, 'ends', r.starts + make_interval(days => r.days), 'days', r.days, 'per', r.per_day, 'secs', r.secs, 'auto', r.auto,
    'ph', case when r.stopped then 'stop' when now() < r.starts then 'wait' when now() >= r.starts + make_interval(days => r.days) then 'end' else 'on' end,
    'day', case when now() >= r.starts and now() < r.starts + make_interval(days => r.days) then floor(extract(epoch from now() - r.starts) / 86400)::int + 1 else null end,
    'day_end', case when now() >= r.starts and now() < r.starts + make_interval(days => r.days)
      then r.starts + make_interval(days => floor(extract(epoch from now() - r.starts) / 86400)::int + 1) else null end) end
$$;

-- حالة الموظف: الجولة واليوم وأسئلة اليوم
create or replace function public.ajf_qz_state(p_token text, p_device text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare e public.employees; r public.ajf_quiz_round; ri jsonb; dy int; today jsonb; tot jsonb; adm jsonb;
begin
  e := ajf__who(p_token, p_device);
  if e.emp is null then return jsonb_build_object('s','out'); end if;
  perform ajf__qz_close(e.emp);
  r := ajf__qz_cur(); ri := ajf__qz_rinfo(r); dy := (ri->>'day')::int;
  select coalesce(jsonb_agg(jsonb_build_object('n', n, 'ok', ok, 'why', why) order by n), '[]'::jsonb) into today
    from ajf_quiz_a where r.id is not null and rid = r.id and emp = e.emp and day = dy;
  select jsonb_build_object('ok', count(*) filter (where ok), 'n', count(*)) into tot
    from ajf_quiz_a where r.id is not null and rid = r.id and emp = e.emp and ans is not null;
  if e.is_admin then
    select jsonb_build_object('pending', count(*) filter (where st = 'pending'), 'ok', count(*) filter (where st = 'ok'),
      'ok1', count(*) filter (where st = 'ok' and d = 1), 'ok2', count(*) filter (where st = 'ok' and d = 2), 'ok3', count(*) filter (where st = 'ok' and d = 3),
      'players', (select count(distinct emp) from ajf_quiz_a where r.id is not null and rid = r.id)) into adm from ajf_quiz_q;
  end if;
  return jsonb_build_object('s','ok', 'admin', e.is_admin, 'round', ri, 'today', today, 'tot', tot, 'adm', adm);
end $$;

-- السؤال التالي: من البنك المعتمد، ما سبق ظهر لنفس الموظف، والأقل استخداماً بين الموظفين بنفس الجولة
-- (حتى كل موظف تطلع له أسئلته الخاصة قدر الإمكان)، والصعوبة تتدرج: أول 30% سهل، بعدها متوسط، وآخر 30% صعب
create or replace function public.ajf_qz_next(p_token text, p_device text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare e public.employees; r public.ajf_quiz_round; ri jsonb; dy int; cnt int; tgt int; q public.ajf_quiz_q; pm int[]; aid bigint;
begin
  e := ajf__who(p_token, p_device);
  if e.emp is null then return jsonb_build_object('s','out'); end if;
  perform pg_advisory_xact_lock(hashtext('ajf_qz_' || e.emp));
  perform ajf__qz_close(e.emp);
  r := ajf__qz_cur(); ri := ajf__qz_rinfo(r);
  if ri is null or ri->>'ph' <> 'on' then return jsonb_build_object('s','noround'); end if;
  dy := (ri->>'day')::int;
  select count(*) into cnt from ajf_quiz_a where rid = r.id and emp = e.emp and day = dy;
  if cnt >= r.per_day then return jsonb_build_object('s','done'); end if;
  tgt := case when cnt < ceil(r.per_day * 0.3) then 1 when cnt < r.per_day - ceil(r.per_day * 0.3) then 2 else 3 end;
  select x.* into q from ajf_quiz_q x
    where x.st = 'ok' and not exists (select 1 from ajf_quiz_a y where y.emp = e.emp and y.qid = x.id)
    order by (x.d <> tgt), abs(x.d - tgt), (select count(*) from ajf_quiz_a z where z.rid = r.id and z.qid = x.id), random() limit 1;
  if not found then
    -- البنك خلص لهذا الموظف: نعيد له سؤال قديم ما ظهر له في هذي الجولة
    select x.* into q from ajf_quiz_q x
      where x.st = 'ok' and not exists (select 1 from ajf_quiz_a y where y.emp = e.emp and y.qid = x.id and y.rid = r.id)
      order by (select max(y.shown) from ajf_quiz_a y where y.emp = e.emp and y.qid = x.id) nulls first, random() limit 1;
  end if;
  if not found then return jsonb_build_object('s','empty'); end if;
  pm := array(select g from generate_series(0, 3) g order by random());
  insert into ajf_quiz_a(rid, emp, day, n, qid, perm, secs) values (r.id, e.emp, dy, cnt + 1, q.id, pm, r.secs) returning id into aid;
  return jsonb_build_object('s','ok', 'id', aid, 'n', cnt + 1, 'of', r.per_day, 'secs', r.secs, 'd', q.d, 'q', q.q,
    'o', (select jsonb_agg(q.o->>(pm[i]) order by i) from generate_subscripts(pm, 1) i));
end $$;

create or replace function public.ajf__qz_res(p_id bigint)
returns jsonb language sql security definer set search_path = public as $$
  select jsonb_build_object('s','ok', 'ok', a.ok, 'why', a.why, 'ms', a.ms, 'n', a.n,
    'right', array_position(a.perm, q.a) - 1, 'pick', case when a.pick is null then null else array_position(a.perm, a.pick) - 1 end,
    'exp', q.why, 'src', q.src_title, 'page', q.page)
  from ajf_quiz_a a join ajf_quiz_q q on q.id = a.qid where a.id = p_id
$$;

-- الجواب: الوقت يُحسب في الخادم (30 ثانية + 3 ثواني سماحية للشبكة). p_pick = رقم الخيار كما ظهر (0-3)، أو -1 لانتهاء الوقت
create or replace function public.ajf_qz_answer(p_token text, p_device text, p_id bigint, p_pick int)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare e public.employees; a public.ajf_quiz_a; qa int; el int; orig int;
begin
  e := ajf__who(p_token, p_device);
  if e.emp is null then return jsonb_build_object('s','out'); end if;
  select * into a from ajf_quiz_a where id = p_id and emp = e.emp for update;
  if not found then return jsonb_build_object('s','bad'); end if;
  if a.ans is null then
    el := (extract(epoch from now() - a.shown) * 1000)::int;
    select x.a into qa from ajf_quiz_q x where x.id = a.qid;
    if p_pick is null or p_pick < 0 or p_pick > 3 or el > (a.secs + 3) * 1000 then
      update ajf_quiz_a set ans = now(), ok = false, why = 'time', ms = a.secs * 1000 where id = a.id;
    else
      orig := a.perm[p_pick + 1];
      update ajf_quiz_a set ans = now(), pick = orig, ok = (orig = qa), why = 'ans', ms = least(el, a.secs * 1000) where id = a.id;
    end if;
  end if;
  return ajf__qz_res(a.id);
end $$;

-- خرج من التطبيق أثناء السؤال = خاسر
create or replace function public.ajf_qz_leave(p_token text, p_device text, p_id bigint)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare e public.employees;
begin
  e := ajf__who(p_token, p_device);
  if e.emp is null then return jsonb_build_object('s','out'); end if;
  update ajf_quiz_a set ans = now(), ok = false, why = 'left', ms = secs * 1000 where id = p_id and emp = e.emp and ans is null;
  return coalesce(ajf__qz_res(p_id), jsonb_build_object('s','bad'));
end $$;

-- لوحة المراكز: الأكثر إجابات صحيحة، وعند التعادل الأسرع. p_scope = round / day / all
-- المشرف ما يدخل الترتيب لأنه يشوف الأسئلة وأجوبتها وقت الاعتماد
create or replace function public.ajf_qz_board(p_token text, p_device text, p_scope text default 'round')
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare e public.employees; r public.ajf_quiz_round; ri jsonb; dy int; res jsonb;
begin
  e := ajf__who(p_token, p_device);
  if e.emp is null then return jsonb_build_object('s','out'); end if;
  r := ajf__qz_cur(); ri := ajf__qz_rinfo(r); dy := coalesce((ri->>'day')::int, (r.days));
  select coalesce(jsonb_agg(x order by x.rk), '[]'::jsonb) into res from (
    select row_number() over (order by count(*) filter (where a.ok) desc, sum(a.ms) asc, min(a.shown)) as rk,
      m.name, (a.emp = e.emp) as me, count(*) filter (where a.ok) as ok, count(*) as n, sum(a.ms) as ms
    from ajf_quiz_a a join employees m on m.emp = a.emp
    where a.ans is not null and not m.is_admin
      and (p_scope = 'all' or (r.id is not null and a.rid = r.id and (p_scope <> 'day' or a.day = dy)))
    group by a.emp, m.name) x;
  return jsonb_build_object('s','ok', 'rows', res, 'round', ri);
end $$;

-- إدارة الأسئلة والجولات (المشرف فقط)
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
      select q.id, q.q, q.o, q.a, q.d, q.why, q.src_title, q.page, q.st, q.at,
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
        d = coalesce((p_arg->>'d')::int, d), why = left(coalesce(p_arg->>'why', why), 800) where id = (p_arg->>'id')::bigint;
    else
      insert into ajf_quiz_q(q, o, a, d, why, src_title, st, by_ai)
        values (left(trim(p_arg->>'q'), 600), v_o, (p_arg->>'a')::int, coalesce((p_arg->>'d')::int, 2), left(coalesce(p_arg->>'why', ''), 800),
          left(coalesce(p_arg->>'src', ''), 200), 'ok', false);
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

  if p_action = 'stop' then
    update ajf_quiz_round set stopped = true where id = (select max(id) from ajf_quiz_round);
    return jsonb_build_object('s','ok');
  end if;

  return jsonb_build_object('s','bad');
end $$;

revoke all on function public.ajf__qz_cur(), public.ajf__qz_close(text), public.ajf__qz_rinfo(public.ajf_quiz_round), public.ajf__qz_res(bigint)
  from public, anon, authenticated;
revoke all on function public.ajf_qz_state(text,text), public.ajf_qz_next(text,text), public.ajf_qz_answer(text,text,bigint,int),
  public.ajf_qz_leave(text,text,bigint), public.ajf_qz_board(text,text,text), public.ajf_qz_admin(text,text,text,jsonb) from public;
grant execute on function public.ajf_qz_state(text,text), public.ajf_qz_next(text,text), public.ajf_qz_answer(text,text,bigint,int),
  public.ajf_qz_leave(text,text,bigint), public.ajf_qz_board(text,text,text), public.ajf_qz_admin(text,text,text,jsonb) to anon, authenticated;
