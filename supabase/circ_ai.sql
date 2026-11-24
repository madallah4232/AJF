-- إضافة الملخص العربي الذكي للتعاميم (شغّله بعد circ.sql — ما يحذف شي)
alter table public.ajf_circ add column if not exists ai text not null default '';

create or replace function public.ajf_circ_search(p_token text, p_device text, p_groups jsonb, p_limit int default 40)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me jsonb; res jsonb;
begin
  me := public.ajf_circ_me(p_token, p_device);
  if me is null then return jsonb_build_object('s','out'); end if;
  select coalesce(jsonb_agg(r order by r.hit desc, r.cd desc nulls last, r.at desc), '[]'::jsonb) into res from (
    select c.id, c.title, c.tags, c.lang, c.cdate as cd, c.at, c.file_name, c.file_size, c.pages, c.by_name, (c.file_path is not null) as has_file, c.ai,
           left(c.body || ' ' || c.ftext, 30000) as txt,
           (select count(*) from jsonb_array_elements(p_groups) g
             where exists (select 1 from jsonb_array_elements(g) a
               where (length(a->>'n') > 1 and c.ntext like '%' || (a->>'n') || '%')
                  or (length(coalesce(a->>'k','')) > 2 and c.ktext like '% ' || (a->>'k') || '%'))) as hit
    from public.ajf_circ c
  ) r where r.hit > 0 limit greatest(1, least(coalesce(p_limit,40), 100));
  return jsonb_build_object('s','ok','rows',res);
end $$;

create or replace function public.ajf_circ_list(p_token text, p_device text, p_offset int default 0, p_limit int default 30)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me jsonb; res jsonb; n int;
begin
  me := public.ajf_circ_me(p_token, p_device);
  if me is null then return jsonb_build_object('s','out'); end if;
  select count(*) into n from public.ajf_circ;
  select coalesce(jsonb_agg(r), '[]'::jsonb) into res from (
    select id, title, tags, lang, cdate as cd, at, file_name, file_size, pages, by_name, (file_path is not null) as has_file, ai, left(body || ' ' || ftext, 400) as txt
    from public.ajf_circ order by at desc offset greatest(0,coalesce(p_offset,0)) limit greatest(0, least(coalesce(p_limit,30), 100))
  ) r;
  return jsonb_build_object('s','ok','n',n,'rows',res);
end $$;

create or replace function public.ajf_circ_get(p_token text, p_device text, p_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me jsonb; r jsonb;
begin
  me := public.ajf_circ_me(p_token, p_device);
  if me is null then return jsonb_build_object('s','out'); end if;
  select to_jsonb(x) into r from (select id, title, tags, body, ftext, ai, lang, cdate as cd, at, file_name, file_size, pages, by_name, (file_path is not null) as has_file from public.ajf_circ where id = p_id) x;
  return jsonb_build_object('s','ok','row',r);
end $$;
