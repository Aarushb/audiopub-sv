# Listening Experience Upgrades — Progress Log

Spec: `docs/superpowers/specs/2026-09-19-listening-experience-upgrades-design.md`

## 2026-09-20 — Global keyboard shortcuts help modal (Task 6)

Created `keyboard_shortcuts_modal.svelte`, reusing the existing native
`<dialog>`-based `Modal` component, listing every shortcut across the
player, comments, and general navigation grouped under headings. Wired a
global `?` handler into `+layout.svelte`'s existing `onMount`
(added/removed alongside its other window listeners), guarded the same
way the player already guards its own shortcuts (ignores modifier-key
combinations and input/textarea focus). Verified live: `?` from the
homepage opens the modal with the full grouped list; `Esc` closes it for
free via the underlying native `<dialog>` (no extra code needed); typing
`?` while focused in the comment textarea does not open it.

## 2026-09-20 — Chapter-jump keyboard shortcut (Task 5)

Added a `chapters: { time: number }[] = []` prop to `audio_player.svelte`
and `jumpToPreviousChapter`/`jumpToNextChapter` helpers, wired to
`Ctrl+←`/`Ctrl+→` ahead of the existing "bail on any modifier key" guard
in `onKeydown` (that guard now only applies to Alt/Meta, since Ctrl+arrow
needs to reach the new branch instead of returning early). Wired the
listen page's existing `chapters` derived value into the `<AudioPlayer>`
call; every other caller (`audio_item.svelte`, `quickfeed_player.svelte`)
is unaffected since the prop defaults to empty.

Verified live despite the environment's lack of real audio decode: the
`<audio>` element's `currentTime` property can still be set and read even
at `readyState 0`, but Svelte's `bind:currentTime` only syncs the
component's *internal* reactive copy from a real `timeupdate` event —
which never fires without decode — so an initial test looked like the
jump was "stuck" repeatedly landing on the same chapter. Manually
dispatching `timeupdate` after each `currentTime` set (simulating what
real playback does continuously) confirmed the actual behavior is
correct: successive `Ctrl+→` presses advance 00:00 → 00:01 → 00:02 in
order. Also confirmed plain `←`/`→` (no Ctrl) are unaffected by the
`onKeydown` restructuring — they no-op here only because `seek()`'s own
`isFinite(duration)` guard can never pass without real metadata, which is
the same environment limitation, not a code issue.

## 2026-09-20 — Collapsible comment replies + arrow-key navigation (Tasks 3-4)

Wrapped `comment.svelte`'s recursive reply render in a `<details>`
disclosure (collapsed by default, labelled with the reply count),
matching the same pattern upstream already uses for chapters. Verified
live on the 3-level test thread built during Task 1: each level's "N
replies" summary expands independently, and expanding one level never
auto-expands the next one down.

Added arrow-key navigation on top of that (`comment_list.svelte`): `↑`/`↓`
move between sibling comments at the same nesting level, `→` expands a
comment's own replies and moves focus into the first one, `←` collapses
them and moves focus to the parent (or, for a root comment with no
parent, just collapses and stays put). Implemented as a single shared
keydown handler bound on every nesting level's `<ul>`, guarded by a new
`isNested` prop so only the outermost (page-level) instance actually acts
on a bubbled event — nested instances see `isNested === true` and return
immediately, so a keypress deep in the tree is handled exactly once
regardless of depth. No ARIA roles were changed; every element keeps its
native semantics (heading link, `<details>`/`<summary>`), so Tab-based
navigation and screen-reader browse mode are unaffected — the arrows are
purely additive. Verified all four directions via dispatched
`KeyboardEvent`s against the live 3-level thread (a caveat: the first
`ArrowLeft` test initially looked wrong until realized it was checking
the wrong nesting level's `<details>` state in the test script itself,
not a bug in the app — corrected the assertion and confirmed correct
behavior at every level).

## 2026-09-20 — Pagination page-jump combobox (Task 2)

Replaced the "Page X of Y" text in `audio_list.svelte`'s shared pagination
block with a `<select>` listing every page (current one pre-selected) plus
a "Go" button, keeping the existing Previous/Next links. Since this
component is the single shared pagination renderer for every paginated
route, no other files needed changes. Verified live by temporarily
lowering the homepage's page size to 1 (reverted immediately after,
confirmed via `git diff` showing no residual change) to force multiple
pages: the combobox rendered correctly, selecting page 3 and clicking Go
navigated there, and — importantly — all of the homepage's other query
parameters (`sort`, `order`, the three `filter_*` flags) were correctly
preserved as hidden form fields rather than being dropped, confirmed via
the resulting URL.

## 2026-09-19/20 — Local environment bring-up and merge verification (Task 1)

Brought up the local environment per the spec: `docker compose up -d` for
MariaDB, `npx sequelize-cli db:migrate` (both pending migrations —
`add-audio-edits`, `add-audio-announcements` — applied cleanly against
existing data from prior manual testing), `npm run dev`. Registered two
fresh test accounts (`testadmin`, promoted to admin/trusted via a direct
`UPDATE Users` against the Docker container; `testuser2`, left untrusted
initially to exercise the Trust flow) plus reused an existing `test`
account/data from an earlier session that was already in the persisted
Docker volume.

Live-tested and confirmed working: playlist creation (both empty-then-add
and create-with-clips-preselected), attaching a clip to a playlist during
upload, the "Part of [Playlist Name]" feed link, profile Playlists tab,
`playlist:`/`live:` search prefixes, the Clips/Live Archives/Playlists
filter checkboxes including the "can't uncheck all" rule (verified it
correctly blocks the last checkbox from being unchecked), threaded
comments (posted a 3-level-deep thread across both test accounts, useful
fixture for testing Tasks 3/4 later), comment deletion UI, and the admin
Trust action (confirmed via direct DB check before/after).

### Bugs found and fixed during this pass (each its own commit)

- **Chapters parser broke on real form submissions.** Browsers normalize
  `<textarea>` line breaks to CRLF (`\r\n`) when a form is submitted — this
  is standard, spec'd browser behavior, not something anything here ever
  writes intentionally. `extractChapterSection`/`parseChapterLines` only
  split on `\n`, so every chapter line except the last kept a trailing
  `\r`; since JS regex `.` doesn't match line-terminator characters
  (including `\r`) without the `s` flag, every chapter line but the last
  failed to parse and was silently dropped. Confirmed via `HEX()` on the
  stored description in MariaDB (bytes were `0D0A`, i.e. real `\r\n`, not
  literal backslash-n text). Fixed by normalizing `\r\n` to `\n` before
  splitting. This bug existed on `upstream/main` itself, not introduced by
  our merge.
- **Local dev audio playback was fully broken**, unrelated to any of this
  round's feature work. `src/routes/audio/[id]/+server.ts` (the dev-only
  endpoint noted with a large warning comment against ever modifying it
  for production use) always served `Content-Type: application/octet-stream`
  regardless of the file's real type, and never honored `Range` requests
  (always `200` with the full body, never `206`). Chrome's `<audio>`
  element requires both a correct content type and working Range/206
  support to progress past `readyState 0` — confirmed by testing a
  self-contained `data:` URI, a plain MP3 fetch, and a fully independent
  minimal Node static server serving the same file, all of which
  confirmed the browser's media pipeline needs these regardless of which
  server sends the bytes. Got explicit user sign-off before touching this
  file given its warning comment; fixed by detecting content type via the
  `mime-types` package (falling back to a DB lookup of the `Audio` row's
  stored `extension` for the original upload, which is stored under its
  bare id with no file extension) and implementing real `206 Partial
  Content` responses. Left the `if (!dev)` production gate and the warning
  comment fully intact.
- **Invalid HTML nesting broke hydration on the listen page.**
  `SubscribeButton` (whose root element is a `<form>`) was rendered inside
  a `<p>` in `listen/[id]/+page.svelte`, which is invalid per the HTML
  spec (`<p>` cannot contain block content) and caused a real
  `hydration_mismatch` in the console — the browser silently "repairs" the
  malformed tree during parsing, which can leave client-side event
  listeners attached to the wrong (or wrong-order) DOM nodes after
  hydration. This was very likely part of why some buttons on this
  specific page needed an extra click to register during testing. Fixed
  by moving `SubscribeButton` to be a sibling of the `<p>` instead of a
  child, matching how the same component is already used correctly on the
  user profile page.

### Known limitation of this testing session

The Claude-in-Chrome browser automation tab used for this session's UI
testing has no functioning audio decode pipeline — confirmed by testing a
trivial, fully local `data:` URI WAV that never leaves `readyState 0`,
ruling out the network/server entirely. This means actual audio playback
(does pressing play start audible/decoded playback, does autoplay's
"advance to next track" also start playing it, does the new
`Ctrl+←`/`Ctrl+→` chapter-jump shortcut visibly seek) could not be
verified from inside this session, even after the Range/content-type
fixes above. Everything that doesn't require real audio decoding was
still fully verified (DOM structure, event wiring, keyboard event
dispatch reaching the right handlers, data flowing correctly to the
player). A manual playback checklist is owed to the user at the end of
this work.

## 2026-09-19 — Branch rename + upstream merge

Renamed `feature/playlists-autoplay-filters` to
`feature/listening-experience-upgrades`. Added the `upstream` remote
(`the-byte-bender/audiopub-sv`, the real upstream — distinct from `origin`,
which is the user's own fork) and merged `upstream/main` in
(commit `422f11c`).

13 files had real textual conflicts. Resolution approach per file:

- **`audio_item.svelte`**: kept our side entirely (per-item `AudioPlayer`
  embed, `currentUser`/`onEnded`/`onNext`/`onPrev` props, `playAudio()`
  export) — upstream's corresponding region was empty, i.e. upstream never
  added this at all. Fixed the `ClientsideUser` type import that the
  auto-merge dropped.
- **`audio_list.svelte`**: combined upstream's `processedList`-based grouped
  rendering (the "+N more by this user" disclosure, which had gone dead —
  see "Regressions fixed" below) with our per-item
  `onEnded`/`onNext`/`onPrev`/`bind:this` wiring, resolving each `AudioItem`'s
  index via `audios.findIndex(a => a.id === audio.id)` since the grouped
  view no longer iterates the flat array directly. Also had to re-add the
  `currentUser` prop declaration itself, which the auto-merge silently
  dropped and `npm run check` caught as a real type error.
- **`quickfeed_player.svelte`**: took upstream's side on all 5 hunks —
  unrelated defensive-null-check and share/comment refinements upstream made
  since our fork diverged, nothing feature-specific to us.
- **`database/index.ts`** and **`database/models/audio.ts`**: union merges —
  both sides added genuinely different things (our `Playlist`/`PlaylistAudio`
  models and `isLiveArchive` field vs. upstream's new `AudioEdit` model and
  `isAnnouncement` field), so both were kept.
- **`routes/+page.svelte`** (homepage) and **`routes/search/+page.svelte`**:
  kept our side entirely — upstream's corresponding regions were its older,
  pre-our-feature-work versions (simple `excludeArchives` checkbox, single
  `AudioList` call), fully superseded by our filter/search-prefix rewrite.
- **`routes/profile/+page.server.ts`** and **`routes/user/[id]/+page.server.ts`**:
  union merges — kept our tab-based (clips/archives/playlists) restructure,
  and added upstream's per-item favorite-count computation
  (`AudioFavorite.count` per audio) on top of it. The pre-resolution file had
  a latent bug here: a leftover `for (const audio of audios.rows)` loop
  referencing an `audios` variable that doesn't exist in our tab-based
  version (upstream's auto-merged-in fix assumed upstream's own single-list
  shape) — this would have been a compile error had `npm run check` not
  caught it. Replaced with a `withFavoriteCounts` helper applied to both the
  clips and archives result sets.
- **`routes/upload/+page.server.ts`** and **`routes/upload/+page.svelte`**:
  union merges — kept our playlist multi-select/`isLive` upload flow and
  added upstream's admin-only "pin as announcement" feature alongside it.
- **`routes/listen/[id]/+page.server.ts`**: this file's `load()` function had
  diverged structurally on both sides far more than the flagged conflict
  hunks suggested — several regions auto-merged "cleanly" in a way that was
  silently wrong (see "Regressions fixed" below). Took upstream's full
  `load()` structure (flat comment query + `Comment.constructThreads` for
  proper arbitrary-depth threading, comment-edit feature, notification-read
  marking, redirect-to-live-if-in-progress, per-viewer visibility check that
  also allows the uploader to see their own pending audio) and layered our
  `nextAudioId` computation (used for cross-track autoplay when standing on
  a standalone listen page, added in `2058d1f`) on top. Also replaced the
  `add_comment` action with upstream's version, which validates comment
  length and requires `isVerified`, and fixed two more auto-merge casualties
  in it: a discarded `Comment.create()` return value that the
  follower-notification block needed (`commentInDatabase.id`), and a
  missing `audio` fetch that block also needed. Re-added `subscribe`/
  `unsubscribe` to the exported `actions` object, which the merge had
  silently dropped even though both were still imported.
- **`routes/listen/[id]/+page.svelte`**: same story as its server
  counterpart — auto-merged "cleanly" while silently dropping real upstream
  features that aren't reflected in any conflict marker: the entire chapters
  feature (script logic + rendering), the `export let form` declaration
  needed for edit/reply UI state, `showEditDialog`/`showHistoryDialog`,
  and `onReply`/`commentField` (the "click Reply, focus jumps to the comment
  box" wiring that `comment.svelte` already expects via its `onReply` prop,
  but which nothing on this page ever supplied). All restored. Also
  switched the stream-chat-archive and comments sections to upstream's data
  shape (`archivedStreamId`/`archivedStreamChats`, matching the server-side
  change) and dropped a comment-visibility notice ("You're not trusted yet,
  your comments will be reviewed") that didn't correspond to any actual
  server-side moderation gate — likely inherited confusion with the
  audio-trust gate, not a real feature, and it would have been actively
  misleading given upstream's `add_comment` action has no comment-approval
  queue.

### Regressions fixed as part of the merge

Per the spec, these were folded into the merge commit rather than done as
separate follow-ups, since the same files were already being touched:

- `audio_list.svelte`'s "collapse consecutive uploads by the same user
  behind a disclosure" feature was computed (`processedList`) but the
  template rendered the flat `audios` array instead — dead code. Fixed by
  adopting upstream's `processedList`-based template while keeping our
  autoplay wiring on each rendered item.
- The chapters feature (`## Chapters` heading parsing → clickable
  timestamps, added upstream in `98e8cfe`) was completely absent from our
  branch's `listen/[id]/+page.svelte`. Restored in full from upstream.
- `audio_player.svelte` was missing the AGPL license header every other
  file in the repository carries. Added.

### Verification

`npm run check` — 0 errors (1 pre-existing, unrelated warning: an unused
`currentUser` prop on `audio_item.svelte`, present before this merge, out of
scope). `npm run build` — succeeds.

### Not yet done

Live/manual verification (registering test accounts, exercising playlists,
autoplay, filters, search prefixes, and specifically re-checking whether the
previously-reported "autoplay advances but doesn't start playing" bug is
still present) has not been done yet — that requires the local Docker+dev
environment to be running, which is the next step before starting the new
feature work (pagination combobox, collapsible comments, keyboard
shortcuts).
