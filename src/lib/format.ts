export function healthLabel(health: string) {
  if (health === "HEALTHY") return "Healthy";
  if (health === "DEGRADED") return "Degraded";
  if (health === "FAILING") return "Failing";
  return "Unknown";
}

export function healthClass(health: string) {
  if (health === "HEALTHY") return "bg-emerald-100 text-emerald-800";
  if (health === "DEGRADED") return "bg-amber-100 text-amber-800";
  if (health === "FAILING") return "bg-red-100 text-red-800";
  return "bg-stone-200 text-stone-700";
}

export function statusClass(status: string) {
  if (status === "PASSED" || status === "RESOLVED" || status === "SENT") {
    return "bg-emerald-100 text-emerald-800";
  }
  if (status === "FAILED" || status === "OPEN" || status === "ERROR") {
    return "bg-red-100 text-red-800";
  }
  if (status === "TIMEOUT" || status === "DEGRADED") {
    return "bg-amber-100 text-amber-800";
  }
  return "bg-stone-200 text-stone-700";
}

export function formatDate(value?: string | Date | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}
