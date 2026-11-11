import { beforeEach, describe, expect, it, vi } from "vitest";
import { keepPrivateOnShareSkip } from "./share-actions";

const mocks = vi.hoisted(() => ({
  limit: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
  set: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  getDb: () => ({ select: mocks.select, update: mocks.update }),
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@clerk/nextjs/server", () => ({ currentUser: vi.fn() }));
vi.mock("@/lib/admin", () => ({ isAdminEmail: vi.fn() }));

// Synthetic fixtures only. The real action executes against a mocked query
// builder; no connection, production record or real capability is involved.
const fixtureId = "00000000-0000-4000-8000-000000000001";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.select.mockReturnValue({ from: () => ({ where: () => ({ limit: mocks.limit }) }) });
  mocks.update.mockReturnValue({ set: mocks.set });
  mocks.set.mockReturnValue({ where: async () => undefined });
});

describe("sharing-step Skip preserves current visibility", () => {
  it("does not make an already OHS-visible profile private", async () => {
    mocks.limit.mockResolvedValue([{ visibility: "ohs" }]);
    await keepPrivateOnShareSkip(fixtureId);
    expect(mocks.select).toHaveBeenCalledTimes(1);
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });

  it("reaffirms private visibility for a profile that is already private", async () => {
    mocks.limit.mockResolvedValueOnce([{ visibility: "private" }]);
    mocks.limit.mockResolvedValueOnce([{ token: "placeholder-share-token" }]);
    await keepPrivateOnShareSkip(fixtureId);
    expect(mocks.set).toHaveBeenCalledExactlyOnceWith({
      shareVisibility: "private", shareEnabled: false, shareToken: "placeholder-share-token",
    });
    expect(mocks.revalidate).toHaveBeenCalledWith("/p/placeholder-share-token");
  });
});
