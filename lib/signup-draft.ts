// Authentication recovery carries the persisted row ID in its setup URL.
// Remove only a browser draft for that row, including the co-parent variant.
export function clearSavedSignupDraft(
  storage: Pick<Storage, "length" | "key" | "getItem" | "removeItem">,
  signupId: string,
): void {
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key && (key === "pp_signup_draft_id" || key.startsWith("pp_signup_draft_id_")) &&
      storage.getItem(key) === signupId) keys.push(key);
  }
  for (const key of keys) {
    storage.removeItem(key);
    storage.removeItem(key.replace("pp_signup_draft_id", "pp_signup_draft_v"));
  }
}
