-- أجزاء الأدلة الكبيرة للمساعد الذكي (يقرأ الأجزاء الأقرب للسؤال بدل أول الملف فقط)
create table if not exists public.ajf_circ_chunk (
  cid   text not null references public.ajf_circ(id) on delete cascade,
  n     int  not null,
  txt   text not null,
  ntext text not null,
  primary key (cid, n)
);
alter table public.ajf_circ_chunk enable row level security;
revoke all on public.ajf_circ_chunk from public, anon, authenticated;
create index if not exists ajf_circ_chunk_trgm on public.ajf_circ_chunk using gin (ntext extensions.gin_trgm_ops);

-- للدالة ajf-files فقط (service role): بيانات التعاميم بدون النص الكامل
create or replace function public.ajf_circ_meta()
returns jsonb language sql security definer set search_path = public as $$
  select coalesce(jsonb_agg(x order by x.at desc), '[]'::jsonb) from (
    select id, title, cdate as cd, at, ai, (file_path is not null) as has_file, length(body) + length(ftext) as n,
           (select count(*) from public.ajf_circ_chunk k where k.cid = c.id) as chunks
    from public.ajf_circ c) x
$$;

-- أفضل الأجزاء لكلمات السؤال: p_groups = [[{n,k}],...] ، الترتيب بعدد الكلمات المطابقة
create or replace function public.ajf_chunk_search(p_groups jsonb, p_limit int default 30)
returns jsonb language sql security definer set search_path = public as $$
  select coalesce(jsonb_agg(r order by r.hit desc, r.cid, r.n), '[]'::jsonb) from (
    select k.cid, k.n, k.txt,
      (select count(*) from jsonb_array_elements(p_groups) g
        where exists (select 1 from jsonb_array_elements(g) a
          where (length(a->>'n') > 2 and k.ntext like '%' || (a->>'n') || '%')
             or (length(coalesce(a->>'k','')) > 2 and k.ntext like '%' || (a->>'k') || '%'))) as hit
    from public.ajf_circ_chunk k
    order by 4 desc limit greatest(1, least(coalesce(p_limit,30), 80))
  ) r where r.hit > 0
$$;
revoke all on function public.ajf_circ_meta(), public.ajf_chunk_search(jsonb,int) from public, anon, authenticated;
grant execute on function public.ajf_circ_meta(), public.ajf_chunk_search(jsonb,int) to service_role;
