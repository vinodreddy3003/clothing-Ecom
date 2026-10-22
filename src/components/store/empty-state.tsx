import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: LucideIcon;
  title: string;
  body?: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex flex-col items-center px-4 py-16 text-center">
      <span className="mb-5 grid size-16 place-items-center rounded-full bg-tile">
        <Icon className="size-7" strokeWidth={1.5} />
      </span>
      <h2 className="text-xl font-bold">{title}</h2>
      {body && <p className="mt-2 max-w-sm text-[15px] text-stone">{body}</p>}
      {action && (
        <Button asChild size="pill" className="mt-6">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      )}
    </div>
  );
}
