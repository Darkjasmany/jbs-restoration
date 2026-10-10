-- Datos oficiales confirmados por el cliente el 10 de octubre de 2026
-- (Cuestionario_JBS_Restoration__Respuestas_.docx). site_config es la tabla de
-- configuración editable desde /admin/settings; esta migración solo la deja
-- precargada para no depender de que alguien la escriba a mano en el panel.
--
-- Pendiente del cliente, todavía NO se carga aquí porque no fue entregado:
--   - Video o foto de fondo del hero (hero_type queda en 'image' sin
--     hero_poster_url hasta que llegue una foto; el hero se ve sin imagen
--     de fondo, solo el degradado oscuro, hasta ese momento)
--   - Dirección física (la respondió en blanco)
--   - Logo y colores de marca ya se aplicaron por separado en tailwind.config.mjs
--   - Texto de "Sobre nosotros" (solo confirmó que trabajan con seguros;
--     el resto de las preguntas quedaron sin responder)

update site_config set
  company_name      = 'JBS Restoration',
  hero_type          = 'image',
  hero_title         = 'The Difference Is in The Details',
  hero_subtitle      = 'Professional Roofing, Siding and Restoration Services. Building Confidence Into Every Project.',
  hero_cta_label     = 'Get a Free Estimate',
  phone              = '+1 (917) 539-9904',
  email              = 'info@jbsrestoration.com',
  whatsapp_number    = '19175399904',
  whatsapp_messages  = '[
    {"label": "Free Estimate", "text": "Hi! I''d like a free estimate, please."},
    {"label": "Schedule Inspection", "text": "Hi! I''d like to schedule a roof inspection."},
    {"label": "Renovation Services", "text": "Hi! I''m interested in your renovation services"}
  ]'::jsonb,
  service_areas      = array['Connecticut'],
  social_links       = jsonb_build_object(
    'facebook', 'https://www.facebook.com/share/14qih2KN1wE/?mibextid=wwXIfr',
    'instagram', 'https://www.instagram.com/jbsrestoration?vrfl=MTE2NHp3cW5ib2w2eA=='
  )
where id = 1;
