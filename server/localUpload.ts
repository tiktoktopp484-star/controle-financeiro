import { randomUUID } from "node:crypto";
import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const UPLOADS_DIR = path.resolve(process.cwd(), "server", "uploads");

export async function saveBase64Image(base64: string): Promise<string> {
  const matches = base64.match(/^data:image\/(png|jpg|jpeg|gif|webp);base64,(.+)$/);
  if (!matches) throw new Error("Formato de imagem inválido. Use PNG, JPG, GIF ou WebP.");

  const ext = matches[1] === "jpeg" ? "jpg" : matches[1];
  const data = matches[2];
  const filename = `receipt_${randomUUID()}.${ext}`;
  const filepath = path.join(UPLOADS_DIR, filename);

  if (!existsSync(UPLOADS_DIR)) {
    await mkdir(UPLOADS_DIR, { recursive: true });
  }

  const buffer = Buffer.from(data, "base64");
  await writeFile(filepath, buffer);

  return `/uploads/${filename}`;
}

export function getUploadsDir(): string {
  return UPLOADS_DIR;
}
