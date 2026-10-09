import React, {
  useEffect,
  useId,
  useRef,
  useState,
  type SyntheticEvent,
} from "react";
import type { WhatsAppMessage } from "../../../lib/types";

type Props = {
  phone: string;
  messages: WhatsAppMessage[];
  companyName?: string;
};

const CHAT_ICON = "M7.9 20A9 9 0 1 0 4 16.1L2 22Z";
const CLOSE_ICON = "M18 6 6 18M6 6l12 12";

type Gtag = (
  command: "event",
  name: string,
  params: Record<string, string>,
) => void;

const WhatsAppButton = ({ phone, messages, companyName = "us" }: Props) => {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const number = phone.replace(/\D/g, "");

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);

    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onPointer);

    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  if (phone.length < 10) return null;

  const start = (text: string, label: string) => {
    // 1. Rastreo de analítica (Google Analytics)
    (window as unknown as { gtag?: Gtag }).gtag?.("event", "whatsapp_click", {
      label,
    });

    // 2. Apertura del chat de WhatsApp en una pestaña nueva
    window.open(
      `https://wa.me/${number}?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer",
    );

    // 3. Limpieza del estado del componente
    setOpen(false);
    setCustom("");
  };

  const onCustomSubmit = (e: SyntheticEvent) => {
    e.preventDefault(); // Evita que la página se recargue al enviar el formulario
    const text = custom.trim(); // Quita espacios en blanco al inicio y al final
    if (text) start(text, "custom"); // Si hay texto válido, ejecuta la función start
  };

  return (
    <div
      ref={rootRef}
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-50 flex flex-col items-end gap-3 sm:right-6"
    >
      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label={`Chat with ${companyName} on WhatsApp`}
          className="w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10"
        >
          <div className="bg-emerald-700 px-4 py-3 text-white">
            <p className="font-semibold">Chat with {companyName}</p>
            <p className="text-sm text-emerald-50">
              Pick a topic and we will open WhatsApp with the message ready.
            </p>
          </div>
          <div className="space-y-2 p-3">
            {messages.map((m) => (
              <button
                key={m.label}
                type="button"
                onClick={() => start(m.text, m.label)}
                className="block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-left text-sm font-medium text-slate-800 transition hover:border-emerald-600 hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600"
              >
                {m.label}
              </button>
            ))}
            <form onSubmit={onCustomSubmit} className="flex gap-2 pt-1">
              <label className="sr-only" htmlFor={`${panelId}-msg`}>
                Write your own message
              </label>
              <input
                id={`${panelId}-msg`}
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                maxLength={300}
                placeholder="Write your own message"
                className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
              />
              <button
                type="submit"
                disabled={!custom.trim()}
                className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={open ? "Close WhatsApp chat" : "Chat on WhatsApp"}
        className="relative grid h-14 w-14 place-items-center rounded-full bg-emerald-600 text-white shadow-lg transition hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
      >
        {!open && (
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full bg-emerald-500/40 motion-safe:animate-ping [animation-iteration-count:3]"
          />
        )}
        <svg
          viewBox="0 0 24 24"
          width="26"
          height="26"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="relative"
        >
          <path d={open ? CLOSE_ICON : CHAT_ICON} />
        </svg>
      </button>
    </div>
  );
};

export default WhatsAppButton;
