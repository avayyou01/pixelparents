# fix/nov-onboarding-feedback

Onboarding and profile fixes from the November 9 live walkthrough and the
student invite session (eight scoped items, plus one bug found on the same
control).

## Progress Update as of [November 11, 2026 — afternoon Pacific]

### Summary of changes since last update

First entry. Signup headline names the community, the AI-assisted profile has
a real "Edit profile" button that opens with the bio filled in, the interest
picker labels its two sections and keeps selected chips in place with a
checkmark, the photo step's button is readable in both themes, visibility
controls ask "Who can see this profile?" and explain each option, and the
wizard's Continue row stays on screen on short windows.

### Detail of changes made:

- **Signup headline** (`app/signup/page.tsx`): "Join 44 other GoPixel" →
  "Join the GoPixel community". The signup count query is no longer needed
  here and was removed from this page's data load.
- **Edit profile** (`app/(authed)/family/enrichment-panel.tsx`): the small
  "Edit" text link is now a labeled pill button with a pencil icon, in the
  "Your bio & expertise" heading row.
- **Bio blank in the editor (bug, same control):** the editor's draft fields
  were seeded once at mount, so when the curated profile arrived later (inline
  build or refresh) the editor opened empty over a bio that existed (walkthrough
  Screenshot 6). Opening the editor now re-seeds bio, expertise and
  how-they-can-help from the current curated profile.
- **Interest picker** (`TagPicker` in `app/signup/thanks/family-form.tsx`):
  - Optional `labels` prop; the onboarding interests step passes "Your selected
    interests" / "Explore interests" plus a one-line instruction. /family and
    child cards are unchanged (no labels passed).
  - Selected suggestions no longer vanish from the list: they stay in place,
    turn amber with a checkmark, carry `aria-pressed`, and a second click
    removes them. Type-to-filter and "create new" behave as before.
- **"You can add or change your interests later."** under the interests step.
  Verified first: /family's member card renders the same `TagPicker` against
  the saved interests, so the statement is true.
- **Choose photos** (`PhotoUploader`): the native file button used
  `file:bg-white file:text-black`; in light mode `bg-white` flips to near-black
  while `text-black` does not, so the label rendered black on black
  (Screenshot 2). Replaced with a styled label ("Choose photos", amber with
  black text, readable in both themes) wrapping a visually hidden input, with
  more spacing. The input value is cleared after each pick so the same photo
  can be re-chosen after removal.
- **Visibility copy** (`member-card.tsx` student control, `visibility-control.tsx`):
  label reads "Who can see this profile?" and each option is explained
  ("OHS Families: other signed-in, verified OHS families can find this profile
  in the directory." / "Just me: hidden from everyone except your family.").
  No default changed.
- **Continue row** (`onboarding-wizard.tsx`): the Back / Continue / Skip row is
  `sticky bottom-0` with a translucent page-colored background, so it pins to
  the bottom only when a step is taller than the window. No ancestor clips
  overflow, so sticky engages.

### Not in this branch (deliberately)

- Defaults the walkthrough suggested changing (enrichment checkbox on, student
  visibility to OHS Families) are privacy/consent decisions, not copy fixes.
- Interest grouping, duplicate cleanup, match counts and similarity matching.
- Post photos/video and public or secret post links (a feature, not a fix).

### Verification (exit codes, per-stage, not tail-piped)

- `tsc --noEmit` = 0, `next lint` = 0, `vitest run` = 0 with **1090/1090
  tests** (90 files), production build = 0.
- Not visually verified: a local render of the picker and photo button was
  attempted but the preview browser could not reach the dev server from this
  environment. The light-mode readability claim rests on the override rules in
  `app/globals.css` (amber and black are not flipped; `bg-white` is).
- The repo has no component-render test setup, so the picker's
  stay-in-place behavior has no automated test.
