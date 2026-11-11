import { describe, it, expect } from "vitest";
import { referrerNamesFrom, formatReferrerLine, type ReferrerCandidate } from "./referral-names";

const parent = (firstName: string, shareVisibility = "ohs"): ReferrerCandidate => ({
  firstName,
  shareVisibility,
  extra: {},
});
const student = (firstName: string, shareVisibility = "ohs"): ReferrerCandidate => ({
  firstName,
  shareVisibility,
  extra: { accountType: "student" },
});

describe("referrerNamesFrom", () => {
  it("names parents for a family link and students for a student link", () => {
    const members = [parent("Dana"), student("Sam")];
    expect(referrerNamesFrom(members, { student: false })).toEqual(["Dana"]);
    expect(referrerNamesFrom(members, { student: true })).toEqual(["Sam"]);
  });

  it("never names a member whose profile is set to Just me", () => {
    expect(referrerNamesFrom([parent("Dana", "private")], { student: false })).toEqual([]);
    expect(referrerNamesFrom([parent("Dana", "private"), parent("Lee")], { student: false })).toEqual([
      "Lee",
    ]);
  });

  it("uses first names only, dedupes, and caps at two", () => {
    const members = [parent("Dana Maria"), parent("dana"), parent("Lee"), parent("Kim")];
    expect(referrerNamesFrom(members, { student: false })).toEqual(["Dana", "Lee"]);
  });

  it("skips blank names and alumni", () => {
    const alum: ReferrerCandidate = { firstName: "Al", shareVisibility: "ohs", extra: { accountType: "alum" } };
    expect(referrerNamesFrom([parent("  "), alum], { student: false })).toEqual([]);
  });
});

describe("formatReferrerLine", () => {
  it("formats one or two names and returns null for none", () => {
    expect(formatReferrerLine([])).toBeNull();
    expect(formatReferrerLine(["Dana"])).toBe("Dana invited you to GoPixel");
    expect(formatReferrerLine(["Dana", "Lee"])).toBe("Dana and Lee invited you to GoPixel");
  });
});
