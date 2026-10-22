"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ApiError } from "@/lib/fetcher";

/** Runs an API call with busy state, toast, field errors and a router refresh. Returns true on success. */
export function useAction() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const run = async (fn: () => Promise<unknown>, success: string) => {
    setBusy(true);
    setErrors({});
    try {
      await fn();
      toast.success(success);
      router.refresh();
      return true;
    } catch (e) {
      if (e instanceof ApiError && e.fields) setErrors(e.fields);
      toast.error((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { run, busy, errors, setErrors };
}
