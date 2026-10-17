import type { ZodError } from "zod";

/**
 * Helper para responder objetos JSON estandarizados en API Routes
 */
export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

/**
 * Helper para formatear errores de validación de Zod (422)
 */
export const validationError = (error: ZodError) =>
  json(
    {
      error: "Validation failed",
      issues: error.issues.map((i) => ({ path: i.path, message: i.message })),
    },
    422,
  );

/**
 * Ocultar el código de país y el prefijo de EEUU (ej. "+1 (917) 539-9904" → "(917) 539-9904"). El enlace tel: sigue usando el número completo.
 */
export const displayPhone = (phone: string) => {
  if (!phone) return null;
  return phone.replace(/^\+?1[\s-]*/, "").trim();
};

/**
 * Convierte un número telefónico en un enlace ejecutable 'tel:'
 */
export const toTel = (phone: string | null | undefined) => {
  if (!phone) return null;
  const cleaned = phone.replace(/[^\d+]/g, "");
  return cleaned ? `tel:${cleaned}` : null;
};

/** Resume una lista larga de ciudades ("16 towns across Connecticut") en vez de listarlas todas en una sola línea. */
export const summarizeAreas = (
  areas: string[],
  region = "Connecticut",
  max = 3,
) =>
  areas.length === 0
    ? ""
    : areas.length <= max
      ? areas.join(", ")
      : `${areas.length} towns across ${region}`;

/**
 * Normaliza textos para convertirlos en URLs amigables (slugs)
 */
export const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

/**
 * Nombre legible de un servicio a partir de su slug.
 *
 * `projects.service_type` guarda el slug del servicio (texto libre, sin FK), de
 * modo que las tarjetas y el detalle de un proyecto no pueden depender del
 * catálogo de la base de datos. Este helper embellece el slug
 * ("residential-roofing" → "Residential Roofing") y sirve de respaldo aunque el
 * servicio ya no exista.
 */
export const serviceName = (slug: string) =>
  slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

/**
 * Obtener fecha actual
 */
export const yearNow = () => {
  return new Date().getFullYear();
};

/**
 * Extrae y filtra los enlaces a redes sociales que contengan URLs válidas (http/https).
 */
export const getActiveSocialLinks = (
  socialLinks: Record<string, string> | null | undefined,
): [string, string][] => {
  if (!socialLinks) return [];

  return Object.entries(socialLinks).filter(
    ([, url]) => typeof url === "string" && /^https?:\/\//.test(url),
  );
};
