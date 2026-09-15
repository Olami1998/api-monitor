import { redirect } from "next/navigation";
import { Suspense } from "react";
import { RegisterForm } from "@/components/register-form";
import { getCurrentUser } from "@/lib/auth";
import { registrationInviteRequired } from "@/lib/registration";

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  return (
    <Suspense>
      <RegisterForm inviteRequired={registrationInviteRequired()} />
    </Suspense>
  );
}
