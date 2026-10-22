import { route } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { HttpError } from "@/lib/errors";
import { saveUpload } from "@/lib/storage";

export const POST = route(async (req) => {
  const admin = await requireAdmin();
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "Choose an image to upload.");
  const url = await saveUpload(file);
  await audit(admin.id, "upload.create", "Upload", null, { url, name: file.name, size: file.size });
  return { url };
});
