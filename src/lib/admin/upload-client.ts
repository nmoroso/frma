"use client";

/**
 * Subida de fotos desde el panel:
 *  1. Valida formato y tamaño.
 *  2. Optimiza en el navegador: corrige la orientación, reduce a 2400 px en el
 *     lado más largo y convierte a WebP (calidad 86). Suficiente para zoom en
 *     una tienda de moda y mucho más liviano que una foto de cámara.
 *  3. Pide al servidor URLs firmadas (solo administradores) y sube con progreso.
 *  4. Registra las fotos en la biblioteca.
 * Después, Next.js sirve cada foto en el tamaño justo para cada pantalla.
 */
import { createUploadTargets, registerMedia, replaceMediaFile, type RegisterEntry } from "@/app/admin/actions";
import type { MediaItem } from "./data";
import type { MediaKind } from "../catalog/types";
import { ALLOWED_UPLOAD_TYPES, MAX_ORIGINAL_BYTES, MAX_STORED_BYTES } from "./validate";

export const MAX_EDGE = 2400;
export const QUALITY = 0.86;
export const ACCEPT = "image/jpeg,image/png,image/webp,image/avif";

export type UploadStatus = { key: string; name: string; progress: number; state: "en cola" | "optimizando" | "subiendo" | "listo" | "error"; error?: string; preview?: string };

type Optimized = { blob: Blob; width: number; height: number; mime: string };

export function checkFile(file: File): string | null {
  if (/\.hei[cf]$/i.test(file.name) || /heic|heif/i.test(file.type)) return `${file.name}: las fotos HEIC del iPhone no se pueden usar. Expórtala como JPG (o en iPhone: Ajustes → Cámara → Formatos → Más compatible).`;
  if (!ALLOWED_UPLOAD_TYPES.includes(file.type as (typeof ALLOWED_UPLOAD_TYPES)[number])) return `${file.name}: formato no permitido. Usa JPG, PNG, WebP o AVIF.`;
  if (file.size > MAX_ORIGINAL_BYTES) return `${file.name}: pesa más de 25 MB.`;
  return null;
}

export async function optimizeImage(file: File): Promise<Optimized> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" }).catch(() => null);
  if (!bitmap) throw new Error(`${file.name}: no se pudo leer la imagen (¿archivo dañado?).`);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const toBlob = (type: string, q: number) => new Promise<Blob | null>((res) => canvas.toBlob(res, type, q));
  let blob = await toBlob("image/webp", QUALITY);
  // Safari antiguo no genera WebP: usamos JPEG de alta calidad.
  if (!blob || blob.type !== "image/webp") blob = await toBlob("image/jpeg", 0.9);
  if (!blob) throw new Error(`${file.name}: no se pudo optimizar.`);
  // Si la original ya era liviana y del mismo tamaño, la conservamos.
  if (scale === 1 && file.size <= blob.size && file.size <= MAX_STORED_BYTES) return { blob: file, width, height, mime: file.type };
  if (blob.size > MAX_STORED_BYTES) throw new Error(`${file.name}: incluso optimizada supera 8 MB.`);
  return { blob, width, height, mime: blob.type };
}

function putWithProgress(url: string, blob: Blob, mime: string, onProgress: (p: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("content-type", mime);
    xhr.setRequestHeader("cache-control", "max-age=31536000");
    xhr.setRequestHeader("x-upsert", "false");
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (key) xhr.setRequestHeader("apikey", key);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`La subida falló (${xhr.status}).`)));
    xhr.onerror = () => reject(new Error("Sin conexión durante la subida."));
    xhr.send(blob);
  });
}

export function altFromFilename(name: string) {
  return name
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

/**
 * Sube varias fotos. `onStatus` recibe el estado de cada archivo para mostrar progreso.
 * Devuelve las fotos registradas (las que fallaron se informan en el estado).
 */
export async function uploadFiles(
  files: File[],
  opts: { kind: MediaKind; isAi?: boolean; alt?: (file: File, i: number) => string; onStatus: (s: UploadStatus[]) => void },
): Promise<MediaItem[]> {
  const status: UploadStatus[] = files.map((f, i) => ({ key: `${i}-${f.name}-${f.size}`, name: f.name, progress: 0, state: "en cola" }));
  const emit = () => opts.onStatus(status.map((s) => ({ ...s })));
  emit();

  const prepared: { i: number; file: File; opt: Optimized }[] = [];
  for (const [i, file] of files.entries()) {
    const err = checkFile(file);
    if (err) {
      Object.assign(status[i], { state: "error", error: err });
      emit();
      continue;
    }
    Object.assign(status[i], { state: "optimizando" });
    emit();
    try {
      prepared.push({ i, file, opt: await optimizeImage(file) });
      status[i].progress = 0.05;
    } catch (e) {
      Object.assign(status[i], { state: "error", error: (e as Error).message });
    }
    emit();
  }
  if (!prepared.length) return [];

  const targets = await createUploadTargets(prepared.map((p) => ({ name: p.file.name, type: p.opt.mime, size: p.opt.blob.size })));
  if (!targets.ok) {
    for (const p of prepared) Object.assign(status[p.i], { state: "error", error: targets.error });
    emit();
    return [];
  }

  const entries: { i: number; entry: RegisterEntry }[] = [];
  await Promise.all(
    prepared.map(async (p, k) => {
      const t = targets.data[k];
      Object.assign(status[p.i], { state: "subiendo" });
      emit();
      try {
        await putWithProgress(t.signedUrl, p.opt.blob, p.opt.mime, (x) => {
          status[p.i].progress = 0.05 + x * 0.9;
          emit();
        });
        entries.push({
          i: p.i,
          entry: {
            path: t.path,
            width: p.opt.width,
            height: p.opt.height,
            bytes: p.opt.blob.size,
            mime: p.opt.mime,
            originalName: p.file.name,
            alt: opts.alt ? opts.alt(p.file, p.i) : altFromFilename(p.file.name),
            kind: opts.kind,
            isAi: Boolean(opts.isAi),
          },
        });
      } catch (e) {
        Object.assign(status[p.i], { state: "error", error: `${p.file.name}: ${(e as Error).message}` });
        emit();
      }
    }),
  );
  if (!entries.length) return [];
  entries.sort((a, b) => a.i - b.i);
  const reg = await registerMedia(entries.map((e) => e.entry));
  for (const e of entries) Object.assign(status[e.i], reg.ok ? { state: "listo", progress: 1 } : { state: "error", error: reg.error });
  emit();
  return reg.ok ? reg.data : [];
}

/** Reemplaza el archivo de una foto existente (mantiene todos sus usos). */
export async function replaceFile(mediaId: string, file: File, onProgress: (p: number) => void): Promise<MediaItem> {
  const err = checkFile(file);
  if (err) throw new Error(err);
  const opt = await optimizeImage(file);
  const targets = await createUploadTargets([{ name: file.name, type: opt.mime, size: opt.blob.size }]);
  if (!targets.ok) throw new Error(targets.error);
  const t = targets.data[0];
  await putWithProgress(t.signedUrl, opt.blob, opt.mime, onProgress);
  const res = await replaceMediaFile(mediaId, { path: t.path, width: opt.width, height: opt.height, bytes: opt.blob.size, mime: opt.mime, originalName: file.name, alt: "", kind: "producto", isAi: false });
  if (!res.ok) throw new Error(res.error);
  return res.data;
}
