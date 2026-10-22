"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/fetcher";

/** Button → confirmation dialog → API call → toast → refresh (or redirect). */
export function ConfirmButton({
  label, title, description, confirmLabel, url, method = "POST", body, success, redirectTo,
  variant = "outline", size = "sm", destructive = false,
}: {
  label: React.ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  url: string;
  method?: string;
  body?: unknown;
  success: string;
  redirectTo?: string;
  variant?: "outline" | "destructive" | "default" | "secondary" | "ghost";
  size?: "sm" | "default" | "icon-sm";
  destructive?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      await api(url, { method, body: body ?? {} });
      toast.success(success);
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant={variant} size={size} disabled={busy}>
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep it</AlertDialogCancel>
          <AlertDialogAction onClick={run} className={destructive ? "bg-danger text-paper hover:bg-danger/90" : undefined}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
