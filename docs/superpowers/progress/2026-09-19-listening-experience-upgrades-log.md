# Listening Experience Upgrades — Progress Log

Spec: `docs/superpowers/specs/2026-09-19-listening-experience-upgrades-design.md`

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
