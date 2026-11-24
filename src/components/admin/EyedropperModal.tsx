"use client";

/* eslint-disable @next/next/no-img-element -- miniaturas del panel */
import { useEffect, useRef, useState } from "react";
import type { MediaItem } from "@/lib/admin/data";
import { isLight } from "@/lib/catalog/helpers";
import { Modal } from "./ui";

const toHex = (r: number, g: number, b: number) => `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("").toUpperCase()}`;

/**
 * Cuentagotas manual: haz clic (o toca) sobre la prenda en la foto para tomar
 * su color exacto. Promedia un área pequeña (5×5 px) para evitar el ruido de
 * la tela. No detecta nada automáticamente: tú eliges el punto correcto.
 */
export function EyedropperModal({ open, onClose, photos, initial, onPick }: { open: boolean; onClose: () => void; photos: MediaItem[]; initial: string; onPick: (hex: string) => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Tomar color de una foto" size="lg">
      {open && <Dropper photos={photos} initial={initial} onPick={(h) => (onPick(h), onClose())} onCancel={onClose} />}
    </Modal>
  );
}

function Dropper({ photos, initial, onPick, onCancel }: { photos: MediaItem[]; initial: string; onPick: (hex: string) => void; onCancel: () => void }) {
  const [photo, setPhoto] = useState(photos[0]);
  const canvas = useRef<HTMLCanvasElement>(null);
  const loupe = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "blocked">("loading");
  const [hover, setHover] = useState<string | null>(null);
  const [picked, setPicked] = useState<string>(initial);
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!photo) return;
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled || !canvas.current) return;
      const c = canvas.current;
      const scale = Math.min(1, 1400 / Math.max(img.naturalWidth, img.naturalHeight));
      c.width = Math.round(img.naturalWidth * scale);
      c.height = Math.round(img.naturalHeight * scale);
      const ctx = c.getContext("2d", { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0, c.width, c.height);
      try {
        ctx.getImageData(0, 0, 1, 1);
        setState("ready");
      } catch {
        setState("blocked");
      }
    };
    img.onerror = () => !cancelled && setState("blocked");
    img.src = photo.url;
    return () => {
      cancelled = true;
    };
  }, [photo]);

  const sample = (clientX: number, clientY: number) => {
    const c = canvas.current;
    if (!c || state !== "ready") return null;
    const rect = c.getBoundingClientRect();
    const x = Math.round(((clientX - rect.left) / rect.width) * c.width);
    const y = Math.round(((clientY - rect.top) / rect.height) * c.height);
    if (x < 0 || y < 0 || x >= c.width || y >= c.height) return null;
    const ctx = c.getContext("2d", { willReadFrequently: true })!;
    const r = 2;
    const sx = Math.max(0, x - r),
      sy = Math.max(0, y - r);
    const d = ctx.getImageData(sx, sy, Math.min(c.width - sx, r * 2 + 1), Math.min(c.height - sy, r * 2 + 1)).data;
    let R = 0,
      G = 0,
      B = 0,
      n = 0;
    for (let i = 0; i < d.length; i += 4) {
      R += d[i];
      G += d[i + 1];
      B += d[i + 2];
      n++;
    }
    // Lupa
    const l = loupe.current;
    if (l) {
      const lc = l.getContext("2d")!;
      lc.imageSmoothingEnabled = false;
      lc.clearRect(0, 0, l.width, l.height);
      lc.drawImage(c, x - 8, y - 8, 17, 17, 0, 0, l.width, l.height);
      lc.strokeStyle = "#fff";
      lc.lineWidth = 2;
      lc.strokeRect(l.width / 2 - 6, l.height / 2 - 6, 12, 12);
      lc.strokeStyle = "#000";
      lc.lineWidth = 1;
      lc.strokeRect(l.width / 2 - 7, l.height / 2 - 7, 14, 14);
    }
    return { hex: toHex(Math.round(R / n), Math.round(G / n), Math.round(B / n)), x: (clientX - rect.left) / rect.width, y: (clientY - rect.top) / rect.height };
  };

  const systemDropper = async () => {
    try {
      // API nativa disponible en Chrome/Edge de escritorio.
      const ED = (window as unknown as { EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper;
      if (!ED) return;
      const res = await new ED().open();
      setPicked(res.sRGBHex.toUpperCase());
    } catch {
      /* cancelado */
    }
  };

  if (!photos.length) {
    return (
      <div className="py-10 text-center text-sm text-muted">
        Primero sube al menos una foto de este color. Luego podrás tomar el tono exacto haciendo clic sobre la prenda.
      </div>
    );
  }

  const hasSystem = typeof window !== "undefined" && "EyeDropper" in window;

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_220px]">
      <div>
        <p className="mb-2 text-sm text-muted">Haz clic sobre la prenda (no sobre el fondo ni la piel). Puedes repetir hasta encontrar el tono correcto.</p>
        <div className="relative bg-stone">
          <canvas
            ref={canvas}
            className={`mx-auto block max-h-[60vh] w-auto max-w-full ${state === "ready" ? "cursor-crosshair" : ""}`}
            style={{ touchAction: "none" }}
            onPointerMove={(e) => setHover(sample(e.clientX, e.clientY)?.hex ?? null)}
            onPointerLeave={() => setHover(null)}
            onPointerDown={(e) => {
              const s = sample(e.clientX, e.clientY);
              if (s) {
                setPicked(s.hex);
                setPoint({ x: s.x, y: s.y });
              }
            }}
            aria-label="Foto: haz clic para tomar el color"
            role="img"
          />
          {point && state === "ready" && (
            <span className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.6)]" style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }} />
          )}
          {state === "loading" && <p className="absolute inset-0 flex items-center justify-center text-sm text-muted">Cargando foto…</p>}
          {state === "blocked" && (
            <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-red-700">
              No se pudo leer el color de esta foto. Usa el selector de color o escribe el código HEX.
            </p>
          )}
        </div>
        {photos.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto" aria-label="Elegir foto">
            {photos.map((p) => (
              <button key={p.id} type="button" onClick={() => {
                  if (p.id !== photo.id) setState("loading");
                  setPhoto(p);
                }} className={`shrink-0 ${p.id === photo.id ? "ring-2 ring-ink ring-offset-1" : "opacity-70"}`} aria-label={`Usar foto ${p.alt || ""}`}>
                <img src={p.url} alt="" className="h-16 w-14 object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="space-y-4">
        <canvas ref={loupe} width={136} height={136} className="border border-line bg-stone" aria-hidden />
        <div className="text-sm">
          <p className="text-muted">Bajo el cursor</p>
          <p className="font-mono">{hover ?? "—"}</p>
        </div>
        <div>
          <p className="text-sm text-muted">Color elegido</p>
          <div className="mt-1 flex items-center gap-3">
            <span className={`h-10 w-10 rounded-full ${isLight(picked) ? "border border-ink/35" : ""}`} style={{ backgroundColor: picked }} />
            <span className="font-mono text-sm">{picked}</span>
          </div>
        </div>
        {hasSystem && (
          <button type="button" className="btn-secondary btn-sm w-full" onClick={systemDropper}>
            Cuentagotas de pantalla
          </button>
        )}
        <div className="flex flex-col gap-2">
          <button type="button" className="btn-primary" onClick={() => onPick(picked)}>Usar este color</button>
          <button type="button" className="btn-ghost" onClick={onCancel}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}
