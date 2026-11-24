"use client";

import { useRef, useState } from "react";
import type { MediaItem } from "@/lib/admin/data";
import type { MediaKind } from "@/lib/catalog/types";
import { MEDIA_KINDS } from "@/lib/catalog/types";
import { ACCEPT, uploadFiles, type UploadStatus } from "@/lib/admin/upload-client";
import { useAdminData } from "./AdminData";
import { toast } from "./ui";

/**
 * Zona para subir fotos: arrastrar y soltar o elegir archivos (varios a la vez).
 * Muestra el progreso de cada archivo. Las fotos quedan en la biblioteca.
 */
export function MediaUploader({
  onUploaded,
  defaultKind = "producto",
  altFor,
  compact = false,
  showOptions = true,
  multiple = true,
}: {
  onUploaded?: (items: MediaItem[]) => void;
  defaultKind?: MediaKind;
  altFor?: (file: File, i: number) => string;
  compact?: boolean;
  showOptions?: boolean;
  multiple?: boolean;
}) {
  const { addMedia } = useAdminData();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<UploadStatus[]>([]);
  const [kind, setKind] = useState<MediaKind>(defaultKind);
  const [isAi, setIsAi] = useState(false);

  const start = async (list: FileList | File[]) => {
    const files = Array.from(list).slice(0, multiple ? 30 : 1);
    if (!files.length || busy) return;
    setBusy(true);
    try {
      const items = await uploadFiles(files, { kind, isAi, alt: altFor, onStatus: setStatus });
      if (items.length) {
        addMedia(items);
        onUploaded?.(items);
        toast("ok", items.length === 1 ? "Foto subida." : `${items.length} fotos subidas.`);
      }
      const failed = files.length - items.length;
      if (failed > 0) toast("error", failed === 1 ? "Una foto no se pudo subir. Revisa el detalle." : `${failed} fotos no se pudieron subir. Revisa el detalle.`);
    } catch (e) {
      toast("error", (e as Error).message || "No se pudieron subir las fotos.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div>
      {showOptions && (
        <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <label className="flex items-center gap-2">
            <span className="text-muted">Tipo de foto</span>
            <select className="field min-h-9 w-auto py-1 text-sm" value={kind} onChange={(e) => setKind(e.target.value as MediaKind)}>
              {MEDIA_KINDS.map((k) => (
                <option key={k.id} value={k.id}>{k.label}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="h-4 w-4 accent-ink" checked={isAi} onChange={(e) => setIsAi(e.target.checked)} />
            Generadas con IA (imagen conceptual)
          </label>
        </div>
      )}
      <div
        role="button"
        tabIndex={0}
        aria-label="Subir fotos: arrastra archivos aquí o presiona para elegirlos"
        onClick={() => input.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), input.current?.click())}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          start(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center border-2 border-dashed text-center transition-colors ${
          over ? "border-ink bg-sand/50" : "border-line bg-ivory hover:border-ink/40"
        } ${compact ? "px-4 py-5" : "px-6 py-10"}`}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden className="text-muted">
          <path d="M12 16V4m0 0-4 4m4-4 4 4M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
        </svg>
        <p className="mt-2 text-sm font-medium">{busy ? "Subiendo…" : multiple ? "Arrastra fotos aquí o haz clic para elegirlas" : "Arrastra una foto o haz clic"}</p>
        <p className="mt-1 text-xs text-muted">JPG, PNG, WebP o AVIF · hasta 25 MB · se optimizan automáticamente</p>
        <input ref={input} type="file" accept={ACCEPT} multiple={multiple} className="hidden" onChange={(e) => e.target.files && start(e.target.files)} />
      </div>
      {status.length > 0 && (
        <ul className="mt-3 space-y-2" aria-label="Progreso de subida">
          {status.map((s) => (
            <li key={s.key} className="text-xs">
              <div className="flex justify-between gap-3">
                <span className="truncate">{s.name}</span>
                <span className={s.state === "error" ? "text-red-700" : "text-muted"}>{s.state === "subiendo" ? `${Math.round(s.progress * 100)}%` : s.state}</span>
              </div>
              <div className="mt-1 h-1 bg-stone" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(s.progress * 100)} aria-label={s.name}>
                <div className={`h-full transition-all ${s.state === "error" ? "bg-red-700" : "bg-ink"}`} style={{ width: `${s.state === "error" ? 100 : Math.round(s.progress * 100)}%` }} />
              </div>
              {s.error && <p className="mt-1 text-red-700">{s.error}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
