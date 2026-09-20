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

## 2026-09-20 — Merged upstream's new mute feature

Upstream (the-byte-bender/audiopub-sv) shipped a user-mute feature (PR #41,
`df7ebb3` + a follow-up fix `4812388`) since our last sync at `f4edaf1`.
Fetched and merged `upstream/main` into this branch. Merge base was
confirmed to be exactly `f4edaf1` (our last reconciliation point), so the
only real changes to reconcile were the mute feature's own 21 touched
files, not the full historical divergence.

### Conflicts resolved (8 files)

- `src/lib/server/database/index.ts` — union: added `UserMute` to the
  models/exports list alongside our `Playlist`/`PlaylistAudio`.
- `src/routes/+page.server.ts` — combined our clips/archives/playlists
  filter logic with upstream's `getMutedUserIds`/`excludeMutedUsers`
  exclusion. Also extended mute filtering to the playlists query and the
  live-streams query, since upstream has no playlists feature to have
  applied it to themselves — muting is documented as hiding "uploads and
  live streams," and playlists are exactly the kind of feed content this
  branch added, so leaving them exempt from mutes would have been an
  inconsistency, not a deliberate design choice.
- `src/routes/listen/[id]/+page.server.ts` — union of our playlist-aware
  next/prev logic with upstream's `isMuted`/`canBeMutedByUser` load-time
  values and `mute`/`unmute` actions. **Caught a silent merge defect**: git
  auto-merged (no conflict markers) a block from upstream that referenced
  a local variable `user`, but our version of this function only declares
  the equivalent value as `viewer` — `user` was never declared in the
  merged result, which would have been a runtime `ReferenceError` on every
  single clip page load. Fixed by using `viewer` instead of re-declaring.
  Caught by reading the merged file in full rather than trusting a clean
  auto-merge to mean a correct one.
- `src/routes/listen/[id]/+page.svelte` — combined our `targetUserId`-
  passing `SubscribeButton` call with upstream's `{#if !data.isMuted}` /
  `{#if data.canBeMutedByUser}` gating and `<MuteButton>`, keeping the
  button block outside the `<p>` (per the earlier hydration-mismatch fix).
- `src/routes/search/+page.server.ts` — this one didn't auto-merge at all
  (whole-file conflict), so it was rewritten by hand: kept our three
  search modes (`playlist:`/`live:`/standard prefixes) and rebuilt each
  branch to also apply upstream's `mutesApply`/`hiddenByMutes` logic,
  including extending it to the playlist-search branch for the same
  reason as the homepage above.
- `src/routes/search/+page.svelte` — same whole-file conflict; rebuilt
  keeping our three-searchType template and `getTitle()`/`<svelte:head>`
  title pattern (upstream's version of this file still used the old
  broken module-level `title` store this session already fixed
  everywhere else — taking it as-is would have reintroduced the
  cross-request title-leakage bug on this one page), plus upstream's
  mute-notice banner.
- `src/routes/user/[id]/+page.server.ts` / `+page.svelte` — same pattern
  as the listen page: union the return fields / imports, gate
  `SubscribeButton` behind `!data.isMuted`, add `<MuteButton>`. The
  `.svelte` conflict also had upstream re-introducing the old stale
  `import title from "$lib/title.js"` + `onMount` pattern with a
  duplicate `export let data` — dropped in favor of our existing
  `getTitle()` line already outside the conflict markers.

### Non-conflicting files double-checked

Went through every file the merge touched without a conflict (`decs.d.ts`,
`notifications/+page.server.ts` and `+server.ts`, `profile/+page.svelte`,
`quickfeed/+page.server.ts` and `api/+server.ts`, the new
`mutes/+page.server.ts`/`+page.svelte`, `mute_button.svelte`,
`user_mute.ts`, `mutes.ts`, the migration) to make sure a clean auto-merge
hadn't hidden another defect the way the listen-page one did. Found one:
the new `src/routes/mutes/+page.svelte` (upstream-authored, never touched
by us before) still used the old `import title from "$lib/title"` +
`onMount` pattern — `npm run check` caught it immediately as a type error
since `title.ts` no longer has a default export. Fixed to match the
`getTitle()`/`<svelte:head>` pattern used everywhere else.

### Verification

`npm run check` — 0 errors, 0 warnings, 1041 files. `npm run build` —
succeeds. Ran the new migration (`db:migrate`) to create the `UserMutes`
table locally. Live-tested the full feature in the browser: registered a
throwaway non-admin account, confirmed the Mute button appears on a
non-admin's profile/clip but correctly does *not* appear for an admin
uploader (admins are exempt from muting on both sides, by design),
submitted a real mute, confirmed the muted user's content disappeared
from the homepage feed and from `playlist:`-prefixed search with the "1
result is hidden because you muted the uploader" notice and working
"Include muted users" toggle-back link, confirmed `/mutes` lists and
unmutes correctly, then unmuted to leave the test DB clean. Zero console
errors through the whole flow.

Committed as a single merge commit,
`merge: pull upstream mute feature into feature/listening-experience-upgrades`,
plus the `db:migrate` step which needs to be re-run by anyone else pulling
this branch.

## 2026-09-20 — Track-change announcements, comment reply hint, playback resume

Three more accessibility/UX items the user asked for directly.

- **ARIA-live track-change announcements**: N/P navigation (and autoplay
  chaining) on the listen page goes through a full `window.location.href`
  reload rather than SvelteKit's client-side `goto()` — deliberately left
  that way rather than converting it, since a client-side nav would need
  the `<audio>` element's `src` swapped and `.load()` called manually on
  every track change with no way to verify actual playback behaves
  correctly in this browser-automation environment (confirmed earlier
  this session to have no audio decode pipeline at all). Given that
  constraint, added `src/routes/listen/[id]/+page.svelte`'s own
  `aria-live="polite"` `.sr-only` region (matching the established pattern
  already used in `quickfeed_player.svelte`'s `announceStatus`), populated
  imperatively via `bind:this` + a post-mount `setTimeout`, not a reactive
  `{expression}` — a live region's content has to change *after* it's
  already registered with the screen reader for the change to be
  announced at all; content that arrives already-populated in the initial
  SSR markup (which a reactive binding would produce) doesn't count as a
  change and won't be announced. Fires "Now playing: {title}" ~300ms
  after every page load, reinforcing (not replacing) the native
  page-title announcement screen readers already give on full navigation.
- **Comment reply-count hint**: the arrow-key comment navigation focuses
  the whole `.comment` container (from an earlier fix this session), but
  a comment's reply count and the collapsed `<details class="replies">`
  disclosure live in a sibling element outside that container — so a
  screen reader landing on a comment via arrow keys never heard "3
  replies" and had no way to know pressing right arrow would reveal them.
  Added an SR-only `<span>` inside `.comment` itself (so it's part of
  what's read when the container is focused) stating the reply count and,
  reactively via `bind:open` on the replies `<details>`, either "press
  right arrow to expand" or "replies expanded, press left arrow to
  collapse" depending on current state. Verified live that dispatching a
  real ArrowRight keydown on a comment updates both `details.open` and
  the hint text together, and that focus correctly lands on the first
  reply.
- **Resume playback position per track**: `audio_player.svelte` gained an
  optional `audioId` prop (only listen/[id] passes it; the upload page's
  announcement preview and the live-stream player don't, so they're
  unaffected). When set, position is saved to
  `localStorage["audiopub_playback_{id}"]` on `pause`, every 5 seconds
  while playing, and on `beforeunload` (covers the common case of
  navigating away mid-playback via N/P without pausing first — `pause`
  alone wouldn't catch that). Restored on `loadedmetadata` if the saved
  position is past 5 seconds in and not within the last 5% of the track's
  duration (skips both "resume 3 seconds in" and "resume the tail end of
  a track you already finished"); cleared entirely on `ended`, matching
  YouTube not offering to resume a completed video. Verified live via
  direct event dispatch: save-on-pause, restore-on-loadedmetadata,
  clear-on-ended, and both the near-start and near-end skip conditions
  all behaved correctly.

### Verification

`npm run check` — 0 errors, 0 warnings, 1041 files. `npm run build` —
succeeds. All three verified live in the browser (not just type-checked):
the live region's text after N/P navigation, the SR-only hint text and
its state change on a real ArrowRight dispatch, and the full playback-
position save/restore/clear cycle including edge conditions. Zero console
errors throughout. Committed as three atomic commits: `feat: announce
track changes via aria-live on the listen page`, `feat: announce reply
count and expand hint when navigating comments`, `feat: remember and
resume playback position per track`.

## 2026-09-20 — Filter-state regression and a wider sweep

The user reported, sharply, that applying filters on the homepage, then
visiting a clip, moving around with N/P, and returning home via the nav's
"Home" link reset the filters back to default — and that this had been
raised before. Root cause: filters/sort live entirely in the URL's query
string (`+page.server.ts` reads `filter_clips`/`filter_archives`/
`filter_playlists`/`sort`/`order` straight off `event.url.searchParams`),
but the nav's Home link, like most "go back to the homepage" links, is a
bare `href="/"` with no query string at all — so every such navigation
silently fell through to the hardcoded defaults, discarding whatever the
user had deliberately chosen, no matter how recently.

Fixed with a cookie (`audiopub_home_filters`, `src/routes/+page.server.ts`):
whenever a request arrives with explicit filter or sort params, the
resolved values are saved to a 1-year cookie; whenever a request arrives
*without* them (a bare `/`), those saved values are used as the fallback
before finally defaulting to clips+archives+playlists all on, sorted by
date descending. Explicit params in the URL always take precedence over
the cookie, so the "Apply Filters" form and paginated links (which already
carry full filter+sort query strings) are unaffected and immediately
update the saved cookie on every change. Verified live end-to-end exactly
as reported: applied `playlists` off + sort by title ascending, opened a
clip, clicked Next, clicked the nav's Home link, and confirmed via the
DOM that the filter panel still reflected `playlists` off and the sort
selects still showed title/ascending — with a bare `/` URL and no query
string in sight.

Given the explicit instruction to stop being lazy about what *can* be
tested and sweep thoroughly, went looking for the same class of bug
elsewhere rather than considering the ticket closed:

- **Found a real one**: the Autoplay checkbox lives in `audio_player.svelte`
  with its own private `autoplayEnabled`, while the decision to actually
  auto-advance on `ended` lives in `listen/[id]/+page.svelte`'s own,
  *separate* `autoplayEnabled` variable — both read the same
  `audiopub_autoplay` localStorage key on mount, so a fresh page load was
  always consistent, but toggling the checkbox mid-session only updated
  the child's copy. The page's `handleEnded()` kept acting on a stale
  value until the next full navigation resynced it — so switching autoplay
  off mid-track and letting it end would still silently advance anyway.
  Fixed by making `audio_player.svelte`'s `autoplayEnabled` an
  `export let` and binding it from the page (`bind:autoplayEnabled`),
  making it one shared value instead of two independently-initialized
  copies. Verified live in both directions via direct event dispatch:
  toggled off mid-session then dispatched `ended` → no navigation;
  toggled back on → `ended` correctly navigated to the next track.
- **Found a related one while in there**: that same Autoplay checkbox
  rendered unconditionally, including on the live-stream player (where
  there's no "next track" for it to affect at all) and on the upload
  page's pinned-announcement preview player, where toggling it would
  silently rewrite the user's site-wide `audiopub_autoplay` preference as
  a pure side effect of poking at a preview embed. Added a
  `showAutoplayToggle` prop (default on) and hid it for `live` players and
  explicitly for the upload-page preview.
- Re-verified, rather than assumed, several other areas this session
  touched or could plausibly have regressed: the "at least one filter
  must stay checked" guard (still reverts correctly), the `?` keyboard-
  shortcuts modal (initially looked broken against a `[role="dialog"]`
  selector — false alarm, it uses a native `<dialog>` element which
  doesn't need that role, confirmed working via `dialog.open`), the
  `live:` search prefix (still returns live-archive results, no errors),
  and a full real playlist-creation flow end-to-end (registered account →
  verified/trusted directly in the dev DB since there's no UI shortcut for
  that → uploaded a real test clip → created a playlist containing it →
  confirmed it appears correctly grouped on the homepage as a collapsed
  H3/H4 disclosure alongside the pre-existing seed playlists) — all clean,
  no regressions found in these areas. Also chased down what looked like a
  checkbox-label accessibility bug (`read_page` reported a raw UUID as a
  checkbox's name on the playlist-create page) that turned out to be a
  limitation of that inspection tool's own accessible-name heuristic, not
  a real bug — the actual DOM has a proper `<label>` wrapping the checkbox
  with the track's real title, which is what a real screen reader
  computes from.

### Verification

`npm run check` — 0 errors, 0 warnings, 1041 files. `npm run build` —
succeeds. All fixes verified live via real browser interaction (form
submissions, real navigations, direct event dispatch), not just read for
plausibility. Test artifacts (a throwaway account's test upload and
playlist) cleaned up from the dev DB afterward. Committed as two atomic
commits: `fix: persist home filter and sort selections across bare
navigations`, `fix: sync autoplay toggle with page state and scope it
away from previews`.

## 2026-09-20 — Continued sweep: two more real staleness bugs found live

Told to keep sweeping. Re-verified comment posting, replying (with focus
landing correctly in the textarea and the "Reply to @user:" label),
threaded nesting, and deletion (via the real confirm-modal flow, not a
native `confirm()` — confirmed no blocking dialog issue there) end to
end via real form submissions — all clean. Favorite toggle confirmed both
directions. The `?` shortcuts modal, `live:` search prefix, and a full
real playlist-creation flow (registered account, verified/trusted
directly in the dev DB, uploaded a real file, created a playlist,
confirmed it renders correctly grouped on the homepage) were also
re-checked from the previous round and are unaffected by the latest
commits.

Two more real bugs found through actually clicking through boundary
conditions rather than assuming the existing code was fine:

- **Prev/Next buttons stayed clickable at the very first/last track**:
  clicking "Previous track" on the chronologically newest clip (nothing
  before it) fell through to `window.history.back()` — a jarring,
  unexplained navigation with zero cue beforehand that there was nothing
  to go back to. A screen reader user has no way to know a button won't
  do what its label says until after clicking it. Added `hasNext`/
  `hasPrev` props to `audio_player.svelte` (default `true`, so callers
  that don't track boundaries are unaffected) and `disabled` the
  corresponding button, with matching dimmed styling. The listen page now
  passes `hasNext={!!data.nextAudioId}` / `hasPrev={!!data.prevAudioId}`.
  Verified live at the actual newest clip (prev disabled, next enabled),
  the actual oldest clip (next disabled, prev enabled), a mid-list clip
  (both enabled), and — since the playlist-aware next/prev logic added
  earlier this session computes these same two fields — at both ends of
  a real playlist too, confirming the `?playlist=` context is respected
  by the disabled state as well as the navigation itself.
- **Chapter-jump and seek got stuck, and the seek bar/time display froze,
  after any programmatic seek while paused**: `jumpToNextChapter`,
  `jumpToPreviousChapter`, and `seek()` all computed the target position
  from the component's *bound* `currentTime`/`duration` variables rather
  than the audio element's live values. `bind:currentTime` only resyncs
  from the `timeupdate` event, which the browser does not fire for a
  programmatic `.currentTime` assignment while paused — so a second
  Ctrl+Right press while paused would still compute from the position
  *before* the first press, landing on the same chapter again instead of
  advancing. Verified live: before the fix, two Ctrl+Right presses in a
  row from a fresh load produced `[1, 1]` instead of `[1, 2]`. Fixed the
  three functions to read `audioElement.currentTime`/`.duration`
  directly (matching the pattern already used in this session's own
  `savePlaybackPosition`/`restorePlaybackPosition` for the same reason).
  Re-verified: `[1, 2]`, correctly advancing.

  Fixing that surfaced a second, worse half of the same bug while
  checking the result: the actual audio position now advanced correctly,
  but the *visible* seek bar, the "0:01" time text, and the slider's
  `aria-valuetext` all stayed frozen at the old value — confirmed live,
  reading the real DOM after a paused Ctrl+Right: `audio.currentTime`
  correctly read `1`, but the on-screen time text and `aria-valuetext`
  still read `0:00`. This is a real, user-facing (and screen-reader-
  facing) bug: the actual playback position silently diverges from what
  a user is told the position is, until they press Play and a
  `timeupdate` finally fires to reconcile them. Root cause is the same
  `timeupdate`-only resync — fixed by adding a `setPosition(time)` helper
  that sets `audioElement.currentTime` *and* the reactive `currentTime`
  variable together, and routing every programmatic seek through it
  (`seek`, `jumpToPreviousChapter`, `jumpToNextChapter`,
  `restorePlaybackPosition`, and `onSeekInput`, which already did this
  correctly by hand and is now just using the shared helper). Re-verified
  live: after the fix, the same paused Ctrl+Right press correctly showed
  `"0:01"` in the time text and `"0:01/0:00"` in `aria-valuetext`
  immediately, no play required. (The seek bar's own visible `value`
  still reads back as `"0"` in this environment specifically because
  `duration` never loads at all here — no working audio decode pipeline,
  confirmed earlier this session — which makes the range input's `max`
  `"0"` and the browser's own native value-clamping forces it back down;
  that part isn't fixable from here and isn't this bug, it's the
  pre-existing, already-documented environment limitation.)

  Also spot-checked whether the same class of bug affects playback speed
  cycling and mute/volume, since those also read a bound reactive
  variable — confirmed clean, because `ratechange` and `volumechange`
  (unlike `timeupdate`) fire reliably for programmatic changes regardless
  of play state, so `cycleSpeed()` and the mute toggle don't have the
  staleness problem. Verified live: four speed-button clicks in a row
  correctly cycled `1× → 1.25× → 1.5× → 2×`, and mute/unmute correctly
  toggled `audio.muted` and the button's `aria-label` both directions.

### Verification

`npm run check` — 0 errors, 0 warnings, 1041 files, after every change
in this round. `npm run build` — succeeds. Every fix in this round was
verified against real, live browser behavior (real DOM reads, real
keydown dispatches, real boundary data queried from the dev DB first),
not inferred from reading the code. Committed as three atomic commits:
`fix: disable prev/next buttons at the start/end of the feed`, `fix: seek
and chapter-jump from live audio state, not stale bindings`, `fix: sync
seek bar and time display after programmatic seeks while paused`.

## 2026-09-20 — Final sweep round: admin actions, auth, account flows

Told to keep sweeping until confident nothing else was broken. Granted
`mutetester1` (the throwaway test account used throughout this session)
temporary admin rights directly in the dev DB to reach the admin-only
surface that had never been exercised this session, then reverted it
afterward.

Verified clean, no new bugs, across: the admin panel (pending approvals /
recent-edits list), the warn action on a real user, the full edit-audio-
details flow (save a real change, confirmed via direct DB read), "View
edit history" → "Revert this edit" (initially looked broken — the marker
text used in the test edit was still findable in `document.body
.textContent` after reverting — but tracing it down showed the matches
were inside a *closed* `<dialog>` correctly preserving the historical
before/after record, and inside the inert SvelteKit hydration payload
`<script>`; the actual live, rendered description and parsed chapter list
were confirmed clean via `Audios.description` in the DB directly and via
the chapter buttons' rendered text — a real revert, a false alarm from
checking `body.textContent` too broadly rather than the specific visible
element, same mistake class as two earlier false alarms this session),
pin/unpin as announcement (and cross-checked it correctly renders on the
upload page's preview with the autoplay toggle still correctly hidden,
confirming an earlier fix from this session), the download link (real
`HEAD` request, 200, correct content-type), the Share button's graceful
`.catch()` handling of the browser's "not a real user gesture" rejection
(expected from a synthetic click, not a bug), stream key reset, playlist
deletion (used a real throwaway playlist, and got past the native
`confirm()` block from earlier this session by overriding
`window.confirm` before triggering it, rather than the real dialog —
confirmed the row was actually gone from the DB afterward), duplicate-
username and duplicate-email registration validation, and wrong-password
login rejection (first attempt looked like it silently failed with no
error message at all — turned out the test itself put a non-email string
into a `type="email"` input, which the browser's own native constraint
validation blocks before the form ever reaches the server; redone with a
syntactically valid-but-wrong email, the real "Invalid email or password"
message appeared correctly, and the session was confirmed to have stayed
as the original account rather than silently switching).

Also noted, but deliberately left alone as pre-existing and not
regressions: the Share button's clipboard-fallback path uses a blocking
native `alert("Link copied to clipboard")` rather than a non-blocking
announcement, and a successful profile update redirects to the homepage
rather than back to the profile page. Both look like original design
choices from before this session rather than bugs, and changing either
would be a UX judgment call beyond what was asked — flagging them here in
case the user wants either changed on purpose later.

### Verification

`npm run check` — 0 errors, 0 warnings, 1041 files. Working tree clean,
nothing left to commit — every fix from this round of sweeping had
already landed in the previous four commits. No code changes this round;
this entry documents the verification-only pass. Test artifacts (a
throwaway playlist, a temporary admin grant) cleaned up from the dev DB
afterward.

## 2026-09-20 — Comment editing + history, and playlist reassignment

Two new features, both explicitly scoped and approved by the user first
rather than implemented speculatively — asked "are these feasible and
maintainable" about extending editing to comments (with an audit trail
for admins) and to playlist membership after upload, and about a live-
stream question along the way.

**How live-archive marking actually works** (asked, not a code change):
opt-in per stream via the "Archive this stream when finished" checkbox
on `/live/new`, not automatic across the board. If checked,
`src/lib/server/streaming.ts` transcodes the captured audio via ffmpeg
and creates an `Audio` row with `archivedStreamId` set (which is what
makes `isLiveArchive` true everywhere downstream) when the stream ends;
if unchecked, the stream row is just destroyed. The *marking* is fully
automatic once opted in — there's no separate manual step — but whether
a stream becomes an archive at all is the streamer's choice at start
time.

**Live-stream testing**: verified stream creation, the confirm-modal-
gated "End Stream" flow (correctly destroys an unarchived stream with no
orphaned row, confirmed via direct DB read), and live chat send — all
clean. Could not test actual audio streaming into a live source: that
needs a running Icecast server, and none exists in this environment
(only MariaDB is dockerized here, and there's no `icecast`/`icecast2`
binary installed) — the same class of environment gap as the browser's
missing audio-decode pipeline, not a code bug. Confirmed via reading the
code that chapters currently don't apply to a live stream at all (the
live page never passes a `chapters` prop, and there's no way to edit a
stream's description while live in the first place) — the user's
response was that this is intentional and chapters should stay archive-
only, so no work was done there.

**Comment editing + history** (`feat: let comment authors and admins
edit comments with history`): new `CommentEdit` model + migration
(`src/lib/server/database/migrations/20260921000001-add-comment-edits.cjs`)
mirroring the existing `AudioEdit` pattern exactly — purely additive, no
changes to any existing table. New `src/lib/server/comment_edits.ts`
helper (`updateCommentContent`, `MAX_USER_COMMENT_EDITS = 3`, same
transaction-locked read-then-write shape as `audio_edits.ts`). An
"Edit" button next to Reply/Delete on a comment you own (or any comment,
if admin — same gate as Delete already uses), inline textarea replacing
the rendered markdown while editing, `(edited)` tag shown to everyone
once a comment has any edits, and — admin-only — a collapsed
`<details>`/`<ol>` directly on the comment (matching the existing
"N replies" disclosure pattern, not a separate modal, per the request
to "expand a collapsed div and view a list of old versions") listing
every previous/new content pair with editor and timestamp, newest first.
`Comment.toClientside()` gained optional `editsByCommentId`/
`isAdminViewer` parameters rather than an eager Sequelize include, fetched
as one separate flat query in the page load (same reasoning as the
existing `AudioEdit.findAll` — keeps the comment-tree query simple and
avoids row multiplication across the reply hierarchy) then grouped by id
in JS.

**Playlist reassignment** (`feat: let clip owners and admins reassign
playlist membership`): per the user's own answer to a direct question,
extends the existing "Edit audio details" modal on the listen page with
a playlist-checkboxes section, rather than a new dedicated page — reuses
the modal's existing permission/edit-count infrastructure as-is. No
schema change needed; `PlaylistAudio` already supports arbitrary
add/remove. Checkboxes are scoped to the *clip owner's* own playlists
(not the editing admin's), matching the ownership rule already enforced
at upload time — otherwise an admin editing someone else's clip could
add it to a playlist that isn't even the owner's. The `edit` action now
tracks `detailsChanged` and `playlistsChanged` independently, so saving
a playlist-only change (no title/description edit) no longer incorrectly
reports "no changes were made."

### Verification

`npm run check` — 0 errors, 0 warnings, 1043 files. `npm run build` —
succeeds. Ran the new migration locally. Live-verified end to end: posted
a real comment, edited it, confirmed the `(edited)` tag and the exact new
content persisted (checked `Audios`/`Comments` tables directly, not just
the rendered page); edited it two more times and confirmed the 4th edit
was correctly rejected with the limit message and never saved; as admin,
expanded the edit-history disclosure and confirmed all 3 edits listed
with correct before/after pairs in the right order. For playlist
reassignment: confirmed the pre-checked state matched real
`PlaylistAudios` rows exactly (caught my own wrong assumption about
which seed user owned which playlist by checking the DB directly rather
than guessing), unchecked one, saved, confirmed the row was actually gone
from `PlaylistAudios` and that both the homepage feed card and the
playlist's own page reflected the removal, then restored it. Split into
two atomic commits by temporarily reverting one feature's hunks in the
two files both features touched, committing the other, then reapplying —
then re-verified both features live again afterward against the
reconstructed, split commits (not just re-reading the diff) to make sure
nothing broke in the split. Zero console errors throughout. Test comments,
the temporary admin grant, and the temporary playlist-membership change
were all cleaned up from the dev DB afterward.

## 2026-09-20 — Collapsed username menu for account links

Brainstormed as a bounded task (a well-scoped nav change reusing an
existing pattern already in this codebase) before implementing, per the
user's request to add a collapsed submenu for account-related links
analogous to the existing "Create" dropdown.

While investigating the existing nav structure to design this,
found that **`/subscriptions` was rendered completely outside the
`{#if data.user}` check** — visible to logged-out visitors, who can't
usefully do anything with it. Confirmed and documented as its own actual
bug fix, separate from the new feature: moved the link inside the
verified-user branch (same place `/notifications` and `/favorites`
already lived) as its own commit, verified live that a logged-out nav
now reads just "Home Quickfeed Login Register", before building the
collapsed-menu feature on top of the corrected baseline.

`src/routes/+layout.svelte`: a second `<details class="create-menu">`
(reusing the exact same CSS classes as the existing Create dropdown — no
new visual language) with the summary set to the logged-in user's
username rather than a generic label, containing Subscriptions,
Notifications, Favorites, Profile, and Logout. Admin Panel stays a
separate top-level link outside the dropdown, per explicit instruction.
Since collapsing the Notifications link behind a closed dropdown would
otherwise hide the at-a-glance unread-count signal the nav used to give
for free, the summary itself now shows it too — as "{n} notification" /
"{n} notifications" rather than a bare number, per explicit correction —
so a user (or screen reader) doesn't have to expand the menu just to
learn whether they have anything new.

### Verification

`npm run check` — 0 errors, 0 warnings, 1043 files. `npm run build` —
succeeds. Live-verified: nav structure and collapsed/default-closed state
for both dropdowns; inserted a real unread notification directly in the
dev DB and confirmed the summary read "mutetester1 1 notification" (correct
singular) and the expanded dropdown's Notifications link still carried
its own badge too — had to work around the unread-count poller's existing
`document.visibilityState === "hidden"` guard not firing in this
automation tab (a pre-existing, correct guard, not a bug) by simulating a
visibility-change event to trigger the fetch; confirmed the logged-out-nav
fix; confirmed Admin Panel renders as a separate top-level link, not
inside the dropdown, for an admin account. Split into two atomic commits
by reverting to the pre-existing file, applying and committing the bug
fix in isolation, then reapplying the full feature on top of that fixed
baseline and re-verifying live again before the second commit — `fix:
hide Subscriptions nav link when logged out`, `feat: collapse account
links into a username menu`.
