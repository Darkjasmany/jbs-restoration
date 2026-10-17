-- 005: migración del catálogo estático (src/lib/services.ts) a la tabla `services`,
-- y remapeo de los slugs de `projects.service_type` / `leads.service`.
--
-- Idempotente: `on conflict (slug) do nothing` no pisa ediciones hechas desde el
-- panel, y los UPDATE solo coinciden con los slugs antiguos (una segunda pasada
-- no cambia nada). Ejecutar SIEMPRE después de 004_services.sql.
--
-- Catálogo fusionado (mapa aprobado):
--   Residential Roofing  <- Roofing + Metal Roofing + Flat Roofing
--   Insurance Restoration <- Insurance Claims Assistance
--   Interior Restoration  <- Interior & Exterior Remodeling
--   + Siding y Interior & Exterior Painting (nuevos, como borrador)
--   + Carpentry y Windows (se conservan)
-- El texto de las absorbidas se conserva dentro de `includes` de la fila
-- superviviente (no se inventa contenido); la cliente lo revisa en el panel.

insert into services
  (slug, name, short_description, description, includes, is_published, is_featured, sort_order)
values
  (
    'residential-roofing',
    'Residential Roofing',
    'Professional roofing services for residential properties, including roof installation, replacement, repairs, and maintenance.',
    'Professional roofing services for residential properties, including roof installation, replacement, repairs, and maintenance.',
    jsonb_build_array(
      'Durable and modern metal roofing solutions designed for long-lasting performance and a clean, finished look.',
      'Professional installation, replacement, and repair of flat roofing systems for residential and commercial properties.'
    ),
    true, true, 1
  ),
  (
    'siding',
    'Siding',
    null,
    null,
    '[]'::jsonb,
    false, true, 2
  ),
  (
    'insurance-restoration',
    'Insurance Restoration',
    'Expert claim support: we help homeowners navigate the insurance claim process from inspection to restoration.',
    'We help homeowners navigate the insurance claim process from inspection to restoration. Our team works closely with homeowners and insurance representatives to document property damage, prepare detailed estimates, communicate with the insurance company, and help ensure the necessary repairs are properly addressed.',
    '[]'::jsonb,
    true, true, 3
  ),
  (
    'interior-restoration',
    'Interior Restoration',
    'Home remodeling services for both interior and exterior spaces, including renovations, improvements, and finishing work.',
    'Home remodeling services for both interior and exterior spaces, including renovations, improvements, and finishing work.',
    '[]'::jsonb,
    true, true, 4
  ),
  (
    'painting',
    'Interior & Exterior Painting',
    null,
    null,
    '[]'::jsonb,
    false, true, 5
  ),
  (
    'carpentry',
    'Carpentry',
    'Quality carpentry work for exterior and structural projects, repairs, and improvements.',
    'Quality carpentry work for exterior and structural projects, repairs, and improvements.',
    '[]'::jsonb,
    true, false, 6
  ),
  (
    'windows',
    'Windows',
    'Window installation and replacement to improve your home''s appearance, comfort, and energy efficiency.',
    'Window installation and replacement to improve your home''s appearance, comfort, and energy efficiency.',
    '[]'::jsonb,
    true, false, 7
  )
on conflict (slug) do nothing;

-- Remapeo de referencias existentes en proyectos (slugs nuevos).
update projects set service_type = 'residential-roofing'
  where service_type in ('roofing', 'metal-roofing', 'flat-roofing', 'roof-replacement');
update projects set service_type = 'insurance-restoration'
  where service_type = 'insurance-claims';
update projects set service_type = 'interior-restoration'
  where service_type = 'remodeling';

-- El mismo remapeo en los leads históricos, para que los filtros/avisos sean coherentes.
update leads set service = 'residential-roofing'
  where service in ('roofing', 'metal-roofing', 'flat-roofing', 'roof-replacement');
update leads set service = 'insurance-restoration'
  where service = 'insurance-claims';
update leads set service = 'interior-restoration'
  where service = 'remodeling';

-- 'roof-replacement' ya no existe en el catálogo: el valor por defecto pasa al slug nuevo.
alter table projects alter column service_type set default 'residential-roofing';
