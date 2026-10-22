"use client";

import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useAction } from "@/components/admin/use-action";
import { api } from "@/lib/fetcher";

export function CustomerActiveToggle({ id, isActive, disabled }: { id: string; isActive: boolean; disabled?: boolean }) {
  const { run, busy } = useAction();
  return (
    <label className="flex items-center gap-2 text-sm">
      <Switch
        checked={isActive}
        disabled={busy || disabled}
        onCheckedChange={(v) => run(() => api(`/api/admin/customers/${id}`, { method: "PATCH", body: { isActive: v } }), v ? "Account activated" : "Account deactivated and signed out")}
      />
      {isActive ? "Active" : "Deactivated"}
    </label>
  );
}

export function MessageReadButton({ id, isRead }: { id: string; isRead: boolean }) {
  const { run, busy } = useAction();
  return (
    <Button variant="outline" size="sm" disabled={busy} onClick={() => run(() => api(`/api/admin/messages/${id}`, { method: "PATCH", body: { isRead: !isRead } }), isRead ? "Marked unread" : "Marked read")}>
      {isRead ? "Mark unread" : "Mark read"}
    </Button>
  );
}
