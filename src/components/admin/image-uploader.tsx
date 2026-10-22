"use client";

import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type UploadedImage = { url: string; alt: string };

export async function uploadFile(file: File): Promise<string> {
  const body = new FormData();
  body.append("file", file);
  const res = await fetch("/api/admin/uploads", { method: "POST", body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Upload failed.");
  return data.url;
}

/** Single image field (banner, category, logo): upload button + URL preview. */
export function SingleImageInput({ value, onChange, id }: { value: string; onChange: (url: string) => void; id?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const pick = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      onChange(await uploadFile(file));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  };
  return (
    <div className="flex items-center gap-3">
      <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-tile">
        {/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnail of arbitrary upload URL */}
        {value && <img src={value} alt="" className="size-full object-cover" />}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://… or upload" />
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => ref.current?.click()} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <ImagePlus />} Upload
          </Button>
          {value && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>
              Remove
            </Button>
          )}
        </div>
      </div>
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp,image/avif" hidden onChange={(e) => pick(e.target.files?.[0])} />
    </div>
  );
}

/** Multiple product images with upload, reorder, alt text and remove. */
export function ImageUploader({ value, onChange }: { value: UploadedImage[]; onChange: (v: UploadedImage[]) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    const added: UploadedImage[] = [];
    for (const f of Array.from(files)) {
      try {
        added.push({ url: await uploadFile(f), alt: "" });
      } catch (e) {
        toast.error(`${f.name}: ${(e as Error).message}`);
      }
    }
    onChange([...value, ...added]);
    setBusy(false);
    if (ref.current) ref.current.value = "";
  };
  const move = (i: number, d: -1 | 1) => {
    const next = [...value];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-3">
      {value.length > 0 && (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {value.map((img, i) => (
            <li key={img.url + i} className="flex gap-3 rounded-xl border border-line p-2">
              <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-lg bg-tile">
                {/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnail */}
                <img src={img.url} alt="" className="size-full object-cover" />
                {i === 0 && <span className="absolute left-1 top-1 rounded-full bg-ink px-1.5 text-[10px] font-semibold text-paper">Main</span>}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Input
                  aria-label={`Alt text for image ${i + 1}`}
                  placeholder="Alt text"
                  value={img.alt}
                  onChange={(e) => onChange(value.map((v, k) => (k === i ? { ...v, alt: e.target.value } : v)))}
                />
                <div className="flex gap-1">
                  <Button type="button" variant="ghost" size="icon-sm" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
                    <ArrowUp />
                  </Button>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label="Move down" disabled={i === value.length - 1} onClick={() => move(i, 1)}>
                    <ArrowDown />
                  </Button>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove image" className="ml-auto" onClick={() => onChange(value.filter((_, k) => k !== i))}>
                    <X />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div>
        <Button type="button" variant="outline" onClick={() => ref.current?.click()} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <ImagePlus />} {busy ? "Uploading…" : "Upload images"}
        </Button>
        <p className="mt-1 text-xs text-stone">JPEG, PNG, WebP or AVIF, up to 5 MB each. The first image is the main one.</p>
      </div>
      <input ref={ref} type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" hidden onChange={(e) => add(e.target.files)} />
    </div>
  );
}
