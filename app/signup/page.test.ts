import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import SignupPage from "./page";

const mocks = vi.hoisted(() => ({ count: vi.fn(), children: vi.fn(), interests: vi.fn() }));
vi.mock("@/lib/db/signups", () => ({ getSignupCount: mocks.count, getChildrenCount: mocks.children }));
vi.mock("@/lib/interests", () => ({ getInterestPool: mocks.interests }));
vi.mock("./signup-form", () => ({ default: () => null }));
vi.mock("./interest-tiles", () => ({ default: () => null }));
vi.mock("@/components/pixel-mascot", () => ({ PixelMascot: () => null }));
vi.mock("@/components/irl-tooltip", () => ({ IrlTooltip: () => null }));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.children.mockResolvedValue(4);
  mocks.interests.mockResolvedValue(["Chess", "Biking"]);
});

describe("signup headline", () => {
  it.each([
    { scenario: "nonzero signup count", count: 12, rejected: false },
    { scenario: "zero signup count", count: 0, rejected: false },
    { scenario: "failed count load", count: 0, rejected: true },
  ])("stays complete with $scenario", async ({ count, rejected }) => {
    if (rejected) mocks.count.mockRejectedValue(new Error("Synthetic count-load failure"));
    else mocks.count.mockResolvedValue(count);

    const page = await SignupPage({ searchParams: Promise.resolve({}) });
    const markup = renderToStaticMarkup(page);
    const headline = markup.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1];
    expect(headline).toBe("Join the GoPixel community");
    expect(markup).not.toContain("other GoPixel");
    expect(mocks.count).toHaveBeenCalledOnce();
    // Exercise the actual loading/fallback branch, not only the static h1.
    if (count > 0) expect(markup).toContain("members connecting with");
    else expect(markup).toContain("Connect with ");
    if (rejected) expect(markup).not.toContain(">4</span>");
  });
});
