-- التعاميم وملفات PDF: بحث للموظفين المسجّلين، والإضافة والحذف للمشرف فقط
-- شغّل هذا الملف مرة واحدة في Supabase: SQL Editor ← New query ← الصق ← Run
-- (ما يغيّر أي جدول موجود)

create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;

create table if not exists public.ajf_circ (
  id        text primary key,
  title     text not null,
  tags      text not null default '',
  body      text not null default '',     -- نص التعميم المكتوب
  ftext     text not null default '',     -- النص المستخرج من ملف PDF
  ntext     text not null default '',     -- نص موحّد للبحث (يجهّزه التطبيق)
  ktext     text not null default '',     -- جذور الكلمات للبحث المرن (يجهّزه التطبيق)
  lang      text not null default '',
  cdate     date,                         -- تاريخ التعميم
  file_path text,                         -- مسار الملف في المخزن الخاص circ
  file_name text,
  file_size int,
  pages     int,
  by_emp    text,
  by_name   text,
  at        timestamptz not null default now()
);
alter table public.ajf_circ enable row level security;
revoke all on public.ajf_circ from public, anon, authenticated;
create index if not exists ajf_circ_ntext_trgm on public.ajf_circ using gin (ntext extensions.gin_trgm_ops);
create index if not exists ajf_circ_ktext_trgm on public.ajf_circ using gin (ktext extensions.gin_trgm_ops);
create index if not exists ajf_circ_at on public.ajf_circ (at desc);

-- مخزن الملفات: خاص (ما يُفتح إلا برابط مؤقت من دالة ajf-files بعد التحقق من الدخول)، PDF فقط، حد 50MB للملف
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('circ', 'circ', false, 52428800, array['application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 52428800, allowed_mime_types = array['application/pdf'];

create or replace function public.ajf_circ_me(p_token text, p_device text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me jsonb;
begin
  me := to_jsonb(public.ajf_me(p_token => p_token, p_device => p_device));
  if me is null or coalesce(me->>'emp','') = '' or me->>'s' = 'out' then return null; end if;
  return me;
end $$;

-- البحث: p_groups = [[{n,k},{n,k}...], ...] — كل مجموعة = كلمة الموظف وبدائلها (مرادفات/ترجمة)
create or replace function public.ajf_circ_search(p_token text, p_device text, p_groups jsonb, p_limit int default 40)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me jsonb; res jsonb;
begin
  me := public.ajf_circ_me(p_token, p_device);
  if me is null then return jsonb_build_object('s','out'); end if;
  select coalesce(jsonb_agg(r order by r.hit desc, r.cd desc nulls last, r.at desc), '[]'::jsonb) into res from (
    select c.id, c.title, c.tags, c.lang, c.cdate as cd, c.at, c.file_name, c.file_size, c.pages, c.by_name, (c.file_path is not null) as has_file,
           left(c.body || ' ' || c.ftext, 30000) as txt,
           (select count(*) from jsonb_array_elements(p_groups) g
             where exists (select 1 from jsonb_array_elements(g) a
               where (length(a->>'n') > 1 and c.ntext like '%' || (a->>'n') || '%')
                  or (length(coalesce(a->>'k','')) > 2 and c.ktext like '% ' || (a->>'k') || '%'))) as hit
    from public.ajf_circ c
  ) r where r.hit > 0 limit greatest(1, least(coalesce(p_limit,40), 100));
  return jsonb_build_object('s','ok','rows',res);
end $$;

-- آخر التعاميم (بدون النص الكامل)
create or replace function public.ajf_circ_list(p_token text, p_device text, p_offset int default 0, p_limit int default 30)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me jsonb; res jsonb; n int;
begin
  me := public.ajf_circ_me(p_token, p_device);
  if me is null then return jsonb_build_object('s','out'); end if;
  select count(*) into n from public.ajf_circ;
  select coalesce(jsonb_agg(r), '[]'::jsonb) into res from (
    select id, title, tags, lang, cdate as cd, at, file_name, file_size, pages, by_name, (file_path is not null) as has_file, left(body || ' ' || ftext, 400) as txt
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
  select to_jsonb(x) into r from (select id, title, tags, body, ftext, lang, cdate as cd, at, file_name, file_size, pages, by_name, (file_path is not null) as has_file from public.ajf_circ where id = p_id) x;
  return jsonb_build_object('s','ok','row',r);
end $$;

-- حفظ (إضافة أو تعديل) — للمشرف فقط
create or replace function public.ajf_circ_save(p_token text, p_device text, p jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me jsonb;
begin
  me := public.ajf_circ_me(p_token, p_device);
  if me is null then return jsonb_build_object('s','out'); end if;
  if not coalesce((me->>'admin')::boolean, false) then return jsonb_build_object('s','denied'); end if;
  if coalesce(p->>'id','') !~ '^[a-z0-9_-]{4,40}$' or coalesce(p->>'title','') = '' then return jsonb_build_object('s','bad'); end if;
  if length(coalesce(p->>'ftext','')) > 2000000 or length(coalesce(p->>'body','')) > 200000 then return jsonb_build_object('s','big'); end if;
  insert into public.ajf_circ(id,title,tags,body,ftext,ntext,ktext,lang,cdate,file_path,file_name,file_size,pages,by_emp,by_name)
  values (p->>'id', left(p->>'title',200), left(coalesce(p->>'tags',''),1000), coalesce(p->>'body',''), coalesce(p->>'ftext',''),
          coalesce(p->>'ntext',''), coalesce(p->>'ktext',''), coalesce(p->>'lang',''), nullif(p->>'cdate','')::date,
          nullif(p->>'file_path',''), nullif(p->>'file_name',''), nullif(p->>'file_size','')::int, nullif(p->>'pages','')::int, me->>'emp', me->>'name')
  on conflict (id) do update set title=excluded.title, tags=excluded.tags, body=excluded.body,
    ftext = case when p ? 'ftext' then excluded.ftext else public.ajf_circ.ftext end,
    ntext=excluded.ntext, ktext=excluded.ktext, lang=excluded.lang, cdate=excluded.cdate,
    file_path = coalesce(excluded.file_path, public.ajf_circ.file_path), file_name = coalesce(excluded.file_name, public.ajf_circ.file_name),
    file_size = coalesce(excluded.file_size, public.ajf_circ.file_size), pages = coalesce(excluded.pages, public.ajf_circ.pages);
  return jsonb_build_object('s','ok');
end $$;

create or replace function public.ajf_circ_del(p_token text, p_device text, p_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me jsonb; fp text;
begin
  me := public.ajf_circ_me(p_token, p_device);
  if me is null then return jsonb_build_object('s','out'); end if;
  if not coalesce((me->>'admin')::boolean, false) then return jsonb_build_object('s','denied'); end if;
  delete from public.ajf_circ where id = p_id returning file_path into fp;
  return jsonb_build_object('s','ok','file_path',fp);
end $$;

revoke all on function public.ajf_circ_me(text,text) from public, anon, authenticated;
revoke all on function public.ajf_circ_search(text,text,jsonb,int), public.ajf_circ_list(text,text,int,int), public.ajf_circ_get(text,text,text),
  public.ajf_circ_save(text,text,jsonb), public.ajf_circ_del(text,text,text) from public, anon, authenticated;
grant execute on function public.ajf_circ_search(text,text,jsonb,int), public.ajf_circ_list(text,text,int,int), public.ajf_circ_get(text,text,text),
  public.ajf_circ_save(text,text,jsonb), public.ajf_circ_del(text,text,text) to anon, authenticated;
