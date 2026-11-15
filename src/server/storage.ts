import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { WeighingSide } from "@/domain/job-status";

function storageRoot() {
  const root = process.env.STORAGE_ROOT;
  if (!root) throw new Error("STORAGE_ROOT is not set");
  return path.resolve(root);
}

/** Maps a stored relative path to disk, refusing anything that escapes the storage root. */
function absolutePath(relativePath: string) {
  const root = storageRoot();
  const full = path.resolve(root, relativePath);
  if (full !== root && !full.startsWith(root + path.sep)) throw new Error("Path escapes storage root");
  return full;
}

/** {year}/{jobNumber}/{origin|destination}/{uuid}.{ext}, with the year taken from the job number. */
export async function storeJobFile(jobNumber: string, category: WeighingSide, ext: string, data: Uint8Array) {
  const year = jobNumber.split("-")[1];
  const relativePath = [year, jobNumber, category.toLowerCase(), `${randomUUID()}.${ext}`].join("/");
  const full = absolutePath(relativePath);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, data, { flag: "wx" });
  return relativePath;
}

export function readStoredFile(relativePath: string) {
  return readFile(absolutePath(relativePath));
}

export function removeStoredFile(relativePath: string) {
  return unlink(absolutePath(relativePath));
}
