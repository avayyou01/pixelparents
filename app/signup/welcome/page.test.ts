import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(), getSignupForEdit: vi.fn(), sendWelcomeAfterOnboarding: vi.fn(),
}));
vi.mock("@clerk/nextjs/server", () => ({ currentUser: mocks.currentUser }));
vi.mock("@/lib/db/signups", () => ({ getSignupForEdit: mocks.getSignupForEdit }));
vi.mock("@/app/signup/actions", () => ({ sendWelcomeAfterOnboarding: mocks.sendWelcomeAfterOnboarding }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => { throw new Error(`redirect:${url}`); },
  notFound: () => { throw new Error("not-found"); },
}));
vi.mock("next/image", () => ({ default: "img" }));
vi.mock("next/link", () => ({ default: "a" }));
import WelcomePage from "./page";

const id = "00000000-0000-4000-8000-000000000001";
const email = "student@example.test";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSignupForEdit.mockResolvedValue({ signup: { email, extra: { approvalStatus: "approved" } } });
  mocks.currentUser.mockResolvedValue(null);
});
describe("welcome completion gate", () => {
  it("routes an OHS-verified invited or legacy profile to login creation without completion side effects", async () => {
    await expect(WelcomePage({ searchParams: Promise.resolve({ id }) })).rejects.toThrow(`redirect:/signup/account?id=${id}&next=welcome`);
    expect(mocks.sendWelcomeAfterOnboarding).not.toHaveBeenCalled();
  });
  it("does not let a parent's active session complete a student's login", async () => {
    mocks.currentUser.mockResolvedValue({ primaryEmailAddressId: "e", emailAddresses: [{ id: "e", emailAddress: "parent@example.test", verification: { status: "verified" } }] });
    await expect(WelcomePage({ searchParams: Promise.resolve({ id }) })).rejects.toThrow("redirect:/signup/account");
    expect(mocks.sendWelcomeAfterOnboarding).not.toHaveBeenCalled();
  });
  it("completes only once the matching login is verified", async () => {
    mocks.currentUser.mockResolvedValue({ primaryEmailAddressId: "e", emailAddresses: [{ id: "e", emailAddress: email, verification: { status: "verified" } }] });
    await WelcomePage({ searchParams: Promise.resolve({ id }) });
    expect(mocks.sendWelcomeAfterOnboarding).toHaveBeenCalledWith(id);
  });
  it("does not claim completion on an invalid/deleted link", async () => {
    await expect(WelcomePage({ searchParams: Promise.resolve({ id: "invalid" }) })).rejects.toThrow("not-found");
    mocks.getSignupForEdit.mockResolvedValue(null);
    await expect(WelcomePage({ searchParams: Promise.resolve({ id }) })).rejects.toThrow("not-found");
    expect(mocks.sendWelcomeAfterOnboarding).not.toHaveBeenCalled();
  });
});
