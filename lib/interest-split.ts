// One interest per chip. Comma or semicolon lists ("Dancing, Hiking") arrive by
// paste or blur and were stored as a single interest, which then sat beside a
// separate "Hiking" in the shared list. Pure, so the picker (client) and the
// pool/save path (server) split identically.
export function splitInterestEntry(raw: string): string[] {
  return raw
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function splitInterestEntries(list: Iterable<string>): string[] {
  const out: string[] = [];
  for (const raw of list) out.push(...splitInterestEntry(raw));
  return out;
}
