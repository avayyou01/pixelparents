# feat/interest-matching-and-boards

Remaining November 9 walkthrough items that need no product decision:
interest grouping and near-duplicates, the side-by-side picker layout,
related suggestions while typing, related-interest matching, and explaining
resource boards.

## Progress Update as of [November 12, 2026 — evening Pacific]

### Summary of changes since last update

First entry. One shared, pure interest taxonomy (`lib/interest-taxonomy.ts`)
now drives three things: the onboarding picker groups interests under
category headings, typing suggests related interests ("cycling" → Biking),
and the dashboard's interest matches include families with related interests
(Harry Potter ↔ Percy Jackson) as a second-tier signal. "Book: X" and
"Books: X" are now one interest. The picker's full layout puts "Explore"
on the left and "Your selected interests" on the right. Resource boards
explain themselves on the boards page, the create page and each board.

### Detail of changes made:

- **Taxonomy** (`lib/interest-taxonomy.ts`, pure, client-safe): 14 display
  categories plus "Other interests", and 26 narrow themes. Keyword matching
  uses the same word rules as `lib/interest-icons.ts` (substring for phrases,
  whole word for ≤3 letters, word-prefix otherwise), so an interest's icon and
  category agree. Every interest in the walkthrough's screenshot lands in a
  named category (tested).
- **Near-duplicates** (`interestKey` in `lib/interest-split.ts`): the identity
  key now also treats a "Label: Title" prefix as singular/plural-insensitive.
  Used by canonicalization (`lib/interests.ts`), the pool counts, the picker
  and the matcher. Nothing else merges: "Cars"/"Car" and distinct titles stay
  apart (tested). The contract comment in `lib/interests.ts` is updated.
- **Picker** (`TagPicker`, full layout when `labels` is passed, i.e. the
  onboarding interests step):
  - Explore column on the left, "Your selected interests" (with a count and an
    empty-state line) on the right from `sm` up; on a phone the selected list
    comes first so it is never buried under the long list.
  - Not typing: suggestions grouped under category headings.
  - Typing: direct matches, then a "Related:" run of dashed chips from
    `relatedSuggestions` (same theme or same word stem, partial words from 4
    letters), then "create new".
  - Selection/dedup now compares by `interestKey`.
  - The compact layout used by /family and child cards is unchanged apart from
    the key comparison.
- **Related matching** (`rankInterestMatches`): each match carries
  `relatedInterests` (their interest, the viewer's interest it relates to, the
  theme). Families with only related interests now appear. `score` is still
  the exact shared count and is never inflated; sort is shared count, then
  related count, then the existing tiebreaks. The dashboard card shows related
  interests as dashed chips with "Similar to your X", the badge reads
  "N similar" when nothing is shared exactly, and the footer explains the
  ranking.
- **Resource boards**: new `HowBoardsWork` three-step explainer (a board is
  one topic; any verified family adds links, files or notes; upvotes sort,
  the creator pins, following notifies) on /resources and /resources/new.
  The create form's placeholders use the walkthrough's example board
  ("Choosing between OHS and other schools"). The board page explains what a
  contribution can be next to "Add a contribution", and the empty state says
  how to start. Every claim matches existing behavior (verified-only
  contribution, owner-only pin, upvote sort, follow notifications).

### Verification

- Recorded in the next entry (per-stage exit codes, not tail-piped; browser
  test in both themes).
