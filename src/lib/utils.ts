import type { ZodError } from "zod";

/**
 * Helper para responder objetos JSON estandarizados en API Routes
 */
export const json = (data: unknown, status = 200) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
};

/**
 * Helper para formatear errores de validación de Zod (422)
 */
export const validationError = (error: ZodError) => {
  return json(
    {
      error: "Validation failed",
      issues: error.issues.map((i) => ({ path: i.path, message: i.message })),
    },
    422,
  );
};

/**
 * Normaliza textos para convertirlos en URLs amigables (slugs)
 */
export const slugify = (value: string) => {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
};

/**
 * Convierte un número telefónico en un enlace ejecutable 'tel:'
 */
export const toTel = (phone: string | null | undefined) => {
  if (!phone) return null;
  const cleaned = phone.replace(/[^\d+]/g, "");
  return cleaned ? `tel:${cleaned}` : null;
};

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
