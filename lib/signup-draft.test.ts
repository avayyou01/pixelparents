import { describe, expect, it } from "vitest";
import { clearSavedSignupDraft } from "./signup-draft";

describe("saved profile draft cleanup", () => {
  it("clears only matching ordinary/co-parent drafts, without skipping keys during removal", () => {
    const values = new Map([
      ["pp_signup_draft_id", "saved"], ["pp_signup_draft_v", "answers"],
      ["pp_signup_draft_id_join", "saved"], ["pp_signup_draft_v_join", "answers"],
      ["pp_signup_draft_id_other", "unrelated"], ["pp_signup_draft_v_other", "keep"],
      ["unrelated-setting", "saved"],
    ]);
    clearSavedSignupDraft({
      get length() { return values.size; },
      key: (i) => [...values.keys()][i] ?? null,
      getItem: (key) => values.get(key) ?? null,
      removeItem: (key) => { values.delete(key); },
    }, "saved");
    expect([...values]).toEqual([
      ["pp_signup_draft_id_other", "unrelated"], ["pp_signup_draft_v_other", "keep"],
      ["unrelated-setting", "saved"],
    ]);
  });
});
