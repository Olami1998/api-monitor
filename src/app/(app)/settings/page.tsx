import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { monitor: true },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-[var(--muted)]">Account and in-app notifications.</p>
      </div>
      <section className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
        <h2 className="font-medium">Account</h2>
        <p className="mt-2 text-sm">{user.name}</p>
        <p className="text-sm text-[var(--muted)]">{user.email}</p>
      </section>
      <section className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
        <h2 className="font-medium">Notifications</h2>
        <ul className="mt-4 space-y-3 text-sm">
          {notifications.map((item) => (
            <li key={item.id} className="flex justify-between gap-3">
              <span>
                {item.monitor?.name ?? "Account"} → {item.recipient} ({item.status})
              </span>
              <span className="text-[var(--muted)]">{item.type}</span>
            </li>
          ))}
          {notifications.length === 0 ? (
            <p className="text-[var(--muted)]">No notifications yet. Incident alerts appear here.</p>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
