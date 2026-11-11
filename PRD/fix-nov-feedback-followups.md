# fix/nov-feedback-followups

Follow-ups from the November 9 walkthrough that need no design decisions.
Stacked on fix/nov-onboarding-feedback (both touch the interest picker); merge
that one first.

## Progress Update as of [November 11, 2026 — afternoon Pacific]

### Summary of changes since last update

First entry. Referral links now say who invited you, combined interest entries
are split everywhere (shared list, saves, matching), matching interests show how
many people have them while typing, the welcome page's "Back home" is renamed,
and the onboarding banner caption says it is the same for everyone.

### Detail of changes made:

- **"Back home"** (`app/signup/welcome/page.tsx`) → "Go to the GoPixel
  homepage". The walkthrough asked what "back home" meant.
- **Who invited you** (`lib/referral-names.ts`, `app/signup/page.tsx`): a
  `?ref=` link shows "Dana invited you to GoPixel" above the headline. The link
  carries the family token, not the sharer, so it names family members of the
  role the link targets (parents for a family link, student accounts for
  `as=student`). First names only, at most two, completed profiles only, and
  ONLY members whose visibility is "OHS Families": a "Just me" member is never
  named to whoever holds the link. Falls back to no line. Unit-tested.
- **Combined interest entries** (`lib/interest-split.ts`): entries like
  "Dancing, Hiking" (pasted or blurred into the field) were stored as one
  interest and appeared beside a separate "Hiking". Comma/semicolon lists are
  now split in the shared pool (fixes the list immediately), in
  `canonicalizeInterests` (each member's stored entry splits on their next
  save), in the picker's add, and in `rankInterestMatches` (a stored
  "Dancing, Hiking" now matches "Hiking"). Colons and parentheses are left
  alone ("Books: Percy Jackson"). Unit-tested, including matching.
- **Counts while typing** (`getInterestPoolWithCounts`, `TagPicker` `counts`
  prop): the pool query now also returns how many entries list each interest;
  on the onboarding interests step, suggestions that match what you are typing
  show "· 3 people". Shown only while typing and only on unselected chips.
  `getInterestPool` is now a thin wrapper, so its callers are unchanged.
- **Banner on the photo step** (`app/signup/thanks/page.tsx`): the walkthrough
  asked whether the community photo above "Add a photo or two" was for everyone
  or only for the viewer (their own photo grid was empty). The caption now says it is the
  same banner everyone sees. Hiding it on that one step was rejected: the page
  would jump ~150px on entering and leaving the step.
- **Invite completion bug (no change):** traced against the walkthrough. #227
  already redirects a finished onboarding with no matching verified login to
  /signup/account (prefilled account creation, plus a sign-out path when a
  different account is signed in on a shared computer), which covers the
  reported "couldn't find the account" path. Not exercised live.

### Verification (exit codes, per-stage, not tail-piped)

- `tsc --noEmit` = 0, `next lint` = 0, `vitest run` = 0 with **1100/1100
  tests** (92 files; 10 new across `lib/referral-names.test.ts` and
  `lib/interest-split.test.ts`), production build = 0.
- Not visually verified (no reachable preview browser in this environment).
