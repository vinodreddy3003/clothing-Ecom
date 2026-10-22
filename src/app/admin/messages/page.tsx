import { MessageReadButton } from "@/components/admin/toggles";
import { EmptyState, PageHeader, Panel, dateTimeFmt } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";

export const metadata = { title: "Messages" };

export default async function MessagesPage() {
  // ponytail: latest 100 only; add pagination when the inbox grows past that.
  const messages = await db.contactMessage.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  const unread = messages.filter((m) => !m.isRead).length;
  return (
    <>
      <PageHeader title="Messages" description={unread ? `${unread} unread` : "From the contact form"} />
      <Panel>
        {messages.length === 0 ? (
          <EmptyState message="No messages yet." />
        ) : (
          <ul className="divide-y divide-line">
            {messages.map((m) => (
              <li key={m.id} className={cn("flex flex-col gap-2 p-4 sm:flex-row sm:items-start", !m.isRead && "bg-tile/50")}>
                <div className="min-w-0 flex-1 text-sm">
                  <p className={cn(!m.isRead && "font-semibold")}>
                    {m.name} · <a className="underline" href={`mailto:${m.email}?subject=Re: your message`}>{m.email}</a>
                  </p>
                  <p className="text-xs text-stone">{dateTimeFmt(m.createdAt)}</p>
                  <p className="mt-2 whitespace-pre-line">{m.message}</p>
                </div>
                <MessageReadButton id={m.id} isRead={m.isRead} />
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
