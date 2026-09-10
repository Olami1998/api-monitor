export function StatusBadge({ value }: { value: string }) {
  const tone =
    value === "HEALTHY" || value === "PASSED" || value === "RESOLVED"
      ? "bg-emerald-100 text-emerald-800"
      : value === "FAILING" || value === "FAILED" || value === "OPEN" || value === "ERROR"
        ? "bg-red-100 text-red-800"
        : value === "DEGRADED" || value === "TIMEOUT" || value === "QUEUED" || value === "RUNNING"
          ? "bg-amber-100 text-amber-800"
          : "bg-stone-200 text-stone-700";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone}`}>
      {value}
    </span>
  );
}
