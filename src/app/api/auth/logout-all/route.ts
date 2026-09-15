import { requireUser } from "@/lib/auth";
import { json } from "@/lib/http";
import { clearAllSessions } from "@/lib/session";

export async function POST() {
  const result = await requireUser();
  if ("response" in result) return result.response;
  await clearAllSessions(result.user.id);
  return json({ success: true });
}
