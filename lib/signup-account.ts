// A profile save is not a login. Only a completed Clerk signup AND a successful
// session activation may advance the credential flow.
type AuthError = { code: string; message: string; longMessage?: string };
type Result = { error: AuthError | null };
export type SignupAccount = {
  status: string | null;
  password: (params: { emailAddress: string; password: string }) => Promise<Result>;
  finalize: () => Promise<Result>;
  verifications: {
    sendEmailCode: () => Promise<Result>;
    verifyEmailCode: (params: { code: string }) => Promise<Result>;
  };
};
export type AccountOutcome =
  | { kind: "complete" }
  | { kind: "verify" }
  | { kind: "error"; message: string; password?: boolean };

const unavailable: AccountOutcome = {
  kind: "error",
  message: "Your profile is saved, but we couldn't finish your login. Please retry or use Finish login setup below.",
};

async function activate(account: SignupAccount): Promise<AccountOutcome> {
  const { error } = await account.finalize();
  return error ? unavailable : { kind: "complete" };
}

export async function createSignupAccount(
  account: SignupAccount | undefined,
  email: string,
  password: string,
): Promise<AccountOutcome> {
  if (!account) return unavailable;
  try {
    const { error } = await account.password({ emailAddress: email.trim(), password });
    if (error) {
      if (error.code.startsWith("form_password")) {
        return { kind: "error", password: true, message: error.longMessage ?? error.message };
      }
      return unavailable;
    }
    if (account.status === "complete") return await activate(account);
    const { error: sendError } = await account.verifications.sendEmailCode();
    return sendError ? unavailable : { kind: "verify" };
  } catch {
    return unavailable;
  }
}

export async function verifySignupAccount(
  account: SignupAccount | undefined,
  code: string,
): Promise<AccountOutcome> {
  if (!account) return unavailable;
  try {
    const { error } = await account.verifications.verifyEmailCode({ code: code.trim() });
    if (error) {
      return { kind: "error", message: error.longMessage ?? error.message };
    }
    // A valid code can still leave other Clerk requirements incomplete.
    if (account.status !== "complete") return unavailable;
    return await activate(account);
  } catch {
    return unavailable;
  }
}

// Match the verified PRIMARY email: that is how the dashboard resolves a
// Clerk user to a community profile. A parent's session cannot complete their
// invited child's account, nor can a different secondary email.
export function hasSignupLogin(
  user: {
    primaryEmailAddressId: string | null;
    emailAddresses: {
      id: string;
      emailAddress: string;
      verification: { status: string } | null;
    }[];
  } | null,
  email: string,
): boolean {
  const primary = user?.emailAddresses.find((e) => e.id === user.primaryEmailAddressId);
  return Boolean(primary && primary.verification?.status === "verified" &&
    primary.emailAddress.trim().toLowerCase() === email.trim().toLowerCase());
}

export function signupAccountPath(id: string, next: "profile" | "welcome" = "welcome"): string {
  return `/signup/account?id=${encodeURIComponent(id)}&next=${next}`;
}
