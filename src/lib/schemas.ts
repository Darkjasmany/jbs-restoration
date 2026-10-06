import { z } from 'zod';
import { SERVICES } from './services';

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or fewer`)
    .nullish()
    .transform((v) => v || null);

const dimension = z
  .number()
  .int()
  .positive()
  .max(20000)
  .nullish()
  .transform((v) => v ?? null);

export const mediaSchema = z.object({
  type: z.enum(['image', 'video']),
  role: z.enum(['gallery', 'before', 'after', 'cover']),
  storage_path: z.string().min(3).max(300),
  url: z.string().url().max(1000),
  alt_text: text(200),
  width: dimension,
  height: dimension,
});

export const projectSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string().trim().min(3, 'Title must be at least 3 characters').max(140),
    description: text(5000),
    service_type: z.string().trim().min(1, 'Choose a service').max(60),
    city: text(80),
    state: text(2).transform((v) => v?.toUpperCase() ?? null),
    roof_material: text(60),
    completed_on: text(10).refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), 'Invalid date'),
    is_featured: z.boolean(),
    status: z.enum(['draft', 'published']),
    seo_title: text(70),
    seo_description: text(200),
    media: z.array(mediaSchema).max(60, 'Up to 60 files per project'),
  })
  .superRefine((p, ctx) => {
    p.media.forEach((m, i) => {
      if (!m.storage_path.startsWith(`${p.id}/`)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['media', i, 'storage_path'], message: 'Invalid file path' });
      }
    });
    if (p.media.filter((m) => m.role === 'cover').length > 1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['media'], message: 'Only one cover image is allowed' });
    }
    if (p.status === 'published' && !p.media.some((m) => m.type === 'image')) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['media'], message: 'Add at least one photo before publishing' });
    }
  });

const nullableUrl = z.string().url().max(1000).nullable();
const nullablePath = z.string().max(300).nullable();

export const siteConfigSchema = z
  .object({
    hero_type: z.enum(['video', 'image']),
    hero_video_url: nullableUrl,
    hero_video_path: nullablePath,
    hero_poster_url: nullableUrl,
    hero_poster_path: nullablePath,
    hero_title: z.string().trim().min(3, 'Headline must be at least 3 characters').max(120),
    hero_subtitle: text(300),
    hero_cta_label: z.string().trim().min(2, 'Button text is too short').max(40),
    phone: text(30),
    whatsapp_number: text(15).refine((v) => v === null || /^\d{10,15}$/.test(v), 'Use digits only, with country code (e.g. 15551234567)'),
    whatsapp_messages: z
      .array(
        z.object({
          label: z.string().trim().min(1, 'Every quick reply needs a label').max(40),
          text: z.string().trim().min(1, 'Every quick reply needs a message').max(300),
        }),
      )
      .max(6, 'Up to 6 quick replies'),
  })
  .superRefine((c, ctx) => {
    for (const key of ['hero_video_path', 'hero_poster_path'] as const) {
      const v = c[key];
      if (v && !v.startsWith('hero/')) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: 'Invalid file path' });
      }
    }
    if (c.hero_type === 'video' && !c.hero_video_url) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['hero_video_url'], message: 'Upload a video or switch the hero to image mode' });
    }
    if (c.hero_type === 'image' && !c.hero_poster_url) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['hero_poster_url'], message: 'Upload an image for the hero' });
    }
  });

export type ProjectPayload = z.input<typeof projectSchema>;
export type SiteConfigPayload = z.input<typeof siteConfigSchema>;

export const testimonialSchema = z.object({
  id: z.string().uuid().optional(),
  author_name: z.string().trim().min(2, 'Name is too short').max(80),
  author_city: text(80),
  rating: z.number().int().min(1).max(5),
  content: z.string().trim().min(10, 'The testimonial is too short').max(1500),
  project_id: z.string().uuid().nullish().transform((v) => v ?? null),
  is_published: z.boolean(),
  sort_order: z.number().int().min(0).max(9999),
});

export const reorderMediaSchema = z.object({
  project_id: z.string().uuid(),
  ids: z.array(z.string().uuid()).min(1).max(60),
});

export const contactSchema = z
  .object({
    name: z.string().trim().min(2, 'Please enter your name').max(100),
    email: z.string().trim().email('Enter a valid email').max(160).or(z.literal('')).nullish().transform((v) => v || null),
    phone: z
      .string()
      .trim()
      .max(30)
      .refine((v) => v === '' || v.replace(/\D/g, '').length >= 7, 'Enter a valid phone number')
      .nullish()
      .transform((v) => v || null),
    service: z
      .string()
      .refine((v) => v === '' || v === 'other' || SERVICES.some((s) => s.slug === v), 'Choose a valid service')
      .nullish()
      .transform((v) => v || null),
    message: text(2000),
    website: z.string().max(200).optional(),
    startedAt: z.number().optional(),
  })
  .refine((c) => c.email || c.phone, { path: ['phone'], message: 'Add a phone number or an email so we can reach you' });

export type TestimonialPayload = z.input<typeof testimonialSchema>;
export type ContactPayload = z.input<typeof contactSchema>;
