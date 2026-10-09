export type ServiceFaq = { q: string; a: string };

export type Service = {
  slug: string;
  name: string;
  short: string;
  intro: string;
  includes: string[];
  signs: string[];
  faqs: ServiceFaq[];
};

export const SERVICES: Service[] = [
  {
    slug: "roofing",
    name: "Roofing",
    short:
      "Professional roofing services for residential properties, including roof installation, replacement, repairs, and maintenance.",
    intro:
      "Professional roofing services for residential properties, including roof installation, replacement, repairs, and maintenance.",
    includes: [],
    signs: [],
    faqs: [],
  },
  {
    slug: "gutters",
    name: "Gutters",
    short:
      "Complete gutter installation and replacement to help protect your home from water damage and improve proper drainage.",
    intro:
      "Complete gutter installation and replacement to help protect your home from water damage and improve proper drainage.",
    includes: [],
    signs: [],
    faqs: [],
  },
  {
    slug: "carpentry",
    name: "Carpentry",
    short:
      "Quality carpentry work for exterior and structural projects, repairs, and improvements.",
    intro:
      "Quality carpentry work for exterior and structural projects, repairs, and improvements.",
    includes: [],
    signs: [],
    faqs: [],
  },
  {
    slug: "windows",
    name: "Windows",
    short:
      "Window installation and replacement to improve your home's appearance, comfort, and energy efficiency.",
    intro:
      "Window installation and replacement to improve your home's appearance, comfort, and energy efficiency.",
    includes: [],
    signs: [],
    faqs: [],
  },
  {
    slug: "metal-roofing",
    name: "Metal Roofing",
    short:
      "Durable and modern metal roofing solutions designed for long-lasting performance and a clean, finished look.",
    intro:
      "Durable and modern metal roofing solutions designed for long-lasting performance and a clean, finished look.",
    includes: [],
    signs: [],
    faqs: [],
  },
  {
    slug: "flat-roofing",
    name: "Flat Roofing",
    short:
      "Professional installation, replacement, and repair of flat roofing systems for residential and commercial properties.",
    intro:
      "Professional installation, replacement, and repair of flat roofing systems for residential and commercial properties.",
    includes: [],
    signs: [],
    faqs: [],
  },
  {
    slug: "remodeling",
    name: "Interior & Exterior Remodeling",
    short:
      "Home remodeling services for both interior and exterior spaces, including renovations, improvements, and finishing work.",
    intro:
      "Home remodeling services for both interior and exterior spaces, including renovations, improvements, and finishing work.",
    includes: [],
    signs: [],
    faqs: [],
  },
  {
    slug: "insurance-claims",
    name: "Insurance Claims Assistance",
    short:
      "Expert claim support: we help homeowners navigate the insurance claim process from inspection to restoration.",
    intro:
      "We help homeowners navigate the insurance claim process from inspection to restoration. Our team works closely with homeowners and insurance representatives to document property damage, prepare detailed estimates, communicate with the insurance company, and help ensure the necessary repairs are properly addressed.",
    includes: [],
    signs: [],
    faqs: [],
  },
];

export const SERVICE_OPTIONS: [string, string][] = SERVICES.map((s) => [
  s.slug,
  s.name,
]);

export const getService = (slug: string) =>
  SERVICES.find((s) => s.slug === slug);
export const serviceName = (slug: string) =>
  getService(slug)?.name ?? slug.replace(/-/g, " ");
