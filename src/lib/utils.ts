import type { ZodError } from "zod";

export const json = (data: unknown, status = 200) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
};

export const validationError = (error: ZodError) => {
  return json(
    {
      error: "Validation failed",
      issues: error.issues.map((i) => ({ path: i.path, message: i.message })),
    },
    422,
  );
};

export const slugify = (value: string) => {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
};

export const toTel = (phone: string | null | undefined) => {
  if (!phone) return null;
  const cleaned = phone.replace(/[^\d+]/g, "");
  return cleaned ? `tel:${cleaned}` : null;
};
