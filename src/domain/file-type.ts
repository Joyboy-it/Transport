export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export type AllowedMime = "image/jpeg" | "image/png" | "image/webp" | "application/pdf";

const BY_EXTENSION: Record<string, { mime: AllowedMime; ext: string }> = {
  jpg: { mime: "image/jpeg", ext: "jpg" },
  jpeg: { mime: "image/jpeg", ext: "jpg" },
  png: { mime: "image/png", ext: "png" },
  webp: { mime: "image/webp", ext: "webp" },
  pdf: { mime: "application/pdf", ext: "pdf" },
};

const startsWith = (head: Uint8Array, signature: number[], offset = 0) =>
  signature.every((byte, i) => head[offset + i] === byte);

const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0));

function contentMatches(mime: AllowedMime, head: Uint8Array) {
  switch (mime) {
    case "image/jpeg":
      return startsWith(head, [0xff, 0xd8, 0xff]);
    case "image/png":
      return startsWith(head, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "image/webp":
      return startsWith(head, ascii("RIFF")) && startsWith(head, ascii("WEBP"), 8);
    case "application/pdf":
      return startsWith(head, ascii("%PDF-"));
  }
}

export type FileTypeResult =
  | { ok: true; mime: AllowedMime; ext: string }
  | { ok: false; reason: "TYPE" | "CONTENT" };

/** Decides the stored type from the extension and the file's leading bytes, never the browser's claim. */
export function detectFileType(fileName: string, head: Uint8Array): FileTypeResult {
  const dot = fileName.lastIndexOf(".");
  const known = dot >= 0 ? BY_EXTENSION[fileName.slice(dot + 1).toLowerCase()] : undefined;
  if (!known) return { ok: false, reason: "TYPE" };
  if (!contentMatches(known.mime, head)) return { ok: false, reason: "CONTENT" };
  return { ok: true, ...known };
}

export const ACCEPT_ATTRIBUTE = ".jpg,.jpeg,.png,.webp,.pdf";
