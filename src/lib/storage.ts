import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Local disk storage for generated files. On a serverless host, replace these
 * two functions with an S3 or Cloudflare R2 client (R2 has a free tier).
 */
const ROOT = path.join(process.cwd(), "data", "files");

const SAFE_NAME = /^[a-zA-Z0-9-]+\.(png|jpg|jpeg|webp|svg)$/;

export async function saveFile(name: string, data: Buffer | string) {
  if (!SAFE_NAME.test(name)) throw new Error("Invalid file name");
  await mkdir(ROOT, { recursive: true });
  await writeFile(path.join(ROOT, name), data);
  return name;
}

export async function readStoredFile(name: string) {
  if (!SAFE_NAME.test(name)) return null;
  try {
    return await readFile(path.join(ROOT, name));
  } catch {
    return null;
  }
}

export function contentTypeFor(name: string) {
  const ext = name.split(".").pop();
  switch (ext) {
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    case "svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}
