import { beforeEach, describe, expect, it, vi } from "vitest";
import { isValidElement, type ReactNode } from "react";

const mocks = vi.hoisted(() => ({ currentUser: vi.fn(), getSignupForEdit: vi.fn(), headers: vi.fn() }));
vi.mock("@clerk/nextjs", () => ({ SignUp: "signup-widget", SignOutButton: "signout-button", UserProfile: "profile-widget" }));
vi.mock("@clerk/nextjs/server", () => ({ currentUser: mocks.currentUser }));
vi.mock("@/lib/db/signups", () => ({ getSignupForEdit: mocks.getSignupForEdit }));
vi.mock("@/lib/clerk-appearance", () => ({ clerkAppearance: {} }));
vi.mock("./account-ready", () => ({ AccountReady: "account-ready" }));
vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => { throw new Error(`redirect:${url}`); },
  notFound: () => { throw new Error("not-found"); },
}));
import SignupAccountPage from "./page";

const id = "00000000-0000-4000-8000-000000000001";
const email = "student@example.test";
function propsFor(node: ReactNode, type: string): Record<string, unknown> | undefined {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = propsFor(child, type);
      if (found) return found;
    }
  }
  if (isValidElement<{ children?: ReactNode }>(node)) {
    if (node.type === type) return node.props;
    return propsFor(node.props.children, type);
  }
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.headers.mockResolvedValue(new Headers({ host: "gopixel.org" }));
  mocks.getSignupForEdit.mockResolvedValue({ signup: { email } });
  mocks.currentUser.mockResolvedValue(null);
});
describe("existing-profile authentication recovery", () => {
  it("prefills the invited email and preserves the profile through signup AND sign-in", async () => {
    const tree = await SignupAccountPage({ searchParams: Promise.resolve({ id }) });
    const props = propsFor(tree, "signup-widget");
    const self = `/signup/account?id=${id}&next=welcome`;
    expect(props).toMatchObject({
      routing: "hash", initialValues: { emailAddress: email },
      forceRedirectUrl: self, signInForceRedirectUrl: self,
      signInUrl: `/sign-in?redirect_url=${encodeURIComponent(self)}`,
    });
  });
  it("offers an explicit account switch instead of signing out a parent automatically", async () => {
    mocks.currentUser.mockResolvedValue({ primaryEmailAddressId: "e", emailAddresses: [{ id: "e", emailAddress: "parent@example.test", verification: { status: "verified" } }] });
    const tree = await SignupAccountPage({ searchParams: Promise.resolve({ id }) });
    expect(propsFor(tree, "signup-widget")).toBeUndefined();
    expect(propsFor(tree, "signout-button")).toMatchObject({ redirectUrl: `/signup/account?id=${id}&next=welcome` });
  });
  it("hands off a matching login to draft cleanup and the original profile", async () => {
    mocks.currentUser.mockResolvedValue({ primaryEmailAddressId: "e", emailAddresses: [{ id: "e", emailAddress: email, verification: { status: "verified" } }] });
    const tree = await SignupAccountPage({ searchParams: Promise.resolve({ id, next: "profile" }) });
    expect(propsFor(tree, "account-ready")).toMatchObject({ signupId: id, destination: `/signup/thanks?id=${id}` });
  });
  it("allows a matching but unverified or secondary email to be repaired without a sign-out loop", async () => {
    mocks.currentUser.mockResolvedValue({ primaryEmailAddressId: "other", emailAddresses: [{ id: "e", emailAddress: email, verification: { status: "unverified" } }] });
    const tree = await SignupAccountPage({ searchParams: Promise.resolve({ id }) });
    expect(propsFor(tree, "profile-widget")).toMatchObject({ routing: "hash" });
    expect(propsFor(tree, "signout-button")).toBeUndefined();
    expect(propsFor(tree, "account-ready")).toBeUndefined();
  });
  it("never treats a user-supplied next value as an arbitrary redirect", async () => {
    const tree = await SignupAccountPage({ searchParams: Promise.resolve({ id, next: "https://example.test" }) });
    expect(propsFor(tree, "signup-widget")?.forceRedirectUrl).toBe(`/signup/account?id=${id}&next=welcome`);
  });
  it("moves satellite credential creation to the primary without losing context", async () => {
    mocks.headers.mockResolvedValue(new Headers({ host: "pixelparents.org" }));
    const tree = await SignupAccountPage({ searchParams: Promise.resolve({ id, next: "profile" }) });
    expect(propsFor(tree, "account-ready")).toMatchObject({ signupId: id, ready: false, destination: `https://gopixel.org/signup/account?id=${id}&next=profile` });
    expect(mocks.getSignupForEdit).toHaveBeenCalledWith(id);
  });
  it("rejects missing or deleted profiles instead of making a new database row", async () => {
    await expect(SignupAccountPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("not-found");
    mocks.getSignupForEdit.mockResolvedValue(null);
    await expect(SignupAccountPage({ searchParams: Promise.resolve({ id }) })).rejects.toThrow("not-found");
  });
});
