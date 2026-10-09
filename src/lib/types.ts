export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ProjectStatus = "draft" | "published";
export type MediaType = "image" | "video";
export type MediaRole = "gallery" | "before" | "after" | "cover";
export type HeroMediaType = "video" | "image";
export type LeadStatus = "new" | "contacted" | "quoted" | "won" | "lost";

export type AdminUser = {
  user_id: string;
  full_name: string | null;
  created_at: string;
};

export type Project = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  service_type: string;
  city: string | null;
  state: string | null;
  roof_material: string | null;
  completed_on: string | null;
  is_featured: boolean;
  status: ProjectStatus;
  sort_order: number;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectMedia = {
  id: string;
  project_id: string;
  type: MediaType;
  role: MediaRole;
  storage_path: string;
  url: string;
  alt_text: string | null;
  width: number | null;
  height: number | null;
  sort_order: number;
  created_at: string;
};

export type Testimonial = {
  id: string;
  author_name: string;
  author_city: string | null;
  rating: number;
  content: string;
  project_id: string | null;
  avatar_url: string | null;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type WhatsAppMessage = { label: string; text: string };

export type SiteConfig = {
  id: number;
  company_name: string;
  tagline: string | null;
  hero_type: HeroMediaType;
  hero_video_url: string | null;
  hero_video_path: string | null;
  hero_poster_url: string | null;
  hero_poster_path: string | null;
  hero_title: string;
  hero_subtitle: string | null;
  hero_cta_label: string;
  phone: string | null;
  email: string | null;
  whatsapp_number: string | null;
  whatsapp_messages: WhatsAppMessage[];
  address: string | null;
  service_areas: string[];
  social_links: Record<string, string>;
  updated_at: string;
};

export type Lead = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  service: string | null;
  message: string | null;
  status: LeadStatus;
  source: string;
  created_at: string;
};

export type ProjectWithMedia = Project & { project_media: ProjectMedia[] };

export type ProjectSummary = {
  slug: string;
  title: string;
  service_type: string;
  city: string | null;
  state: string | null;
  roof_material: string | null;
  completed_on: string | null;
  cover_url: string | null;
  cover_alt: string;
  cover_width: number | null;
  cover_height: number | null;
};

/**
 * Este tipo personalizado recibe un tipo original (T) y una lista de sus propiedades (K), y convierte solo esas propiedades en opcionales. Lo hace en tres pasos:
 * Omit<T, K>: Toma el tipo original y elimina las propiedades K. Lo que queda sigue siendo obligatorio.
 * Partial<Pick<T, K>>: Toma solo las propiedades K y las convierte en opcionales (les añade el ?).
 * &: Une ambas partes.
 */
type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type ProjectInsert = Optional<
  Project,
  Exclude<keyof Project, "slug" | "title">
>;
export type ProjectMediaInsert = Optional<
  ProjectMedia,
  Exclude<keyof ProjectMedia, "project_id" | "storage_path" | "url">
>;
export type TestimonialInsert = Optional<
  Testimonial,
  Exclude<keyof Testimonial, "author_name" | "content">
>;
export type LeadInsert = Optional<Lead, Exclude<keyof Lead, "name">>;
export type AdminUserInsert = Optional<AdminUser, "full_name" | "created_at">;

// Mapeo del Schema de la BD
export type Database = {
  public: {
    Tables: {
      admin_users: {
        Row: AdminUser;
        Insert: AdminUserInsert;
        Update: Partial<AdminUser>;
        Relationships: [];
      };
      projects: {
        Row: Project;
        Insert: ProjectInsert;
        Update: Partial<Project>;
        Relationships: [];
      };
      project_media: {
        Row: ProjectMedia;
        Insert: ProjectMediaInsert;
        Update: Partial<ProjectMedia>;
        Relationships: [
          {
            foreignKeyName: "project_media_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      testimonials: {
        Row: Testimonial;
        Insert: TestimonialInsert;
        Update: Partial<Testimonial>;
        Relationships: [
          {
            foreignKeyName: "testimonials_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      site_config: {
        Row: SiteConfig;
        Insert: Partial<SiteConfig>;
        Update: Partial<SiteConfig>;
        Relationships: [];
      };
      leads: {
        Row: Lead;
        Insert: LeadInsert;
        Update: Partial<Lead>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      replace_project_media: {
        Args: { p_project_id: string; p_media: Json };
        Returns: undefined;
      };
    };
    Enums: {
      project_status: ProjectStatus;
      media_type: MediaType;
      media_role: MediaRole;
      hero_media_type: HeroMediaType;
      lead_status: LeadStatus;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
