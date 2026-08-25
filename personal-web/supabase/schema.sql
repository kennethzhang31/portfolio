-- Run this file once in Supabase Dashboard → SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('work', 'projects', 'reviews', 'media')),
  title text not null,
  date_label text,
  start_date date,
  end_date date,
  is_ongoing boolean not null default false,
  published_date date,
  location text,
  description text not null default '',
  tags text[] not null default '{}',
  external_url text,
  image_url text,
  sort_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Upgrade an existing installation created from an earlier version of this file.
alter table public.portfolio_items
  add column if not exists start_date date,
  add column if not exists end_date date,
  add column if not exists is_ongoing boolean not null default false,
  add column if not exists published_date date;

-- Tag groups define the taxonomy and which portfolio sections use each group.
create table if not exists public.tag_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  applies_to text[] not null default '{}',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint tag_groups_valid_categories check (
    applies_to <@ array['work', 'projects', 'reviews', 'media']::text[]
  )
);

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.tag_groups(id) on delete cascade,
  name text not null,
  slug text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (group_id, slug)
);

create table if not exists public.portfolio_item_tags (
  portfolio_item_id uuid not null references public.portfolio_items(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (portfolio_item_id, tag_id)
);

create or replace function public.set_updated_at()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists portfolio_items_set_updated_at on public.portfolio_items;
create trigger portfolio_items_set_updated_at
before update on public.portfolio_items
for each row execute function public.set_updated_at();

alter table public.portfolio_items enable row level security;
alter table public.tag_groups enable row level security;
alter table public.tags enable row level security;
alter table public.portfolio_item_tags enable row level security;

drop policy if exists "Published portfolio items are public" on public.portfolio_items;
create policy "Published portfolio items are public"
on public.portfolio_items for select
to anon
using (published = true);

drop policy if exists "Authenticated owner can read all items" on public.portfolio_items;
create policy "Authenticated owner can read all items"
on public.portfolio_items for select
to authenticated
using (true);

drop policy if exists "Authenticated owner can insert items" on public.portfolio_items;
create policy "Authenticated owner can insert items"
on public.portfolio_items for insert
to authenticated
with check (true);

drop policy if exists "Authenticated owner can update items" on public.portfolio_items;
create policy "Authenticated owner can update items"
on public.portfolio_items for update
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated owner can delete items" on public.portfolio_items;
create policy "Authenticated owner can delete items"
on public.portfolio_items for delete
to authenticated
using (true);

-- Taxonomy names are safe for public reading. Only authenticated users can edit.
drop policy if exists "Tag groups are publicly readable" on public.tag_groups;
create policy "Tag groups are publicly readable"
on public.tag_groups for select
to public
using (true);

drop policy if exists "Authenticated owner can insert tag groups" on public.tag_groups;
create policy "Authenticated owner can insert tag groups"
on public.tag_groups for insert to authenticated with check (true);

drop policy if exists "Authenticated owner can update tag groups" on public.tag_groups;
create policy "Authenticated owner can update tag groups"
on public.tag_groups for update to authenticated using (true) with check (true);

drop policy if exists "Authenticated owner can delete tag groups" on public.tag_groups;
create policy "Authenticated owner can delete tag groups"
on public.tag_groups for delete to authenticated using (true);

drop policy if exists "Tags are publicly readable" on public.tags;
create policy "Tags are publicly readable"
on public.tags for select to public using (true);

drop policy if exists "Authenticated owner can insert tags" on public.tags;
create policy "Authenticated owner can insert tags"
on public.tags for insert to authenticated with check (true);

drop policy if exists "Authenticated owner can update tags" on public.tags;
create policy "Authenticated owner can update tags"
on public.tags for update to authenticated using (true) with check (true);

drop policy if exists "Authenticated owner can delete tags" on public.tags;
create policy "Authenticated owner can delete tags"
on public.tags for delete to authenticated using (true);

drop policy if exists "Published item tag links are publicly readable" on public.portfolio_item_tags;
create policy "Published item tag links are publicly readable"
on public.portfolio_item_tags for select
to anon
using (
  exists (
    select 1 from public.portfolio_items
    where portfolio_items.id = portfolio_item_tags.portfolio_item_id
      and portfolio_items.published = true
  )
);

drop policy if exists "Authenticated owner can read all item tag links" on public.portfolio_item_tags;
create policy "Authenticated owner can read all item tag links"
on public.portfolio_item_tags for select to authenticated using (true);

drop policy if exists "Authenticated owner can insert item tag links" on public.portfolio_item_tags;
create policy "Authenticated owner can insert item tag links"
on public.portfolio_item_tags for insert to authenticated with check (true);

drop policy if exists "Authenticated owner can delete item tag links" on public.portfolio_item_tags;
create policy "Authenticated owner can delete item tag links"
on public.portfolio_item_tags for delete to authenticated using (true);

insert into storage.buckets (id, name, public)
values ('portfolio-media', 'portfolio-media', true)
on conflict (id) do update set public = true;

drop policy if exists "Portfolio media is publicly readable" on storage.objects;
create policy "Portfolio media is publicly readable"
on storage.objects for select
to public
using (bucket_id = 'portfolio-media');

drop policy if exists "Authenticated owner can upload portfolio media" on storage.objects;
create policy "Authenticated owner can upload portfolio media"
on storage.objects for insert
to authenticated
with check (bucket_id = 'portfolio-media');

drop policy if exists "Authenticated owner can update portfolio media" on storage.objects;
create policy "Authenticated owner can update portfolio media"
on storage.objects for update
to authenticated
using (bucket_id = 'portfolio-media');

drop policy if exists "Authenticated owner can delete portfolio media" on storage.objects;
create policy "Authenticated owner can delete portfolio media"
on storage.objects for delete
to authenticated
using (bucket_id = 'portfolio-media');

create index if not exists portfolio_items_category_order_idx
on public.portfolio_items (category, sort_order, created_at);

create index if not exists portfolio_items_work_date_idx
on public.portfolio_items (category, sort_order, start_date desc)
where category = 'work';

create index if not exists portfolio_items_published_date_idx
on public.portfolio_items (category, sort_order, published_date desc)
where category in ('projects', 'reviews', 'media');

create index if not exists tags_group_order_idx
on public.tags (group_id, sort_order, name);

create index if not exists portfolio_item_tags_tag_idx
on public.portfolio_item_tags (tag_id, portfolio_item_id);

-- Starter groups. Re-running this schema updates their labels and applicability.
insert into public.tag_groups (name, slug, applies_to, sort_order) values
  ('Technology', 'technology', array['work', 'projects'], 10),
  ('Topic / Domain', 'topic', array['work', 'projects', 'media'], 20),
  ('Media Type', 'media-type', array['reviews', 'media'], 30),
  ('Literary / Screen Genre', 'literary-screen-genre', array['reviews'], 40),
  ('Music Genre', 'music-genre', array['reviews'], 50),
  ('Content Format', 'content-format', array['media'], 60),
  ('Experience Type', 'experience-type', array['work'], 70),
  ('Project Stage', 'project-stage', array['projects'], 80)
on conflict (slug) do update set
  name = excluded.name,
  applies_to = excluded.applies_to,
  sort_order = excluded.sort_order;

-- Starter tags. Add, rename, or remove these later in the admin interface.
with starter(group_slug, name, slug, sort_order) as (
  values
    ('technology', 'Python', 'python', 10),
    ('technology', 'PyTorch', 'pytorch', 20),
    ('technology', 'PEFT', 'peft', 30),
    ('technology', 'PostgreSQL', 'postgresql', 40),
    ('technology', 'Django', 'django', 50),
    ('topic', 'AI', 'ai', 10),
    ('topic', 'Agents', 'agents', 20),
    ('topic', 'RAG', 'rag', 30),
    ('topic', 'NLP', 'nlp', 40),
    ('topic', 'Computer Vision', 'computer-vision', 50),
    ('topic', 'Multimodal', 'multimodal', 60),
    ('media-type', 'Book', 'book', 10),
    ('media-type', 'Film', 'film', 20),
    ('media-type', 'TV Series', 'tv-series', 30),
    ('media-type', 'Album', 'album', 40),
    ('literary-screen-genre', 'Action', 'action', 10),
    ('literary-screen-genre', 'Horror', 'horror', 20),
    ('literary-screen-genre', 'Fantasy', 'fantasy', 30),
    ('literary-screen-genre', 'Science Fiction', 'science-fiction', 40),
    ('music-genre', 'Indie', 'indie', 10),
    ('music-genre', 'Metal', 'metal', 20),
    ('music-genre', 'Pop', 'pop', 30),
    ('music-genre', 'Rock', 'rock', 40),
    ('content-format', 'Talk', 'talk', 10),
    ('content-format', 'Article', 'article', 20),
    ('content-format', 'Demo', 'demo', 30),
    ('content-format', 'Paper', 'paper', 40),
    ('experience-type', 'Internship', 'internship', 10),
    ('experience-type', 'Research', 'research', 20),
    ('experience-type', 'Teaching', 'teaching', 30),
    ('experience-type', 'Employment', 'employment', 40),
    ('project-stage', 'Production', 'production', 10),
    ('project-stage', 'Research', 'research', 20),
    ('project-stage', 'Prototype', 'prototype', 30),
    ('project-stage', 'Open Source', 'open-source', 40)
)
insert into public.tags (group_id, name, slug, sort_order)
select tag_groups.id, starter.name, starter.slug, starter.sort_order
from starter
join public.tag_groups on tag_groups.slug = starter.group_slug
on conflict (group_id, slug) do update set
  name = excluded.name,
  sort_order = excluded.sort_order;
