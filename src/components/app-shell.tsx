"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";

const links = [
  { href: "/dashboard", label: "Overview" },
  { href: "/projects", label: "Projects" },
  { href: "/incidents", label: "Incidents" },
  { href: "/settings", label: "Settings" },
  { href: "/docs", label: "Docs" },
];

export function AppShell({
  user,
  children,
}: {
  user: { name: string | null; email: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 md:grid-cols-[240px_1fr]">
        <aside className="border-b border-[var(--line)] bg-[var(--paper)] p-5 md:border-b-0 md:border-r">
          <Link href="/dashboard" className="block font-semibold tracking-tight">
            Sentinel
          </Link>
          <p className="mt-1 text-sm text-[var(--muted)]">API monitors</p>
          <nav className="mt-8 flex flex-col gap-1">
            {links.map((link) => {
              const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-lg px-3 py-2 text-sm ${active ? "bg-teal-50 font-medium text-teal-900" : "text-stone-600 hover:bg-stone-100"}`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-10 text-sm text-[var(--muted)]">
            <p>{user.name ?? user.email}</p>
            <button className="mt-2 text-teal-800 underline" onClick={() => void logout()}>
              Sign out
            </button>
          </div>
        </aside>
        <main className="p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
