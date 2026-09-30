-- Reemplazo atómico de la media de un proyecto (una sola transacción, RLS aplica: security invoker)
create or replace function replace_project_media(p_project_id uuid, p_media jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  delete from project_media where project_id = p_project_id;

  insert into project_media (project_id, type, role, storage_path, url, alt_text, width, height, sort_order)
  select
    p_project_id,
    (m->>'type')::media_type,
    (m->>'role')::media_role,
    m->>'storage_path',
    m->>'url',
    nullif(m->>'alt_text', ''),
    nullif(m->>'width', '')::int,
    nullif(m->>'height', '')::int,
    (ord - 1)::int
  from jsonb_array_elements(p_media) with ordinality as t(m, ord);
end;
$$;

revoke execute on function replace_project_media(uuid, jsonb) from public, anon;
grant  execute on function replace_project_media(uuid, jsonb) to authenticated;

-- La galería de proyectos admite video además de imágenes
update storage.buckets
set file_size_limit = 52428800,
    allowed_mime_types = array['image/jpeg','image/png','image/webp','image/avif','video/mp4','video/webm']
where id = 'projects';
