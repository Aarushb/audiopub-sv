# Listening Experience Upgrades — Progress Log

## 2026-09-20 — Continued regression sweep after the previous round of fixes

Dev server was killed (accidentally, per the user, likely an environment
hiccup — not something either side did deliberately) and restarted cleanly
on port 5173 after clearing a stale orphaned `node.exe` still holding the
port. Session persisted fine (JWT cookie is DB-backed, unaffected by a
server restart).

Continued the "play around and find regressions" sweep the user asked
for, this time systematically re-testing everything touched by the prior
round's fixes plus previously-unverified actions:

- **Favorite/unfavorite** on the listen page: confirmed both directions
  toggle correctly.
- **Audio editing** (`canEdit`/`edit`/`revertEdit`, restored during the
  original merge but never live-tested until now): submitted a real title
  edit, confirmed the `[edited]` tag appears and "View edit history" shows
  it.
- **Announcement pin/unpin**: confirmed the `[announcement]` tag toggles
  on the listen page, and that upstream's own design *does* embed a
  dedicated `AudioPlayer` for pinned announcements on the upload page
  specifically (checked upstream's real file to confirm this is
  intentional, not the same "no player in feeds" issue fixed earlier — it
  only applies to this one special-cased announcement callout).
- **Subscribe/unsubscribe** (as testuser2, on testadmin): confirmed via
  the listen page's SubscribeButton, and confirmed no hydration-mismatch
  console errors reappeared (verifying the earlier `<p>`-nesting fix
  holds).
- **Comment deletion**: posted a comment as testuser2, deleted it through
  the real UI (delete button → confirmation modal → confirm), verified it
  was actually removed from the database, not just hidden client-side.
- **Admin warn action**: submitted a real warning against testuser2,
  confirmed the correct email content was logged to the dev server
  console (`NO_EMAIL=true` path).
- Structural diff-checked `listen`, `upload`, `profile`, and `user/[id]`
  pages' forms/buttons/actions against upstream's real files to catch any
  other silently-dropped pieces from the merge before they surface as
  more bug reports.

### Bugs found during this sweep

- **Follow/unfollow-notifications button was completely missing** from
  the listen page template — a genuine regression from the original merge
  reconciliation (not something touched by the more recent fixes). The
  server-side `isFollowing` data and `follow`/`unfollow` actions were
  still fully intact; only the template markup rendering the button had
  been dropped. Restored verbatim from upstream's structure, verified the
  full follow → unfollow round-trip live.
- **Three page titles were silently broken** (`user/[id]`, `playlist/[id]`,
  `search`) — self-inflicted, from the batch shell script used to insert
  `<svelte:head>` blocks across 21 files in the previous round: the
  double-quoted template-string arguments (`` `Profile of ${...}` `` etc.)
  got mangled by shell interpretation before reaching `perl`, silently
  truncating to just the literal prefix and losing the interpolated part
  entirely (e.g. `Profile of ${data.profileUser.displayName}` became just
  `Profile of `). Caught by noticing an empty-looking browser tab title
  while testing an unrelated admin action, then confirmed via `curl`
  against raw SSR output. Fixed directly, then did a full manual review
  of all 23 pages' `<title>` expressions (not just the 3 broken ones) to
  rule out further shell-escaping casualties — none found.

## 2026-09-20 — User-reported regressions and bugs (post-handoff)

The user tested manually and reported the previous handoff was incomplete.
Four issues, investigated and fixed in order:

### 1. Feed cards showed an embedded audio player — design regression

The prior agent's branch had added a full `AudioPlayer` embed to every feed
card (`audio_item.svelte`), which is not how upstream's own version works
(confirmed by re-checking `upstream/main`'s actual file, already fetched
during the merge: it's a plain card — title link, byline, description, no
player). Per explicit user direction ("upstream takes precedence... the
audio player should only show up when you go to the clip itself"), restored
`audio_item.svelte` to upstream's card-only layout (keeping our "Part of
[Playlist]" line addition), and stripped the now-dead
`onEnded`/`onNext`/`onPrev`/`itemComponents`/`currentUser` wiring out of
`audio_list.svelte` and its 6 caller routes. Verified live: feed cards now
match upstream's layout with no player; the listen page's own player is
untouched. This also incidentally cleared the one pre-existing
`audio_item.svelte` `currentUser`-unused-export warning `npm run check`
had been carrying all session.

### 2. Next/prev track regressed inside playlists

Removing the embedded feed players (above) also removed the *only*
mechanism that had ever respected playlist order for next/prev — the
listen page's own `nextAudioId` was (and always had been) purely global
chronological ("next audio anyone uploaded"), with no playlist awareness,
and "prev" was literally just `window.history.back()`, never a real
concept. Fixed by threading playlist context through the URL: playlist
pages now link to tracks with `?playlist=<id>`; the listen page's
`load()` computes next/prev from that playlist's own `PlaylistAudio.order`
when the param is present, falling back to the pre-existing global
chronological behavior (extended to also support `prevAudioId`, not just
next, replacing the old browser-back-only fallback) otherwise; and N/P/
autoplay-continuation preserve the `?playlist=` param across the chain so
it doesn't drop after the first hop. Verified live: created a 2-track
playlist, confirmed N/P walk playlist order and stay within it, then
confirmed plain (no-playlist) N/P still walks the global chronological
order as before.

### 3. Wrong page title read by screen reader on navigation — severe, sitewide

Root cause was two-fold, both pre-existing (not introduced this session):

- `$lib/title.ts` exported a **module-level** Svelte store. On the server,
  a module is loaded once and shared by every request in the process —
  three pages (`+page.svelte`, `favorites/+page.svelte`,
  `quickfeed/+page.svelte`) called `title.set(...)` unguarded by
  `onMount`, so their SSR render mutated that shared global, and whichever
  page rendered last on the server leaked its title into the *next*
  unrelated request's initial HTML until client hydration corrected it —
  confirmed via `curl` showing `/favorites`'s title bleeding into an
  unrelated `/listen/[id]` request right after. This is exactly what the
  user's screen reader was reading on page load, before "eventually"
  correcting itself once JS hydrated.
- Separately, every other page set its title only inside `onMount`, which
  never runs during SSR at all — so their initial rendered `<title>` was
  always just the hardcoded default, correct only after hydration.

Fixed properly rather than patched around:
- `$lib/title.ts` now exports `createTitleStore()`/`getTitle()` built on
  Svelte's `setContext`/`getContext`, called once in the root layout and
  read by every page — correctly scoped per request, eliminating the
  leak by construction (no shared mutable global left at all).
- Discovered (by direct empirical testing, after an incorrect first theory
  about `<svelte:head>` source-order) that a `<title>` declared in a
  layout's `<svelte:head>` always wins over a page's own, regardless of
  where either is positioned — so no amount of reordering within the
  layout could ever let a child page's title through. The actually-correct,
  idiomatic-SvelteKit fix: the layout renders no `<title>` of its own at
  all; every one of the 23 pages (22 that already had `title.set()` calls,
  plus `notifications/+page.svelte`, which had never set one at all) now
  renders its own `<svelte:head><title>{expr} | audiopub</title></svelte:head>`
  directly, using the same expression each page already had. The
  unread-notifications-count prefix (inherently client-only anyway, since
  it depends on a fetch that never resolves during SSR) is now applied via
  a small reactive `document.title` mutation in the layout post-hydration,
  instead of through `<svelte:head>`.
- Verified via `curl`: every page now shows its own correct title from the
  very first byte of the response, and rapid alternating requests to
  different pages no longer leak into each other.

### 4. Comment arrow-key navigation only announced the username link

Confirmed this was a real, related instance of the same rich-content-vs-
single-focus-target problem discussed during design (the one that ruled
out an ARIA tree). The arrow-key handler was moving focus to each
comment's heading *link* (`.comment h3 a`), so a screen reader landing
there only ever announced the link's own accessible name ("username"),
never the actual comment body. Fixed by making the whole `.comment`
container focusable (`tabindex="-1"`, matching the exact pattern
`audio_player.svelte` already uses for its own programmatic-focus root)
and re-targeting all four navigation directions at that container instead
of the link — a screen reader landing there now reads the full rendered
comment (author, timestamp, body). Since `tabindex="-1"` keeps the
container out of the normal Tab order (by design, so Tab-only keyboard
users are unaffected), the handler still also accepts the heading link as
a valid trigger, since that's the real Tab-reachable entry point into a
thread; every move re-targets the container regardless of which one
fired it. Verified live via dispatched `KeyboardEvent`s down a 3-level
thread: each `→`/`←` move now lands on a container whose `textContent`
includes the full comment, not just the author name.

All four verified with `npm run check` (0 errors throughout) and
`npm run build` after each fix, plus live browser verification.


Spec: `docs/superpowers/specs/2026-09-19-listening-experience-upgrades-design.md`

## 2026-09-20 — Final regression pass (Task 7)

`npm run check` and `npm run build` both pass clean (0 errors; the one
pre-existing `audio_item.svelte` `currentUser` unused-export warning
remains, unrelated to this work). Spot-checked `/quickfeed`, `/favorites`,
`/admin`, `/profile`, and `/profile?tab=playlists` for console errors
after all six feature/fix commits — none found.

### What shipped

Merge-forward from `upstream/main` plus three bugs found and fixed along
the way (chapters CRLF parsing, dev audio endpoint content-type/range
support, invalid `<p>`-wraps-`<form>` HTML nesting), then four new
features: the pagination page-jump combobox, collapsed-by-default comment
replies with arrow-key navigation, a `Ctrl+←`/`Ctrl+→` chapter-jump
shortcut, and a global `?` keyboard-shortcuts help modal. All committed
as atomic, single-line Conventional Commits on
`feature/listening-experience-upgrades`.

### Explicitly deferred to the user

Real audio playback (does Play actually start audible playback, does
autoplay both advance *and* play the next track, does the chapter list's
click-to-seek work) could not be verified from inside this session — the
browser automation tab used throughout has no functioning audio decode
pipeline at all (confirmed with a trivial local `data:` URI that never
progresses past `readyState 0`, ruling out the network/server). Everything
that doesn't require real decoding was verified directly (DOM structure,
keyboard event dispatch reaching the correct handlers, `currentTime`
advancing correctly through chapters once `timeupdate` fires, as it
would during real playback). A short manual checklist covering just the
playback-dependent items is owed to the user to close this out.

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

## 2026-09-20 — Filter panel default-collapse and playlist grouping

Addressed three more issues the user found personally testing:

- **Filter panel forced open**: the homepage's `<details class="filter-section">`
  had a hardcoded `open` attribute, so "Filter & Sort Options" always
  rendered expanded regardless of user preference, cluttering the page.
  Removed the attribute (`src/routes/+page.svelte`). Since this is a plain
  `<details>` with no client-side open-state binding, every fresh page
  load (including navigating to a clip and back to the homepage) now
  starts collapsed by default, while the actual filter/sort *selections*
  continue to round-trip through the URL query params exactly as before —
  only the disclosure widget's visual open/closed state changes, not the
  applied filters. Committed as `fix: collapse filter panel by default on
  homepage`.

- **Playlists cluttering the feed uncollapsed**: playlists in the
  homepage, search results, and both profile pages' Playlists tab were
  rendering as fully-expanded `<article>` cards showing every track
  inline. Extracted a new shared `src/lib/components/playlist_item.svelte`
  that renders each playlist as a collapsed `<details>`: the playlist name
  is a plain-text `<h3>` inside `<summary>` (kept as plain text rather
  than a nested link, since a link inside `<summary>` creates ambiguous
  click-target behavior — the whole summary already toggles on click), at
  the same heading level as individual clip titles so screen-reader users
  jumping by heading get a consistent, flat list of "things in the feed."
  Expanding it reveals the byline and the track list, each track rendered
  as an `<h4>`-headed link nested one level below the playlist's `<h3>`,
  properly reflecting the parent/child relationship for accessibility
  purposes. Each track link carries `?playlist={id}` so clicking through
  still feeds into the playlist-aware next/prev navigation built earlier.
  An explicit "Open playlist page" link compensates for the heading no
  longer being a direct link. Replaced the four near-duplicated inline
  `<article class="playlist-card">` blocks in `+page.svelte`,
  `search/+page.svelte`, `profile/+page.svelte`, and `user/[id]/+page.svelte`
  with `<PlaylistItem {playlist} />` (the latter two pass
  `showOwner={false}` since the byline is redundant on a user's own
  profile page). Committed as `feat: collapse playlists in feed views
  behind h3/h4 disclosure`.

- **"N more by [user]" grouping — merge survival check**: the user asked
  whether upstream's existing "and N more by [user]" collapse-consecutive-
  uploads feature survived the merge. Confirmed it did: `audio_list.svelte`
  still has the `groupThreshold` prop (default 3) and the "And {N} more by
  {displayName}" grouping logic fully intact and wired into every
  `<AudioList>` call site. This is a separate, pre-existing feature from
  the new playlist-grouping work above (it groups an individual uploader's
  consecutive clips, not playlists) and was not touched this round.

### Verification

Live-verified in the browser (not just `npm run check`/`npm run build`,
both of which passed clean — 1034 files, 0 errors/warnings): navigated to
the homepage, confirmed the filter panel rendered collapsed and all four
seeded playlists rendered as collapsed cards, expanded "Nav Test Playlist"
and confirmed via direct DOM inspection (`document.querySelectorAll`) that
it renders `open`, its `<h3>` reads "Nav Test Playlist", and its two
tracks are real `<h4>` elements each linking to
`/listen/{id}?playlist={playlistId}` — with the other three playlists
still closed. No console errors from the interaction.

### Still open

The "keep sweeping for other bugs" directive remains active and
unfinished — continuing to look for regressions beyond the two items
above.
