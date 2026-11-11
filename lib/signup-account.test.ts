import { describe, it, expect, vi } from "vitest";
import { createSignupAccount, verifySignupAccount, hasSignupLogin, signupAccountPath, type SignupAccount } from "./signup-account";

const failure = { error: { code: "strategy_disabled", message: "Unavailable" } };
function account(status = "complete"): SignupAccount {
  return {
    status,
    password: vi.fn(async () => ({ error: null })),
    finalize: vi.fn(async () => ({ error: null })),
    verifications: {
      sendEmailCode: vi.fn(async () => ({ error: null })),
      verifyEmailCode: vi.fn(async () => ({ error: null })),
    },
  };
}

describe("signup authentication must not fail open", () => {
  it("requires Clerk to be ready", async () => {
    expect((await createSignupAccount(undefined, "student@example.test", "password")).kind).toBe("error");
  });
  it("activates the session before declaring success", async () => {
    const a = account();
    expect(await createSignupAccount(a, " student@example.test ", "password")).toEqual({ kind: "complete" });
    expect(a.password).toHaveBeenCalledWith({ emailAddress: "student@example.test", password: "password" });
    expect(a.finalize).toHaveBeenCalledOnce();
  });
  for (const code of ["strategy_disabled", "form_identifier_exists", "captcha_invalid", "network_error"]) {
    it(`does not advance after ${code}`, async () => {
      const a = account();
      vi.mocked(a.password).mockResolvedValue({ error: { code, message: code } });
      expect((await createSignupAccount(a, "student@example.test", "password")).kind).toBe("error");
      expect(a.finalize).not.toHaveBeenCalled();
    });
  }
  it("keeps password errors actionable", async () => {
    const a = account();
    vi.mocked(a.password).mockResolvedValue({ error: { code: "form_password_pwned", message: "Choose another password." } });
    expect(await createSignupAccount(a, "student@example.test", "password")).toMatchObject({ kind: "error", password: true });
  });
  it("asks for verification without claiming completion", async () => {
    const a = account("missing_requirements");
    expect(await createSignupAccount(a, "student@example.test", "password")).toEqual({ kind: "verify" });
    expect(a.finalize).not.toHaveBeenCalled();
  });
  it("blocks failed code delivery", async () => {
    const a = account("missing_requirements");
    vi.mocked(a.verifications.sendEmailCode).mockResolvedValue(failure);
    expect((await createSignupAccount(a, "student@example.test", "password")).kind).toBe("error");
  });
  it("blocks failed finalization", async () => {
    const a = account();
    vi.mocked(a.finalize).mockResolvedValue(failure);
    expect((await createSignupAccount(a, "student@example.test", "password")).kind).toBe("error");
    expect((await verifySignupAccount(a, "123456")).kind).toBe("error");
  });
  it("does not confuse an accepted email code with complete signup", async () => {
    const a = account("missing_requirements");
    expect((await verifySignupAccount(a, "123456")).kind).toBe("error");
    expect(a.finalize).not.toHaveBeenCalled();
  });
  it("handles invalid/expired codes and can retry", async () => {
    const a = account();
    vi.mocked(a.verifications.verifyEmailCode).mockResolvedValueOnce(failure);
    expect((await verifySignupAccount(a, "000000")).kind).toBe("error");
    expect(await verifySignupAccount(a, " 123456 ")).toEqual({ kind: "complete" });
    expect(a.verifications.verifyEmailCode).toHaveBeenLastCalledWith({ code: "123456" });
  });
  it("handles thrown errors without losing the saved profile", async () => {
    const a = account();
    vi.mocked(a.password).mockRejectedValue(new Error("offline"));
    vi.mocked(a.verifications.verifyEmailCode).mockRejectedValue(new Error("offline"));
    expect((await createSignupAccount(a, "student@example.test", "password")).kind).toBe("error");
    expect((await verifySignupAccount(a, "123456")).kind).toBe("error");
  });
});

describe("profile login identity", () => {
  const user = { primaryEmailAddressId: "one", emailAddresses: [
    { id: "one", emailAddress: "student@example.test", verification: { status: "verified" } },
    { id: "two", emailAddress: "parent@example.test", verification: { status: "verified" } },
  ] };
  it("rejects missing sessions, mismatched users and secondary emails", () => {
    expect(hasSignupLogin(null, "student@example.test")).toBe(false);
    expect(hasSignupLogin(user, "other@example.test")).toBe(false);
    expect(hasSignupLogin(user, "parent@example.test")).toBe(false);
  });
  it("requires a verified primary email, case-insensitively", () => {
    expect(hasSignupLogin(user, " Student@Example.Test ")).toBe(true);
    expect(hasSignupLogin({ ...user, emailAddresses: [{ ...user.emailAddresses[0], verification: null }] }, "student@example.test")).toBe(false);
  });
  it("preserves the existing profile and limits the return destination", () => {
    expect(signupAccountPath("existing-id")).toBe("/signup/account?id=existing-id&next=welcome");
    expect(signupAccountPath("existing-id", "profile")).toBe("/signup/account?id=existing-id&next=profile");
  });
});
