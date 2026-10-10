import { useState, type SyntheticEvent } from "react";
import { Button } from "../ui/Button";
import type { ContactPayload } from "../../../lib/schemas";

type Props = {
  services: [string, string][];
  initialService?: string;
  whatsappNumber?: string | null;
};

type FieldErrors = Partial<
  Record<"name" | "email" | "phone" | "service" | "message", string>
>;

const inputCls =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30";

export function ContactForm({
  services,
  initialService = "",
  whatsappNumber,
}: Props) {
  const [startedAt] = useState(() => Date.now());
  const [values, setValues] = useState({
    name: "",
    phone: "",
    email: "",
    service: initialService,
    message: "",
    website: "",
  });
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const set =
    (key: keyof typeof values) => (e: { target: { value: string } }) =>
      setValues((v) => ({ ...v, [key]: e.target.value }));

  async function onSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setErrors({});
    setFormError(null);
    const payload: ContactPayload = { ...values, startedAt };
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        issues?: { path: (string | number)[]; message: string }[];
      };
      if (res.ok) {
        setStatus("sent");
        return;
      }
      if (body.issues) {
        const next: FieldErrors = {};
        for (const issue of body.issues) {
          const field = issue.path[0] as keyof FieldErrors;
          if (field && !next[field]) next[field] = issue.message;
        }
        setErrors(next);
      } else {
        setFormError(body.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setFormError("Network error. Check your connection and try again.");
    }
    setStatus("idle");
  }

  if (status === "sent") {
    const wa = whatsappNumber?.replace(/\D/g, "");
    return (
      <div
        role="status"
        className="rounded-xl bg-emerald-50 p-6 ring-1 ring-emerald-200"
      >
        <h3 className="text-xl font-bold text-emerald-900">
          Thanks, we got your request.
        </h3>
        <p className="mt-2 text-emerald-900/80">
          We will contact you shortly to schedule your free estimate.
        </p>
        {wa && (
          <a
            href={`https://wa.me/${wa}?text=${encodeURIComponent("Hi! I just sent a request through your website.")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block font-semibold text-emerald-900 underline underline-offset-4"
          >
            Need it faster? Message us on WhatsApp
          </a>
        )}
      </div>
    );
  }

  const err = (key: keyof FieldErrors) =>
    errors[key] ? (
      <span
        role="alert"
        className="mt-1 block text-sm font-normal text-red-700"
      >
        {errors[key]}
      </span>
    ) : null;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block font-medium">
          Name
          <input
            required
            autoComplete="name"
            maxLength={100}
            value={values.name}
            onChange={set("name")}
            aria-invalid={!!errors.name}
            className={inputCls}
          />
          {err("name")}
        </label>
        <label className="block font-medium">
          Phone
          <input
            type="tel"
            autoComplete="tel"
            maxLength={30}
            value={values.phone}
            onChange={set("phone")}
            aria-invalid={!!errors.phone}
            className={inputCls}
          />
          {err("phone")}
        </label>
      </div>
      <label className="block font-medium">
        Email
        <input
          required
          type="email"
          autoComplete="email"
          maxLength={160}
          value={values.email}
          onChange={set("email")}
          aria-invalid={!!errors.email}
          className={inputCls}
        />
        {err("email")}
      </label>
      <label className="block font-medium">
        What do you need?
        <select
          value={values.service}
          onChange={set("service")}
          className={inputCls}
        >
          <option value="">Choose a service</option>
          {services.map(([slug, name]) => (
            <option key={slug} value={slug}>
              {name}
            </option>
          ))}
          <option value="other">Something else</option>
        </select>
        {err("service")}
      </label>
      <label className="block font-medium">
        Tell us about the roof
        <textarea
          required
          rows={5}
          maxLength={2000}
          value={values.message}
          onChange={set("message")}
          className={inputCls}
          placeholder="Address, what you noticed, and when it started."
        />
        {err("message")}
      </label>
      <div
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
      >
        <label>
          Website
          <input
            tabIndex={-1}
            autoComplete="off"
            value={values.website}
            onChange={set("website")}
          />
        </label>
      </div>
      {formError && (
        <p
          role="alert"
          className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {formError}
        </p>
      )}
      <Button
        type="submit"
        loading={status === "sending"}
        className="w-full !py-3.5 text-base sm:w-auto"
      >
        Request my free estimate
      </Button>
    </form>
  );
}
