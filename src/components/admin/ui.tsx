"use client";

import { useEffect, useId, useRef, useSyncExternalStore } from "react";
import { createStore } from "@/lib/storage";

/* ---------------- Avisos (éxito / error) ---------------- */

type Toast = { id: number; kind: "ok" | "error"; text: string };
const toasts = createStore<Toast[]>([]);
let seq = 0;

export function toast(kind: Toast["kind"], text: string) {
  const id = ++seq;
  toasts.set([...toasts.get(), { id, kind, text }]);
  window.setTimeout(() => toasts.set(toasts.get().filter((t) => t.id !== id)), kind === "error" ? 8000 : 3500);
}

export function Toaster() {
  const list = useSyncExternalStore(toasts.subscribe, toasts.get, () => []);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[80] flex flex-col items-center gap-2 px-4" aria-live="polite">
      {list.map((t) => (
        <div
          key={t.id}
          data-toast={t.kind}
          role={t.kind === "error" ? "alert" : "status"}
          className={`pointer-events-auto flex max-w-md items-start gap-3 px-4 py-3 text-sm shadow-lg ${t.kind === "error" ? "bg-red-700 text-white" : "bg-ink text-paper"}`}
        >
          <span aria-hidden>{t.kind === "error" ? "⚠" : "✓"}</span>
          <span>{t.text}</span>
          <button className="ml-2 opacity-70 hover:opacity-100" aria-label="Cerrar aviso" onClick={() => toasts.set(toasts.get().filter((x) => x.id !== t.id))}>
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Confirmación antes de eliminar ---------------- */

type ConfirmReq = { title: string; body?: string; confirm: string; danger?: boolean; resolve: (v: boolean) => void };
const confirmStore = createStore<ConfirmReq | null>(null);

/** const ok = await confirmAction({ title: "¿Eliminar?", confirm: "Eliminar", danger: true }) */
export function confirmAction(opts: Omit<ConfirmReq, "resolve">) {
  return new Promise<boolean>((resolve) => confirmStore.set({ ...opts, resolve }));
}

export function ConfirmHost() {
  const req = useSyncExternalStore(confirmStore.subscribe, confirmStore.get, () => null);
  const close = (v: boolean) => {
    req?.resolve(v);
    confirmStore.set(null);
  };
  return (
    <Modal open={Boolean(req)} onClose={() => close(false)} title={req?.title ?? ""} size="sm">
      {req?.body && <p className="whitespace-pre-line text-sm leading-relaxed text-muted">{req.body}</p>}
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button className="btn-secondary" onClick={() => close(false)}>Cancelar</button>
        <button className={req?.danger ? "btn-danger" : "btn-primary"} onClick={() => close(true)} autoFocus>
          {req?.confirm}
        </button>
      </div>
    </Modal>
  );
}

/* ---------------- Modal accesible (<dialog>) ---------------- */

export function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
    // Next mantiene las páginas visitadas ocultas (no desmontadas): cerramos el
    // diálogo al ocultarse para que no bloquee la página siguiente.
    return () => {
      if (d.open) d.close();
    };
  }, [open]);
  const width = { sm: "max-w-md", md: "max-w-2xl", lg: "max-w-4xl", xl: "max-w-6xl" }[size];
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === ref.current && onClose()}
      className={`m-auto w-[calc(100%-1.5rem)] ${width} bg-paper p-0 text-ink backdrop:bg-black/40`}
    >
      {open && (
        <div className="max-h-[88vh] overflow-y-auto p-5 sm:p-7">
          <div className="mb-5 flex items-start justify-between gap-4">
            <h2 className="text-lg font-medium">{title}</h2>
            <button className="-m-2 p-2 text-xl leading-none text-muted hover:text-ink" onClick={onClose} aria-label="Cerrar">
              ×
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

/* ---------------- Piezas de formulario ---------------- */

export function Card({ title, description, children, actions }: { title: string; description?: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <section className="border border-line bg-paper p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-medium">{title}</h2>
          {description && <p className="mt-1 text-sm text-muted">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function Field({ label, hint, children, htmlFor }: { label: string; hint?: string; children: React.ReactNode; htmlFor?: string }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function StatusBadge({ status }: { status: "draft" | "published" }) {
  return status === "published" ? (
    <span className="inline-flex items-center gap-1.5 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-800">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" /> Publicado
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 bg-stone px-2 py-0.5 text-xs text-muted">
      <span className="h-1.5 w-1.5 rounded-full bg-muted" /> Borrador
    </span>
  );
}

export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  const id = useId();
  return (
    <div className="flex items-start gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-l`}
        aria-describedby={description ? `${id}-d` : undefined}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-ink" : "bg-line"}`}
      >
        <span className={`absolute left-0 top-0.5 h-5 w-5 rounded-full bg-paper shadow transition-transform ${checked ? "translate-x-[22px]" : "translate-x-0.5"}`} />
      </button>
      <span className="text-sm">
        <span id={`${id}-l`} className="cursor-pointer font-medium" onClick={() => onChange(!checked)}>{label}</span>
        {description && <span id={`${id}-d`} className="block text-muted">{description}</span>}
      </span>
    </div>
  );
}

/** Campo de precio en CLP: solo dígitos, muestra el valor formateado. */
export function PriceInput({ id, value, onChange, placeholder }: { id?: string; value: number | null; onChange: (v: number | null) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">$</span>
      <input
        id={id}
        inputMode="numeric"
        className="field pl-8"
        placeholder={placeholder}
        value={value === null ? "" : value.toLocaleString("es-CL")}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(0, 9);
          onChange(digits ? Number(digits) : null);
        }}
      />
    </div>
  );
}

/** Advierte antes de salir con cambios sin guardar. */
export function useUnsavedWarning(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);
}

export function Spinner({ className = "" }: { className?: string }) {
  return <span className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent ${className}`} aria-hidden />;
}
