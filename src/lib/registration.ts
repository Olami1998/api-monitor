export function registrationAllowed(invite?: string | null) {
  const publicOpen = process.env.ALLOW_PUBLIC_REGISTRATION !== "false";
  const expected = process.env.REGISTRATION_INVITE?.trim();
  if (!publicOpen) {
    return Boolean(expected && invite === expected);
  }
  if (!expected) return true;
  return invite === expected;
}

export function registrationInviteRequired() {
  return (
    process.env.ALLOW_PUBLIC_REGISTRATION === "false" || Boolean(process.env.REGISTRATION_INVITE?.trim())
  );
}
