export type ServiceFaq = { q: string; a: string };

export type Service = {
  slug: string;
  name: string;
  /** Texto corto del cliente, usado en tarjetas y meta description. */
  short: string;
  /** Mismo texto (o una versión ligeramente ampliada), usado como párrafo principal de la página de detalle. */
  intro: string;
  /** Opcional: solo se muestra si el cliente llega a entregar esta lista más adelante. */
  includes: string[];
  /** Opcional: ídem. */
  signs: string[];
  /** Opcional: ídem. */
  faqs: ServiceFaq[];
};

/**
 * Contenido confirmado por el cliente (10 oct 2026, Cuestionario_JBS_Restoration__Respuestas_.docx).
 * Son descripciones breves, sin "qué incluye", "señales de alerta" ni preguntas frecuentes por
 * servicio — el cliente confirmó que no tiene más contenido por ahora. Esos campos quedan vacíos
 * a propósito (ver services/[slug].astro: cada sección opcional solo se renderiza si trae datos)
 * en lugar de inventar texto que el cliente no aprobó.
 *
 * "Gutters" se retiró de la lista de 8 servicios de la primera entrega: el cliente confirmó
 * solo estos 7 como servicios autorizados.
 */
export const SERVICES: Service[] = [
  {
    slug: 'roofing',
    name: 'Roofing',
    short: 'Professional roofing services for residential properties, including roof installation, replacement, repairs, and maintenance.',
    intro: 'Professional roofing services for residential properties, including roof installation, replacement, repairs, and maintenance.',
    includes: [],
    signs: [],
    faqs: [],
  },
  {
    slug: 'carpentry',
    name: 'Carpentry',
    short: 'Quality carpentry work for exterior and structural projects, repairs, and improvements.',
    intro: 'Quality carpentry work for exterior and structural projects, repairs, and improvements.',
    includes: [],
    signs: [],
    faqs: [],
  },
  {
    slug: 'windows',
    name: 'Windows',
    short: "Window installation and replacement to improve your home's appearance, comfort, and energy efficiency.",
    intro: "Window installation and replacement to improve your home's appearance, comfort, and energy efficiency.",
    includes: [],
    signs: [],
    faqs: [],
  },
  {
    slug: 'metal-roofing',
    name: 'Metal Roofing',
    short: 'Durable and modern metal roofing solutions designed for long-lasting performance and a clean, finished look.',
    intro: 'Durable and modern metal roofing solutions designed for long-lasting performance and a clean, finished look.',
    includes: [],
    signs: [],
    faqs: [],
  },
  {
    slug: 'flat-roofing',
    name: 'Flat Roofing',
    short: 'Professional installation, replacement, and repair of flat roofing systems for residential and commercial properties.',
    intro: 'Professional installation, replacement, and repair of flat roofing systems for residential and commercial properties.',
    includes: [],
    signs: [],
    faqs: [],
  },
  {
    slug: 'remodeling',
    name: 'Interior & Exterior Remodeling',
    short: 'Home remodeling services for both interior and exterior spaces, including renovations, improvements, and finishing work.',
    intro: 'Home remodeling services for both interior and exterior spaces, including renovations, improvements, and finishing work.',
    includes: [],
    signs: [],
    faqs: [],
  },
  {
    slug: 'insurance-claims',
    name: 'Insurance Claims Assistance',
    short: 'Expert claim support: we help homeowners navigate the insurance claim process from inspection to restoration.',
    intro:
      'We help homeowners navigate the insurance claim process from inspection to restoration. Our team works closely with homeowners and insurance representatives to document property damage, prepare detailed estimates, communicate with the insurance company, and help ensure the necessary repairs are properly addressed.',
    includes: [],
    signs: [],
    faqs: [],
  },
];

export const SERVICE_OPTIONS: [string, string][] = SERVICES.map((s) => [s.slug, s.name]);

export const getService = (slug: string) => SERVICES.find((s) => s.slug === slug);
export const serviceName = (slug: string) => getService(slug)?.name ?? slug.replace(/-/g, ' ');
