create extension if not exists "pgcrypto";

create type project_status as enum ('draft', 'published');
create type media_type     as enum ('image', 'video');
create type media_role     as enum ('gallery', 'before', 'after', 'cover');
create type hero_media_type as enum ('video', 'image');
create type lead_status    as enum ('new', 'contacted', 'quoted', 'won', 'lost');

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create table admin_users (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  created_at timestamptz not null default now()
);

create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from admin_users where user_id = auth.uid());
$$;

create table projects (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  title          text not null,
  description    text,
  service_type   text not null default 'roof-replacement',
  city           text,
  state          char(2),
  roof_material  text,
  completed_on   date,
  is_featured    boolean not null default false,
  status         project_status not null default 'draft',
  sort_order     integer not null default 0,
  seo_title      text,
  seo_description text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index projects_status_sort_idx on projects (status, sort_order, completed_on desc);
create index projects_featured_idx    on projects (is_featured) where is_featured;
create trigger projects_updated_at before update on projects
  for each row execute function set_updated_at();

create table project_media (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references projects(id) on delete cascade,
  type          media_type not null default 'image',
  role          media_role not null default 'gallery',
  storage_path  text not null,
  url           text not null,
  alt_text      text,
  width         integer,
  height        integer,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now()
);

create index project_media_project_idx on project_media (project_id, sort_order);
create unique index project_media_one_cover_idx
  on project_media (project_id) where role = 'cover';

create table testimonials (
  id           uuid primary key default gen_random_uuid(),
  author_name  text not null,
  author_city  text,
  rating       smallint not null default 5 check (rating between 1 and 5),
  content      text not null,
  project_id   uuid references projects(id) on delete set null,
  avatar_url   text,
  is_published boolean not null default true,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index testimonials_published_idx on testimonials (is_published, sort_order);
create trigger testimonials_updated_at before update on testimonials
  for each row execute function set_updated_at();

create table site_config (
  id                  smallint primary key default 1 check (id = 1),
  company_name        text not null default 'JBS Restoration',
  tagline             text,
  hero_type           hero_media_type not null default 'video',
  hero_video_url      text,
  hero_video_path     text,
  hero_poster_url     text,
  hero_poster_path    text,
  hero_title          text not null default 'Roofing You Can Trust',
  hero_subtitle       text,
  hero_cta_label      text not null default 'Get a Free Estimate',
  phone               text,
  email               text,
  whatsapp_number     text,
  whatsapp_messages   jsonb not null default '[
    {"label":"Free estimate","text":"Hi! I would like a free roof estimate."},
    {"label":"Roof repair","text":"Hi! I need a roof repair."},
    {"label":"Storm damage","text":"Hi! My roof has storm damage."}
  ]'::jsonb,
  address             text,
  service_areas       text[] not null default '{}',
  social_links        jsonb not null default '{}'::jsonb,
  updated_at          timestamptz not null default now()
);

insert into site_config (id) values (1);
create trigger site_config_updated_at before update on site_config
  for each row execute function set_updated_at();

create table leads (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text,
  phone       text,
  service     text,
  message     text,
  status      lead_status not null default 'new',
  source      text not null default 'contact_form',
  created_at  timestamptz not null default now()
);

create index leads_status_idx on leads (status, created_at desc);

alter table admin_users   enable row level security;
alter table projects      enable row level security;
alter table project_media enable row level security;
alter table testimonials  enable row level security;
alter table site_config   enable row level security;
alter table leads         enable row level security;

create policy "admin_users_self_read" on admin_users
  for select to authenticated using (user_id = auth.uid());

create policy "projects_public_read" on projects
  for select to anon, authenticated using (status = 'published' or is_admin());
create policy "projects_admin_write" on projects
  for all to authenticated using (is_admin()) with check (is_admin());

create policy "project_media_public_read" on project_media
  for select to anon, authenticated using (
    is_admin() or exists (
      select 1 from projects p where p.id = project_id and p.status = 'published'
    )
  );
create policy "project_media_admin_write" on project_media
  for all to authenticated using (is_admin()) with check (is_admin());

create policy "testimonials_public_read" on testimonials
  for select to anon, authenticated using (is_published or is_admin());
create policy "testimonials_admin_write" on testimonials
  for all to authenticated using (is_admin()) with check (is_admin());

create policy "site_config_public_read" on site_config
  for select to anon, authenticated using (true);
create policy "site_config_admin_write" on site_config
  for update to authenticated using (is_admin()) with check (is_admin());

create policy "leads_public_insert" on leads
  for insert to anon, authenticated with check (true);
create policy "leads_admin_all" on leads
  for all to authenticated using (is_admin()) with check (is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('projects', 'projects', true, 10485760,
    array['image/jpeg','image/png','image/webp','image/avif']),
  ('site', 'site', true, 104857600,
    array['video/mp4','video/webm','image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "storage_public_read" on storage.objects
  for select to anon, authenticated using (bucket_id in ('projects','site'));

create policy "storage_admin_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('projects','site') and is_admin());

create policy "storage_admin_update" on storage.objects
  for update to authenticated
  using (bucket_id in ('projects','site') and is_admin());

create policy "storage_admin_delete" on storage.objects
  for delete to authenticated
  using (bucket_id in ('projects','site') and is_admin());
