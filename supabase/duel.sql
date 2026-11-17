-- ⚔️ تحديات الموظفين: موظف يتحدى زميله بأسئلة من بنك الأسئلة المعتمد، والكل يقدر يتابع الغرفة ويدردش
-- شغّل هذا الملف مرة واحدة في Supabase: SQL Editor ← New query ← الصق ← Run
-- ما يمسح أي شي موجود. يحتاج إن quiz.sql و quiz_roles.sql متشغّلين قبله.
--
-- العدالة:
--   • الأسئلة تنسحب عشوائياً من البنك المعتمد وقت إنشاء التحدي، وما تنكشف لأحد (حتى اللي أنشأ التحدي) إلا لحظة ظهورها للاثنين.
--   • الوقت كله يُحسب في الخادم: كل سؤال له بداية ونهاية ثابتة، والجواب بعد نهاية الوقت ما ينقبل.
--   • الجواب الصحيح ما يوصل لأحد إلا بعد ما ينتهي وقت السؤال.
--   • الدردشة: اللاعب ما تطلع له رسائل المتفرجين اللي انكتبت وقت السؤال إلا بعد ما ينتهي، وما يقدر يكتب وقت السؤال.
--   • المشرف (is_admin) ما يلعب لأنه يشوف الأجوبة وقت الاعتماد، بس يقدر يتابع ويدردش.

-- st: invite بانتظار رد الخصم / ready مقبول (ينتظر البداية أو شغّال) / done انتهى / no رفض / void انلغى أو انتهت مهلته
create table if not exists public.ajf_duel (
  id     bigserial primary key,
  a      text not null,                 -- اللي أنشأ التحدي
  b      text not null,                 -- الخصم
  tp     text,                          -- المجال: null = كل المجالات المسموحة للاثنين
  src    text,                          -- مصدر محدد (src_id من بنك الأسئلة) أو null
  src_t  text not null default '',
  nq     int  not null check (nq in (5,10,15)),
  secs   int  not null check (secs in (30,40,50,60)),
  starts timestamptz,                   -- null = يبدأ بعد دقيقة من القبول
  st     text not null default 'invite' check (st in ('invite','ready','done','no','void')),
  ra     int, rb int,                   -- الجولات اللي فاز فيها كل واحد
  ca     int, cb int,                   -- مجموع الإجابات الصحيحة
  win    text,                          -- الرقم الوظيفي للفائز، null = تعادل
  at     timestamptz not null default now(),
  fin    timestamptz
);
create index if not exists ajf_duel_st on public.ajf_duel (st, starts);
create index if not exists ajf_duel_ab on public.ajf_duel (a, b, at);

-- أسئلة التحدي: نفس ترتيب الخيارات للاثنين
create table if not exists public.ajf_duel_q (
  duel bigint not null references public.ajf_duel(id) on delete cascade,
  n    int not null,
  qid  bigint not null references public.ajf_quiz_q(id) on delete cascade,
  perm int[] not null,
  primary key (duel, n)
);

-- why: ans جاوب / left طلع من التطبيق
create table if not exists public.ajf_duel_a (
  duel bigint not null references public.ajf_duel(id) on delete cascade,
  n    int not null,
  emp  text not null,
  pick int,
  ok   boolean not null default false,
  ms   int not null,
  why  text not null default 'ans',
  at   timestamptz not null default now(),
  primary key (duel, n, emp)
);

create table if not exists public.ajf_duel_chat (
  id   bigserial primary key,
  duel bigint not null references public.ajf_duel(id) on delete cascade,
  emp  text not null,
  txt  text not null,
  at   timestamptz not null default now()
);
create index if not exists ajf_duel_chat_d on public.ajf_duel_chat (duel, id);

-- مين داخل الغرفة الحين (يتحدث مع كل تحديث للغرفة)
create table if not exists public.ajf_duel_v (
  duel bigint not null references public.ajf_duel(id) on delete cascade,
  emp  text not null,
  seen timestamptz not null default now(),
  primary key (duel, emp)
);

alter table public.ajf_duel enable row level security;
alter table public.ajf_duel_q enable row level security;
alter table public.ajf_duel_a enable row level security;
alter table public.ajf_duel_chat enable row level security;
alter table public.ajf_duel_v enable row level security;
revoke all on public.ajf_duel, public.ajf_duel_q, public.ajf_duel_a, public.ajf_duel_chat, public.ajf_duel_v from public, anon, authenticated;

-- ---------- الجدول الزمني ----------
-- كل سؤال: وقته (secs) + 5 ثواني عرض الجواب. وبين كل جولة (5 أسئلة) والثانية 8 ثواني استراحة.
create or replace function public.ajf__du_t(d public.ajf_duel, n int)
returns timestamptz language sql stable as $$
  select d.starts + make_interval(secs => (n - 1) * (d.secs + 5) + ((n - 1) / 5) * 8)
$$;
create or replace function public.ajf__du_end(d public.ajf_duel)
returns timestamptz language sql stable as $$
  select public.ajf__du_t(d, d.nq) + make_interval(secs => d.secs + 5)
$$;

-- المرحلة الحالية: wait قبل البداية / q السؤال مفتوح / rev عرض الجواب / brk استراحة بين الجولات / done
create or replace function public.ajf__du_ph(d public.ajf_duel, out ph text, out n int, out t0 timestamptz, out t1 timestamptz)
language plpgsql stable as $$
declare i int; t timestamptz;
begin
  if d.st <> 'ready' or d.starts is null then ph := case when d.st = 'done' then 'done' else d.st end; return; end if;
  if now() < d.starts then ph := 'wait'; n := 1; t0 := d.starts; return; end if;
  if now() >= ajf__du_end(d) then ph := 'done'; return; end if;
  for i in 1..d.nq loop
    t := ajf__du_t(d, i);
    if now() < t then ph := 'brk'; n := i; t0 := t; return; end if;
    if now() < t + make_interval(secs => d.secs) then ph := 'q'; n := i; t0 := t; t1 := t + make_interval(secs => d.secs); return; end if;
    if now() < t + make_interval(secs => d.secs + 5) then ph := 'rev'; n := i; t0 := t; t1 := t + make_interval(secs => d.secs + 5); return; end if;
  end loop;
  ph := 'done';
end $$;

-- الاختصاصات المشتركة بين اللاعبين (من مسماهم الوظيفي، نفس توجيه التحدي اليومي)
create or replace function public.ajf__du_tps(p_a text, p_b text)
returns text[] language sql stable set search_path = public as $$
  select array(select unnest(ajf__qz_tps((select title from employees where emp = p_a)))
               intersect select unnest(ajf__qz_tps((select title from employees where emp = p_b))))
$$;

-- النتيجة: كل جولة 5 أسئلة، اللي صح أكثر ياخذها، وعند التعادل الأسرع في إجاباته الصحيحة، وإذا تساووا الجولة تعادل
create or replace function public.ajf__du_score(d public.ajf_duel)
returns jsonb language sql stable set search_path = public as $$
  -- بس الأسئلة اللي انكشف جوابها (ما نكشف مين أصاب وهو السؤال مفتوح)
  with x as (select * from ajf_duel_a x where x.duel = d.id and x.ok and now() > ajf__du_t(d, x.n) + make_interval(secs => d.secs + 2)),
  r as (
    select g as rd,
      (select count(*) from x where x.emp = d.a and (x.n - 1) / 5 + 1 = g) as oa,
      (select count(*) from x where x.emp = d.b and (x.n - 1) / 5 + 1 = g) as ob,
      (select coalesce(sum(ms), 0) from x where x.emp = d.a and (x.n - 1) / 5 + 1 = g) as ma,
      (select coalesce(sum(ms), 0) from x where x.emp = d.b and (x.n - 1) / 5 + 1 = g) as mb
    from generate_series(1, d.nq / 5) g),
  w as (select *, case when oa > ob then 'a' when ob > oa then 'b' when oa > 0 and ma < mb then 'a' when ob > 0 and mb < ma then 'b' else null end as w from r)
  select jsonb_build_object(
    'ra', (select count(*) from w where w.w = 'a'), 'rb', (select count(*) from w where w.w = 'b'),
    'ca', (select coalesce(sum(oa), 0) from w), 'cb', (select coalesce(sum(ob), 0) from w),
    'ma', (select coalesce(sum(ma), 0) from w), 'mb', (select coalesce(sum(mb), 0) from w),
    'rounds', (select coalesce(jsonb_agg(jsonb_build_object('rd', rd, 'a', oa, 'b', ob, 'w', w) order by rd), '[]'::jsonb) from w))
$$;

-- ينهي التحديات اللي خلص وقتها، ويلغي الدعوات اللي فاتت مهلتها
create or replace function public.ajf__du_sweep()
returns void language plpgsql security definer set search_path = public as $$
declare d public.ajf_duel; s jsonb; w text;
begin
  update ajf_duel set st = 'void', fin = now()
    where st = 'invite' and ((starts is not null and now() > starts) or (starts is null and at < now() - interval '2 hours'));
  for d in select * from ajf_duel where st = 'ready' and starts is not null and now() >= ajf__du_end(ajf_duel.*) for update skip locked loop
    s := ajf__du_score(d);
    w := case when (s->>'ra')::int > (s->>'rb')::int then d.a when (s->>'rb')::int > (s->>'ra')::int then d.b
              when (s->>'ca')::int > (s->>'cb')::int then d.a when (s->>'cb')::int > (s->>'ca')::int then d.b
              when (s->>'ca')::int > 0 and (s->>'ma')::bigint < (s->>'mb')::bigint then d.a
              when (s->>'cb')::int > 0 and (s->>'mb')::bigint < (s->>'ma')::bigint then d.b else null end;
    update ajf_duel set st = 'done', fin = now(), ra = (s->>'ra')::int, rb = (s->>'rb')::int, ca = (s->>'ca')::int, cb = (s->>'cb')::int, win = w
      where id = d.id;
  end loop;
end $$;

-- هل اللاعب عنده تحدي ثاني مقبول يتداخل وقته مع هذا؟
create or replace function public.ajf__du_busy(p_emp text, p_from timestamptz, p_to timestamptz, p_except bigint)
returns boolean language sql stable set search_path = public as $$
  select exists (select 1 from ajf_duel d where d.st = 'ready' and d.id <> coalesce(p_except, 0) and p_emp in (d.a, d.b)
    and d.starts < p_to and ajf__du_end(d) > p_from)
$$;

create or replace function public.ajf__du_off()
returns boolean language sql stable set search_path = public as $$
  select coalesce((select (v->>'off')::boolean from ajf_cfg where k = 'duel'), false)
$$;

-- تنبيه على الجوال (يمشي مع التنبيهات المكتوبة الموجّهة، bc_to.sql). لو ما اشتغل ما يوقف التحدي
create or replace function public.ajf__du_notify(p_from public.employees, p_to text, p_body text)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into ajf_bc(emp, name, kind, body, urgent, to_emps) values (p_from.emp, p_from.name, 'text', left(p_body, 300), false, array[p_to]);
exception when others then null;
end $$;

-- إحصائيات الموظف: فوز / خسارة / تعادل / سلسلة الانتصارات الحالية
create or replace function public.ajf__du_stats(p_emp text)
returns jsonb language sql stable set search_path = public as $$
  with m as (select fin, case when win = p_emp then 'w' when win is null then 'd' else 'l' end as r
             from ajf_duel where st = 'done' and (a = p_emp or b = p_emp))
  select jsonb_build_object('w', count(*) filter (where r = 'w'), 'l', count(*) filter (where r = 'l'), 'd', count(*) filter (where r = 'd'),
    'streak', (select count(*) from m where r = 'w' and fin > coalesce((select max(fin) from m where r <> 'w'), '-infinity'::timestamptz)))
  from m
$$;

-- ---------- للموظف ----------

-- الشاشة الرئيسية: التحديات الشغّالة والقادمة، دعواتي، آخر النتائج، إحصائياتي
create or replace function public.ajf_du_list(p_token text, p_device text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare e public.employees; v_day date := (now() at time zone 'Asia/Riyadh')::date;
begin
  e := ajf__who(p_token, p_device);
  if e.emp is null then return jsonb_build_object('s','out'); end if;
  perform ajf__du_sweep();
  return jsonb_build_object('s','ok', 'me', e.emp, 'admin', e.is_admin, 'off', ajf__du_off(), 'now', now(),
    'left', greatest(0, 3 - (select count(*) from ajf_duel where a = e.emp and (at at time zone 'Asia/Riyadh')::date = v_day and st <> 'no')),
    'stats', ajf__du_stats(e.emp),
    'live', coalesce((select jsonb_agg(jsonb_build_object('id', d.id, 'a', ea.name, 'b', eb.name, 'mine', e.emp in (d.a, d.b),
        'nq', d.nq, 'secs', d.secs, 'starts', d.starts, 'ph', (ajf__du_ph(d)).ph, 'n', (ajf__du_ph(d)).n,
        'v', (select count(*) from ajf_duel_v v where v.duel = d.id and v.seen > now() - interval '15 seconds'),
        'sc', case when now() >= d.starts then ajf__du_score(d) end) order by d.starts)
      from ajf_duel d join employees ea on ea.emp = d.a join employees eb on eb.emp = d.b where d.st = 'ready'), '[]'::jsonb),
    'inv', coalesce((select jsonb_agg(jsonb_build_object('id', d.id, 'in', d.b = e.emp, 'who', case when d.b = e.emp then ea.name else eb.name end,
        'nq', d.nq, 'secs', d.secs, 'starts', d.starts, 'src', d.src_t, 'tp', d.tp, 'at', d.at) order by d.id desc)
      from ajf_duel d join employees ea on ea.emp = d.a join employees eb on eb.emp = d.b where d.st = 'invite' and e.emp in (d.a, d.b)), '[]'::jsonb),
    'done', coalesce((select jsonb_agg(x order by x.fin desc) from (
      select d.id, d.fin, ea.name as a, eb.name as b, d.ra, d.rb, d.ca, d.cb, d.nq,
        case when d.win = d.a then 'a' when d.win = d.b then 'b' end as w, e.emp in (d.a, d.b) as mine
      from ajf_duel d join employees ea on ea.emp = d.a join employees eb on eb.emp = d.b
      where d.st = 'done' and d.fin > now() - interval '7 days' order by d.fin desc limit 40) x), '[]'::jsonb),
    'top', coalesce((select jsonb_agg(x order by x.w desc, x.l, x.name) from (
      select m.name, (ajf__du_stats(m.emp)->>'w')::int as w, (ajf__du_stats(m.emp)->>'l')::int as l, (ajf__du_stats(m.emp)->>'d')::int as d,
        (ajf__du_stats(m.emp)->>'streak')::int as streak, m.emp = e.emp as me
      from employees m where exists (select 1 from ajf_duel d where d.st = 'done' and m.emp in (d.a, d.b))
      order by 2 desc limit 30) x), '[]'::jsonb));
end $$;

-- الزملاء اللي أقدر أتحداهم + المجالات المشتركة والمصادر المتاحة لكل خصم يحسبها الجوال
create or replace function public.ajf_du_opts(p_token text, p_device text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare e public.employees;
begin
  e := ajf__who(p_token, p_device);
  if e.emp is null then return jsonb_build_object('s','out'); end if;
  return jsonb_build_object('s','ok', 'tps', to_jsonb(ajf__qz_tps(e.title)),
    'emps', coalesce((select jsonb_agg(jsonb_build_object('emp', m.emp, 'name', m.name, 'title', m.title, 'tps', to_jsonb(ajf__qz_tps(m.title))) order by m.name)
      from employees m where m.active and m.pass_hash is not null and not m.is_admin and m.emp <> e.emp), '[]'::jsonb),
    -- عدد الأسئلة المعتمدة لكل مجال ومصدر (null = عامة)
    'bank', coalesce((select jsonb_agg(jsonb_build_object('tp', tp, 'src', src_id, 'src_t', src_title, 'n', n))
      from (select tp, src_id, max(src_title) as src_title, count(*) as n from ajf_quiz_q where st = 'ok' group by tp, src_id) x), '[]'::jsonb));
end $$;

-- إنشاء تحدي. p_tp: '' كل المجالات المشتركة أو chk/gate/ramp/lc. p_src: '' أي مصدر. p_start: null = بعد دقيقة من القبول
create or replace function public.ajf_du_new(p_token text, p_device text, p_opp text, p_tp text, p_src text, p_nq int, p_secs int, p_start timestamptz)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare e public.employees; o public.employees; v_tps text[]; v_tp text := nullif(p_tp, ''); v_src text := nullif(p_src, '');
  v_day date := (now() at time zone 'Asia/Riyadh')::date; did bigint; cnt int;
begin
  e := ajf__who(p_token, p_device);
  if e.emp is null then return jsonb_build_object('s','out'); end if;
  if ajf__du_off() then return jsonb_build_object('s','off'); end if;
  if e.is_admin then return jsonb_build_object('s','admin'); end if;
  select * into o from employees where emp = p_opp and active and pass_hash is not null;
  if o.emp is null or o.emp = e.emp or o.is_admin then return jsonb_build_object('s','bad'); end if;
  if p_nq not in (5,10,15) or p_secs not in (30,40,50,60) then return jsonb_build_object('s','bad'); end if;
  if p_start is not null and (p_start < now() + interval '1 minute' or p_start > now() + interval '24 hours') then return jsonb_build_object('s','time'); end if;
  perform pg_advisory_xact_lock(hashtext('ajf_du_' || least(e.emp, o.emp) || greatest(e.emp, o.emp)));
  perform ajf__du_sweep();
  if (select count(*) from ajf_duel where a = e.emp and (at at time zone 'Asia/Riyadh')::date = v_day and ajf_duel.st <> 'no') >= 3 then
    return jsonb_build_object('s','limit'); end if;
  if exists (select 1 from ajf_duel where ((a = e.emp and b = o.emp) or (a = o.emp and b = e.emp))
             and (at at time zone 'Asia/Riyadh')::date = v_day and ajf_duel.st not in ('no','void')) then
    return jsonb_build_object('s','pair'); end if;
  if exists (select 1 from ajf_duel where ajf_duel.st = 'invite' and a = e.emp and b = o.emp) then return jsonb_build_object('s','pair'); end if;
  if p_start is not null and (ajf__du_busy(e.emp, p_start, p_start + make_interval(secs => p_nq * (p_secs + 5) + 16), null)
     or ajf__du_busy(o.emp, p_start, p_start + make_interval(secs => p_nq * (p_secs + 5) + 16), null)) then return jsonb_build_object('s','busy'); end if;
  v_tps := ajf__du_tps(e.emp, o.emp);
  if v_tp is not null and not (v_tp = any(v_tps)) then return jsonb_build_object('s','tp'); end if;
  -- الأسئلة: من البنك المعتمد، ضمن المجال، والأقل ظهوراً للاثنين قبل (في التحدي اليومي والتحديات)
  select count(*) into cnt from ajf_quiz_q q where q.st = 'ok'
    and (case when v_tp is null then (q.tp is null or q.tp = any(v_tps)) else q.tp = v_tp end) and (v_src is null or q.src_id = v_src);
  if cnt < p_nq then return jsonb_build_object('s','few', 'n', cnt); end if;
  insert into ajf_duel(a, b, tp, src, src_t, nq, secs, starts)
    values (e.emp, o.emp, v_tp, v_src, coalesce((select max(src_title) from ajf_quiz_q where src_id = v_src), ''), p_nq, p_secs, p_start) returning id into did;
  insert into ajf_duel_q(duel, n, qid, perm)
    select did, row_number() over (), x.id, array(select g from generate_series(0, 3) g order by random())
    from (select q.id from ajf_quiz_q q where q.st = 'ok'
            and (case when v_tp is null then (q.tp is null or q.tp = any(v_tps)) else q.tp = v_tp end) and (v_src is null or q.src_id = v_src)
          order by (select count(*) from ajf_quiz_a y where y.qid = q.id and y.emp in (e.emp, o.emp))
                 + (select count(*) from ajf_duel_q z join ajf_duel dd on dd.id = z.duel where z.qid = q.id and (dd.a in (e.emp, o.emp) or dd.b in (e.emp, o.emp))),
                   random() limit p_nq) x;
  perform ajf__du_notify(e, o.emp, '⚔️ ' || e.name || ' يتحداك: ' || p_nq || ' أسئلة · ' || p_secs || ' ثانية للسؤال'
    || case when p_start is null then '' else ' · يبدأ ' || to_char(p_start at time zone 'Asia/Riyadh', 'HH12:MI') || case when extract(hour from p_start at time zone 'Asia/Riyadh') < 12 then ' ص' else ' م' end end
    || '. افتح تحدي التشغيل ← التحديات عشان تقبل أو ترفض.');
  return jsonb_build_object('s','ok', 'id', did);
end $$;

-- رد الخصم: قبول أو رفض. اللي أنشأ التحدي يقدر يلغيه قبل ما يبدأ
create or replace function public.ajf_du_reply(p_token text, p_device text, p_id bigint, p_act text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare e public.employees; d public.ajf_duel; o public.employees;
begin
  e := ajf__who(p_token, p_device);
  if e.emp is null then return jsonb_build_object('s','out'); end if;
  perform ajf__du_sweep();
  select * into d from ajf_duel where id = p_id for update;
  if not found then return jsonb_build_object('s','bad'); end if;
  if p_act in ('yes','no') then
    if d.b <> e.emp or d.st <> 'invite' then return jsonb_build_object('s','gone'); end if;
    if p_act = 'yes' and ajf__du_off() then return jsonb_build_object('s','off'); end if;
    if p_act = 'yes' then
      d.starts := coalesce(d.starts, date_trunc('second', now()) + interval '60 seconds');
      if ajf__du_busy(d.a, d.starts, ajf__du_end(d), d.id) or ajf__du_busy(d.b, d.starts, ajf__du_end(d), d.id) then return jsonb_build_object('s','busy'); end if;
    end if;
    update ajf_duel set st = case when p_act = 'yes' then 'ready' else 'no' end,
      starts = case when p_act = 'yes' then d.starts else starts end,
      fin = case when p_act = 'no' then now() end
      where id = d.id returning * into d;
    select * into o from employees where emp = d.a;
    perform ajf__du_notify(e, d.a, case when p_act = 'yes'
      then '⚔️ ' || e.name || ' قبل تحديك! يبدأ ' || case when d.starts < now() + interval '2 minutes' then 'بعد دقيقة' else 'الساعة ' || to_char(d.starts at time zone 'Asia/Riyadh', 'HH12:MI') end || '. ادخل الغرفة من تحدي التشغيل ← التحديات.'
      else e.name || ' اعتذر عن التحدي.' end);
    return jsonb_build_object('s','ok', 'starts', d.starts);
  end if;
  if p_act = 'cancel' then
    if d.a <> e.emp or not (d.st = 'invite' or (d.st = 'ready' and now() < d.starts)) then return jsonb_build_object('s','gone'); end if;
    update ajf_duel set st = 'void', fin = now() where id = d.id;
    if d.st = 'ready' then perform ajf__du_notify(e, d.b, e.name || ' ألغى التحدي.'); end if;
    return jsonb_build_object('s','ok');
  end if;
  return jsonb_build_object('s','bad');
end $$;

-- حالة الغرفة (الجوال يطلبها كل ثانية تقريباً وهو داخل الغرفة). p_after = آخر رسالة دردشة وصلت
create or replace function public.ajf_du_room(p_token text, p_device text, p_id bigint, p_after bigint default 0)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare e public.employees; d public.ajf_duel; p record; me text; pl boolean; q public.ajf_quiz_q; dq public.ajf_duel_q;
  cur jsonb; hist jsonb; chat jsonb; cut timestamptz; hide boolean;
begin
  e := ajf__who(p_token, p_device);
  if e.emp is null then return jsonb_build_object('s','out'); end if;
  perform ajf__du_sweep();
  select * into d from ajf_duel where id = p_id;
  if not found or d.st in ('no','void') then return jsonb_build_object('s','gone'); end if;
  if d.st = 'invite' and e.emp not in (d.a, d.b) then return jsonb_build_object('s','gone'); end if;
  pl := e.emp in (d.a, d.b); me := case when e.emp = d.a then 'a' when e.emp = d.b then 'b' end;
  insert into ajf_duel_v(duel, emp, seen) values (d.id, e.emp, now()) on conflict (duel, emp) do update set seen = now();
  select * into p from ajf__du_ph(d);
  -- الجواب الصحيح ما ينكشف إلا بعد ما تخلص ثانيتين السماحية (عشان ما أحد يشوفه ويجاوب متأخر)
  hide := p.ph = 'q' or (p.ph = 'rev' and now() < p.t0 + make_interval(secs => d.secs + 2));

  -- السؤال الحالي
  if p.ph in ('q','rev') then
    select * into dq from ajf_duel_q where duel = d.id and n = p.n;
    select * into q from ajf_quiz_q where id = dq.qid;
    cur := jsonb_build_object('n', p.n, 'q', q.q, 'd', q.d,
      'o', (select jsonb_agg(q.o->>(dq.perm[i]) order by i) from generate_subscripts(dq.perm, 1) i),
      'end', p.t1,
      -- مين جاوب (بدون صح أو غلط وقت السؤال)
      'ans_a', exists (select 1 from ajf_duel_a x where x.duel = d.id and x.n = p.n and x.emp = d.a),
      'ans_b', exists (select 1 from ajf_duel_a x where x.duel = d.id and x.n = p.n and x.emp = d.b),
      'my', case when pl then (select array_position(dq.perm, x.pick) - 1 from ajf_duel_a x where x.duel = d.id and x.n = p.n and x.emp = e.emp) end,
      'mydone', pl and exists (select 1 from ajf_duel_a x where x.duel = d.id and x.n = p.n and x.emp = e.emp));
    if not hide then
      cur := cur || jsonb_build_object('right', array_position(dq.perm, q.a) - 1, 'why', q.why, 'src', q.src_title,
        'pa', (select jsonb_build_object('pick', array_position(dq.perm, x.pick) - 1, 'ok', x.ok, 'ms', x.ms, 'why', x.why) from ajf_duel_a x where x.duel = d.id and x.n = p.n and x.emp = d.a),
        'pb', (select jsonb_build_object('pick', array_position(dq.perm, x.pick) - 1, 'ok', x.ok, 'ms', x.ms, 'why', x.why) from ajf_duel_a x where x.duel = d.id and x.n = p.n and x.emp = d.b));
    end if;
  end if;

  -- بعد النهاية: كل الأسئلة وأجوبتها عشان الكل يستفيد
  if p.ph = 'done' then
    select coalesce(jsonb_agg(jsonb_build_object('n', z.n, 'q', q2.q, 'why', q2.why, 'src', q2.src_title,
        'o', (select jsonb_agg(q2.o->>(z.perm[i]) order by i) from generate_subscripts(z.perm, 1) i),
        'right', array_position(z.perm, q2.a) - 1,
        'pa', (select jsonb_build_object('pick', array_position(z.perm, x.pick) - 1, 'ok', x.ok, 'ms', x.ms) from ajf_duel_a x where x.duel = d.id and x.n = z.n and x.emp = d.a),
        'pb', (select jsonb_build_object('pick', array_position(z.perm, x.pick) - 1, 'ok', x.ok, 'ms', x.ms) from ajf_duel_a x where x.duel = d.id and x.n = z.n and x.emp = d.b)) order by z.n), '[]'::jsonb)
      into hist from ajf_duel_q z join ajf_quiz_q q2 on q2.id = z.qid where z.duel = d.id;
    select * into d from ajf_duel where id = p_id;
  end if;

  -- الدردشة: اللاعب وقت السؤال ما يشوف إلا الرسائل اللي قبل بداية السؤال
  cut := case when pl and hide then p.t0 else 'infinity'::timestamptz end;
  select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'name', m.name, 'me', c.emp = e.emp, 'pl', case when c.emp = d.a then 'a' when c.emp = d.b then 'b' end,
      'txt', c.txt, 'at', c.at) order by c.id), '[]'::jsonb)
    into chat from (select * from ajf_duel_chat where duel = d.id and id > coalesce(p_after, 0) and (at < cut or emp = e.emp) order by id limit 80) c
    left join employees m on m.emp = c.emp;

  return jsonb_build_object('s','ok', 'now', now(), 'id', d.id, 'st', d.st, 'ph', case when p.ph = 'rev' and hide then 'q2' else p.ph end, 'n', p.n, 't0', p.t0, 't1', p.t1,
    'me', me, 'admin', e.is_admin,
    'a', (select jsonb_build_object('name', name, 'title', title) from employees where emp = d.a),
    'b', (select jsonb_build_object('name', name, 'title', title) from employees where emp = d.b),
    'nq', d.nq, 'secs', d.secs, 'starts', d.starts, 'src', d.src_t, 'tp', d.tp,
    'sc', case when d.starts is not null and now() >= d.starts then ajf__du_score(d) end,
    'win', case when d.st = 'done' then case when d.win = d.a then 'a' when d.win = d.b then 'b' else '' end end,
    'v', (select coalesce(jsonb_agg(m.name order by v.seen desc), '[]'::jsonb) from ajf_duel_v v join employees m on m.emp = v.emp
          where v.duel = d.id and v.seen > now() - interval '15 seconds' and v.emp not in (d.a, d.b)),
    'cur', cur, 'hist', hist, 'chat', chat);
end $$;

-- الجواب: p_pick رقم الخيار كما ظهر (0-3). الوقت يُحسب في الخادم مع ثانيتين سماحية للشبكة
create or replace function public.ajf_du_answer(p_token text, p_device text, p_id bigint, p_n int, p_pick int)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare e public.employees; d public.ajf_duel; dq public.ajf_duel_q; t timestamptz; el int; orig int; qa int;
begin
  e := ajf__who(p_token, p_device);
  if e.emp is null then return jsonb_build_object('s','out'); end if;
  select * into d from ajf_duel where id = p_id;
  if not found or d.st <> 'ready' or e.emp not in (d.a, d.b) or p_n < 1 or p_n > d.nq then return jsonb_build_object('s','bad'); end if;
  t := ajf__du_t(d, p_n);
  if now() < t then return jsonb_build_object('s','early'); end if;
  el := (extract(epoch from now() - t) * 1000)::int;
  if el > (d.secs + 2) * 1000 then return jsonb_build_object('s','late'); end if;
  if p_pick is null or p_pick < 0 or p_pick > 3 then return jsonb_build_object('s','bad'); end if;
  select * into dq from ajf_duel_q where duel = d.id and n = p_n;
  select a into qa from ajf_quiz_q where id = dq.qid;
  orig := dq.perm[p_pick + 1];
  insert into ajf_duel_a(duel, n, emp, pick, ok, ms) values (d.id, p_n, e.emp, orig, orig = qa, least(el, d.secs * 1000))
    on conflict (duel, n, emp) do nothing;
  return jsonb_build_object('s','ok');
end $$;

-- طلع من التطبيق والسؤال مفتوح = خطأ
create or replace function public.ajf_du_leave(p_token text, p_device text, p_id bigint, p_n int)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare e public.employees; d public.ajf_duel; t timestamptz;
begin
  e := ajf__who(p_token, p_device);
  if e.emp is null then return jsonb_build_object('s','out'); end if;
  select * into d from ajf_duel where id = p_id;
  if not found or d.st <> 'ready' or e.emp not in (d.a, d.b) or p_n < 1 or p_n > d.nq then return jsonb_build_object('s','bad'); end if;
  t := ajf__du_t(d, p_n);
  if now() < t or now() > t + make_interval(secs => d.secs + 2) then return jsonb_build_object('s','bad'); end if;
  insert into ajf_duel_a(duel, n, emp, pick, ok, ms, why) values (d.id, p_n, e.emp, null, false, d.secs * 1000, 'left')
    on conflict (duel, n, emp) do nothing;
  return jsonb_build_object('s','ok');
end $$;

-- رسالة في دردشة الغرفة (200 حرف، رسالة كل ثانيتين)
create or replace function public.ajf_du_chat(p_token text, p_device text, p_id bigint, p_txt text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare e public.employees; d public.ajf_duel; t text := btrim(coalesce(p_txt, '')); p record;
begin
  e := ajf__who(p_token, p_device);
  if e.emp is null then return jsonb_build_object('s','out'); end if;
  select * into d from ajf_duel where id = p_id;
  if not found or d.st not in ('ready','done') then return jsonb_build_object('s','bad'); end if;
  if length(t) = 0 or length(t) > 200 then return jsonb_build_object('s','bad'); end if;
  select * into p from ajf__du_ph(d);
  -- اللاعب ما يكتب والسؤال مفتوح (ولا في ثانيتين السماحية بعده)
  if e.emp in (d.a, d.b) and (p.ph = 'q' or (p.ph = 'rev' and now() < p.t0 + make_interval(secs => d.secs + 2))) then return jsonb_build_object('s','q'); end if;
  if exists (select 1 from ajf_duel_chat where duel = d.id and emp = e.emp and at > now() - interval '2 seconds') then return jsonb_build_object('s','fast'); end if;
  insert into ajf_duel_chat(duel, emp, txt) values (d.id, e.emp, t);
  return jsonb_build_object('s','ok');
end $$;

-- المشرف: إيقاف أو تشغيل كل التحديات (وقت الذروة). الإيقاف يمنع تحديات جديدة والقبول، والشغّال يكمل
create or replace function public.ajf_du_admin(p_token text, p_device text, p_off boolean)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare e public.employees;
begin
  e := ajf__who(p_token, p_device);
  if e.emp is null then return jsonb_build_object('s','out'); end if;
  if not e.is_admin then return jsonb_build_object('s','denied'); end if;
  insert into ajf_cfg(k, v, by) values ('duel', jsonb_build_object('off', coalesce(p_off, false)), e.emp)
    on conflict (k) do update set v = excluded.v, by = excluded.by, at = now();
  return jsonb_build_object('s','ok', 'off', coalesce(p_off, false));
end $$;

revoke all on function public.ajf__du_t(public.ajf_duel,int), public.ajf__du_end(public.ajf_duel), public.ajf__du_ph(public.ajf_duel),
  public.ajf__du_tps(text,text), public.ajf__du_busy(text,timestamptz,timestamptz,bigint), public.ajf__du_score(public.ajf_duel), public.ajf__du_sweep(), public.ajf__du_off(),
  public.ajf__du_notify(public.employees,text,text), public.ajf__du_stats(text) from public, anon, authenticated;
revoke all on function public.ajf_du_list(text,text), public.ajf_du_opts(text,text), public.ajf_du_new(text,text,text,text,text,int,int,timestamptz),
  public.ajf_du_reply(text,text,bigint,text), public.ajf_du_room(text,text,bigint,bigint), public.ajf_du_answer(text,text,bigint,int,int),
  public.ajf_du_leave(text,text,bigint,int), public.ajf_du_chat(text,text,bigint,text), public.ajf_du_admin(text,text,boolean) from public;
grant execute on function public.ajf_du_list(text,text), public.ajf_du_opts(text,text), public.ajf_du_new(text,text,text,text,text,int,int,timestamptz),
  public.ajf_du_reply(text,text,bigint,text), public.ajf_du_room(text,text,bigint,bigint), public.ajf_du_answer(text,text,bigint,int,int),
  public.ajf_du_leave(text,text,bigint,int), public.ajf_du_chat(text,text,bigint,text), public.ajf_du_admin(text,text,boolean) to anon, authenticated;
