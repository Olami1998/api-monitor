import { isSafeHttpUrl } from "@/lib/ssrf";

export { isSafeHttpUrl };

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
