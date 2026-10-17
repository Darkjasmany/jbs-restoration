-- 004: catálogo dinámico de servicios.
--
-- Sigue el patrón del módulo `projects` (001_init.sql): trigger updated_at
-- reutilizado, RLS con `is_admin()` y columnas de orden/publicación.
-- `service_type` en projects sigue siendo texto (slug), NO se convierte en FK.

create table if not exists services (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  name              text not null,
  short_description text,
  description       text,
  image_url         text,
  image_path        text,
  image_alt         text,
  includes          jsonb not null default '[]'::jsonb,
  signs             jsonb not null default '[]'::jsonb,
  faqs              jsonb not null default '[]'::jsonb,
  is_published      boolean not null default false,
  is_featured       boolean not null default false,
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists services_published_idx on services (is_published, sort_order);
create index if not exists services_featured_idx  on services (is_featured) where is_featured;

drop trigger if exists services_updated_at on services;
create trigger services_updated_at before update on services
  for each row execute function set_updated_at();

alter table services enable row level security;

-- Mismas reglas que projects: el público solo ve servicios publicados; el
-- administrador ve y edita todo (is_admin() consulta admin_users).
drop policy if exists "services_public_read" on services;
create policy "services_public_read" on services
  for select to anon, authenticated using (is_published or is_admin());

drop policy if exists "services_admin_write" on services;
create policy "services_admin_write" on services
  for all to authenticated using (is_admin()) with check (is_admin());

-- Bucket propio para las imágenes de servicios (público, solo imágenes).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('services', 'services', true, 10485760,
  array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do nothing;

-- Las políticas de storage (001) estaban fijadas a ('projects','site').
-- Se amplían de forma aditiva para incluir el bucket 'services'; RLS sigue activo.
alter policy "storage_public_read" on storage.objects
  using (bucket_id in ('projects','site','services'));
alter policy "storage_admin_insert" on storage.objects
  with check (bucket_id in ('projects','site','services') and is_admin());
alter policy "storage_admin_update" on storage.objects
  using (bucket_id in ('projects','site','services') and is_admin());
alter policy "storage_admin_delete" on storage.objects
  using (bucket_id in ('projects','site','services') and is_admin());
