import { json } from "@/lib/http";
import { requireUser } from "@/lib/auth";

export async function GET() {
  const result = await requireUser();
  if ("response" in result) {
    return result.response;
  }

  const { user } = result;
  return json({ id: user.id, name: user.name, email: user.email });
}
