import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { HttpError } from "@/lib/errors";

const MAX_BYTES = 5 * 1024 * 1024;

/** Detect the real type from magic bytes; the browser-sent MIME type is not trusted. */
function sniff(b: Buffer): { ext: string; mime: string } | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: "jpg", mime: "image/jpeg" };
  if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: "png", mime: "image/png" };
  if (b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP") return { ext: "webp", mime: "image/webp" };
  if (b.subarray(4, 8).toString("ascii") === "ftyp" && ["avif", "avis"].includes(b.subarray(8, 12).toString("ascii"))) return { ext: "avif", mime: "image/avif" };
  return null;
}

let s3: S3Client | null = null;

export async function saveUpload(file: File): Promise<string> {
  if (file.size === 0) throw new HttpError(400, "The file is empty.");
  if (file.size > MAX_BYTES) throw new HttpError(413, "Images must be 5 MB or smaller.");
  const buf = Buffer.from(await file.arrayBuffer());
  const type = sniff(buf);
  if (!type) throw new HttpError(415, "Upload a JPEG, PNG, WebP or AVIF image.");
  const name = `${randomUUID()}.${type.ext}`;

  const { S3_BUCKET: bucket, AWS_REGION: region, NEXT_PUBLIC_CDN_URL: cdn } = process.env;
  if (bucket && region) {
    s3 ??= new S3Client({ region });
    const key = `products/${name}`;
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buf,
        ContentType: type.mime,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    return `${(cdn ?? `https://${bucket}.s3.${region}.amazonaws.com`).replace(/\/$/, "")}/${key}`;
  }

  // ponytail: local disk fallback for development only; production must set S3_BUCKET (containers are ephemeral).
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), buf);
  return `/uploads/${name}`;
}
