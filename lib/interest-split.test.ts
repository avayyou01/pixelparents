import { describe, it, expect } from "vitest";
import { splitInterestEntry, splitInterestEntries } from "./interest-split";
import { canonicalizeInterests } from "./interests";
import { rankInterestMatches } from "./interest-matching";

describe("splitInterestEntry", () => {
  it("splits comma and semicolon lists into separate interests", () => {
    expect(splitInterestEntry("Dancing, Hiking")).toEqual(["Dancing", "Hiking"]);
    expect(splitInterestEntry("Chess;  Robotics ,")).toEqual(["Chess", "Robotics"]);
  });
  it("leaves single interests, colons and parentheses alone", () => {
    expect(splitInterestEntry("Books: Percy Jackson")).toEqual(["Books: Percy Jackson"]);
    expect(splitInterestEntry("How machines work (documentaries etc)")).toEqual([
      "How machines work (documentaries etc)",
    ]);
    expect(splitInterestEntry("   ")).toEqual([]);
  });
  it("flattens a list", () => {
    expect(splitInterestEntries(["Dancing, Hiking", "Hiking"])).toEqual(["Dancing", "Hiking", "Hiking"]);
  });
});

describe("canonicalizeInterests splits combined entries", () => {
  it("turns a combined entry into separate deduped interests", () => {
    expect(canonicalizeInterests(["Dancing, Hiking", "hiking"], ["Hiking"])).toEqual([
      "Dancing",
      "Hiking",
    ]);
  });
});

describe("rankInterestMatches splits combined entries", () => {
  it("matches a family whose stored entry is 'Dancing, Hiking' on Hiking", () => {
    const matches = rankInterestMatches({
      viewerInterests: ["Hiking"],
      candidates: [
        { signupId: "a", token: null, name: "A", isStudent: false, signalCount: 1, interests: ["Dancing, Hiking"] },
      ],
    });
    expect(matches.map((m) => m.sharedInterests)).toEqual([["Hiking"]]);
  });
});
