-- البحث بالمعنى للمساعد (مجاني): بصمة معنى لكل جزء من التعاميم والأدلة + تجهيز تلقائي كل دقيقة في الخلفية
-- شغّل هذا الملف مرة واحدة في Supabase: SQL Editor ← New query ← الصق ← Run

create extension if not exists vector with schema extensions;
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- بصمة المعنى لكل جزء (768 رقم من Gemini)
alter table public.ajf_circ_chunk add column if not exists emb extensions.vector(768);
create index if not exists ajf_circ_chunk_emb on public.ajf_circ_chunk using hnsw (emb extensions.vector_cosine_ops);

-- مفتاح سري داخلي للتجهيز التلقائي (ما يوصله أي موظف)
create table if not exists public.ajf_sec (k text primary key, v text not null);
alter table public.ajf_sec enable row level security;
revoke all on public.ajf_sec from public, anon, authenticated;
insert into public.ajf_sec(k, v) values ('cron_k', md5(random()::text || clock_timestamp()::text || random()::text)) on conflict (k) do nothing;

-- أقرب الأجزاء بالمعنى لسؤال الموظف
create or replace function public.ajf_chunk_match(p_q text, p_k int default 24)
returns jsonb language sql security definer set search_path = public, extensions as $$
  select coalesce(jsonb_agg(r order by r.d), '[]'::jsonb) from (
    select k.cid, k.n, k.txt, (k.emb <=> p_q::extensions.vector) as d
    from public.ajf_circ_chunk k where k.emb is not null
    order by k.emb <=> p_q::extensions.vector
    limit least(greatest(coalesce(p_k, 24), 1), 40)
  ) r
$$;
-- كم جزء تجهّز
create or replace function public.ajf_emb_stat()
returns jsonb language sql security definer set search_path = public as $$
  select jsonb_build_object('done', count(*) filter (where emb is not null), 'total', count(*)) from public.ajf_circ_chunk
$$;
revoke all on function public.ajf_chunk_match(text,int), public.ajf_emb_stat() from public, anon, authenticated;
grant execute on function public.ajf_chunk_match(text,int), public.ajf_emb_stat() to service_role;

-- كل دقيقة: يجهّز الأجزاء الجديدة (أول مرة ياخذ وقت حسب حجم الأدلة، وبعدها أي ملف جديد يتجهز لحاله)
select cron.unschedule('ajf-embed') where exists (select 1 from cron.job where jobname = 'ajf-embed');
select cron.schedule('ajf-embed', '* * * * *', $cron$
  select net.http_post(
    url := 'https://izhrblrbjdaujshzqqrp.supabase.co/functions/v1/ajf-files',
    headers := jsonb_build_object('Content-Type', 'application/json', 'apikey', 'sb_publishable__PNoWxYGPqTHh1mTk-DxSg_mxV6aCWC'),
    body := jsonb_build_object('action', 'embed_tick', 'key', (select v from public.ajf_sec where k = 'cron_k')),
    timeout_milliseconds := 60000)
$cron$);
