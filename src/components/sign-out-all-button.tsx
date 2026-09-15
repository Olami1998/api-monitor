"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";

export function SignOutAllButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    try {
      await api("/api/auth/logout-all", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => void onClick()}
      className="mt-4 rounded-lg border border-[var(--line)] px-4 py-2 text-sm"
    >
      {pending ? "Signing out…" : "Sign out all sessions"}
    </button>
  );
}
