import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { signups } from "@/lib/db/schema/signups";
import { getFamilyByInviteToken } from "@/lib/family";

export type ReferrerCandidate = {
  firstName: string;
  shareVisibility: string;
  extra: Record<string, unknown> | null;
};

// Who to name on a referral landing page. A referral link carries the FAMILY's
// token, not the person who shared it, so we name the family members of the
// role the link targets: parents for a family link, student accounts for a
// student link. Only members whose profile is visible to OHS families are
// named; a "Just me" member is never revealed to whoever holds the link.
export function referrerNamesFrom(
  members: ReferrerCandidate[],
  opts: { student: boolean },
): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const m of members) {
    const isStudent = (m.extra ?? {}).accountType === "student";
    const isAlum = (m.extra ?? {}).accountType === "alum";
    if (isAlum || isStudent !== opts.student) continue;
    if (m.shareVisibility !== "ohs") continue;
    const first = m.firstName.trim().split(/\s+/)[0] ?? "";
    if (!first || seen.has(first.toLowerCase())) continue;
    seen.add(first.toLowerCase());
    names.push(first);
  }
  return names.slice(0, 2);
}

export function formatReferrerLine(names: string[]): string | null {
  if (names.length === 0) return null;
  const who = names.length === 1 ? names[0] : `${names[0]} and ${names[1]}`;
  return `${who} invited you to GoPixel`;
}

export async function getReferrerLine(
  token: string,
  opts: { student: boolean },
): Promise<string | null> {
  try {
    const family = await getFamilyByInviteToken(token);
    if (!family) return null;
    const rows = await getDb()
      .select({
        firstName: signups.firstName,
        shareVisibility: signups.shareVisibility,
        extra: signups.extra,
        shareToken: signups.shareToken,
      })
      .from(signups)
      .where(eq(signups.familyId, family.id));
    const completed = rows.filter((r) => r.shareToken !== null);
    return formatReferrerLine(referrerNamesFrom(completed, opts));
  } catch (err) {
    console.error("getReferrerLine failed:", err);
    return null;
  }
}
