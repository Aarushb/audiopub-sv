# Listening Experience Upgrades — Design

## Context

`feature/playlists-autoplay-filters` was built by a prior agent session against
GEMINI.md's three feature requests (playlists, autoplay, filtering/search
prefixes). That work is functional but was based on a stale copy of the
fork's `main`, which itself had drifted 21 commits behind the true upstream,
`the-byte-bender/audiopub-sv`. The branch also carries two regressions
introduced while integrating the custom `AudioPlayer`:

- `audio_list.svelte` computes a "collapse consecutive uploads by the same
  user behind a `+N more` disclosure" grouping (`processedList`), but its
  template loops over the flat `audios` array instead, so the feature is
  silently dead. Leftover CSS for the old header-level autoplay toggle
  (`.audio-list-controls`, `.autoplay-toggle`) is also unused.
- `listen/[id]/+page.svelte` has completely lost the chapters feature
  (`## Chapters` heading parsing, clickable timestamps) that exists on
  upstream (added in `98e8cfe`, still present on `upstream/main`).
- `audio_player.svelte` is missing the AGPL license header every other file
  in the repository carries.

Comparing `upstream/main` against our branch confirms there is no feature
overlap to reconcile: upstream has no playlists, its own "autoplay" usage
(in `quickfeed_player.svelte`) is an unrelated "attempt to auto-start
playback on open" behavior, and upstream's `audio_player.svelte` already
ships the baseline shortcuts (`Space`/`k` play-pause, `j`/`←` seek back,
`l`/`→` seek forward, `m` mute, `:` cycle speed) — our branch's only real
additions on top of that baseline are `n`/`p` next/prev and the autoplay
toggle.

On top of reconciling that branch, this round of work adds features
requested directly for this session: a page-jump combobox for pagination,
collapsible/keyboard-navigable comment reply threads, a chapter-jump
shortcut, and a global keyboard-shortcuts help modal.

The user is blind and this platform is built for blind users first;
accessibility (semantic HTML, ARIA, screen-reader-usable keyboard
interaction) is the primary correctness bar for every UI change here, not
an afterthought.

## Goals

1. Reconcile `feature/playlists-autoplay-filters` (renamed
   `feature/listening-experience-upgrades`) with true upstream
   (`the-byte-bender/audiopub-sv`), fixing the regressions found above as
   part of that merge.
2. Verify (and fix if still broken) the previously reported bug: autoplay
   advancing to the next track without actually starting playback.
3. Add a page-jump combobox to the shared pagination UI in
   `audio_list.svelte`.
4. Make nested comment replies collapsed-by-default at every depth, with
   optional arrow-key navigation between comments layered on unchanged
   native semantics.
5. Add `Ctrl+←`/`Ctrl+→` chapter-jump shortcuts to `AudioPlayer`, and a
   global `?` keyboard-shortcuts help modal.
6. Provide a portable local test environment (Docker for MariaDB only,
   everything else native `npm run dev`) and thoroughly exercise every
   feature above — including with a screen-reader-relevant accessibility
   pass — before calling any of this done.
7. Keep a running, legible record of what was actually built/changed as
   the work progresses, since this round of work covers many unrelated
   areas of the app at once.

## Non-goals

- No ARIA `role="tree"` implementation for comments. Tree-role navigation
  uses a roving-tabindex model incompatible with comments' rich
  interactive content (markdown links, reply forms, delete buttons); see
  "Comment reply collapsing" below for the rejected alternatives and why.
- No changes to server-side comment/playlist data models beyond what's
  needed to restore the chapters feature and fix the grouping regression.
- No upstream PR is opened as part of this work. Commits are kept atomic
  and conventionally formatted so that splitting them into individual PR
  branches later (if the user chooses to contribute upstream) is a
  mechanical `git cherry-pick`, not a redesign.

## Branch & merge strategy

- Rename `feature/playlists-autoplay-filters` to
  `feature/listening-experience-upgrades`.
- Add `upstream` remote (`the-byte-bender/audiopub-sv`) and merge
  `upstream/main` into the renamed branch. Upstream's code wins on any true
  conflict (e.g. `audio.ts`/`user.ts` models, `audio_item.svelte`,
  register/login pages, `upload/+page.server.ts`).
- As part of resolving the merge (not as separate follow-up commits, since
  these files are already being touched by the merge itself):
  - Restore grouped rendering in `audio_list.svelte`.
  - Restore the chapters feature in `listen/[id]/+page.svelte`, taking
    upstream's implementation and layering our custom-player integration
    on top of it.
  - Add the missing license header to `audio_player.svelte`.
- After the merge, run `npm run check` and `npm run build`, then boot the
  app locally and manually verify the autoplay-doesn't-actually-play bug;
  fix it if still present.

## Feature: Pagination combobox

All paginated pages (`+page.svelte` homepage, `favorites`, `profile`,
`quickfeed`, `search`, `subscriptions`, `user/[id]`, `playlist/[id]`) render
their pagination through the single shared `audio_list.svelte` component, so
this is a one-file change.

Current markup:

```
{#if page > 1}<a href="...">Previous</a>{/if}
<span aria-live="polite">Page {page} of {totalPages}</span>
{#if page < totalPages}<a href="...">Next</a>{/if}
```

New markup: keep the Previous/Next links as-is; replace the middle span
with a `<form>` containing a `<label for="page-select">Page</label>`, a
`<select id="page-select">` with one `<option>` per page (`1..totalPages`,
current page pre-selected, label text `Page N`), and a "Go" submit button
that navigates to `paginationBaseUrl` with `page=<selected>` appended. Only
rendered when `totalPages > 1`, same condition as today.

A native `<select>` + `<label>` + submit button needs no custom ARIA and is
fully keyboard/screen-reader operable by construction, and scales to any
`totalPages` without needing ellipsis/truncation logic.

## Feature: Comment reply collapsing + navigation

### Collapsing

`comment.svelte` renders `<CommentList comments={comment.replies} .../>`
directly today, so every level of a thread is always fully expanded.
Wrap that render in a `<details>`/`<summary>` disclosure — collapsed by
default — labelled with the reply count (e.g. "3 replies"). This mirrors a
pattern upstream already uses for chapters
(`<details class="chapters"><summary>Chapters</summary>...`), so it's
idiomatic to this codebase rather than a new pattern. Because the wrapping
happens inside `comment.svelte` itself, which recursively renders every
nesting level, each depth gets its own independent collapsed-by-default
disclosure automatically: expanding one level's replies never auto-expands
the next level down. Top-level comments (rendered directly by
`comment_list.svelte`) are unaffected — only reply threads collapse.

### Rejected alternative: ARIA tree view

Considered and rejected: representing the comment thread as a
`role="tree"`/`role="treeitem"` widget (arrow-key navigation between
labels, expand/collapse via arrow keys) so a screen reader's focus mode
sees a tree while browse mode sees the full rendered thread.

Rejected because:

- The ARIA tree pattern is designed for hierarchies of plain labels (file
  names, menu items), not nodes containing rich interactive content.
  Comments contain rendered markdown (which can itself contain links), a
  reply form, and a delete button + confirmation modal — content that
  doesn't nest safely inside `treeitem` under the roving-tabindex
  navigation model tree widgets use (only one item is focusable at a time;
  arrow keys move between items, not into their descendants), so
  Reply/Delete/links would become unreachable via the tree's own
  navigation and would require a second, separate interaction mode to
  reach — the `treegrid` pattern, which is a substantially more complex
  2D navigation model with poor real-world screen-reader support for
  content this rich, and not proportionate to a comments feature.
- A variant considered — plain-text tree labels for focus-mode navigation,
  with the full rich content shown separately for browse mode — would
  require rendering every comment twice (a simplified label plus the full
  content elsewhere, shown when that node has focus), effectively an
  email-client list-plus-reading-pane layout. That's a materially bigger
  redesign than a comments feature warrants, and risks the two renderings
  drifting out of sync or one being invisible to one interaction mode but
  not the other — exactly the kind of mess this design is trying to avoid.

### Navigation

Instead, layer optional keydown handling on the comments region — the same
technique `audio_player.svelte` already uses to capture keys for its own
controls without becoming a nonstandard widget — without changing any
element's role, so browse mode's accessible structure is identical to
today's:

- `↓` / `↑`, when focus is on a comment's heading link or its
  reply-disclosure `<summary>`, move focus to the next/previous sibling
  comment at the same nesting level.
- `→` expands the focused comment's reply disclosure (if collapsed and it
  has replies) and moves focus into the first reply.
- `←` collapses the focused comment's reply disclosure (if expanded) and
  moves focus back to the parent comment; if already collapsed, just moves
  focus to the parent.

All of this operates on elements that keep their ordinary roles
(heading/link/button/`<summary>`), so Tab/Shift+Tab and normal
browse-mode reading are unaffected — the arrows are an additive, optional
way to move faster, not a replacement interaction model.

## Feature: Keyboard shortcuts

- **Chapter jump**: once chapters are restored (see merge section above),
  add `Ctrl+←` / `Ctrl+→` to `audio_player.svelte`'s existing `onKeydown`
  switch to jump to the previous/next chapter marker relative to
  `currentTime`. Guarded to no-op when no `chapters` prop is passed in (or
  it's empty), so it's harmless on tracks without chapters.
- **`?` shortcuts-help modal**: a new small component, reusing the existing
  `modal.svelte`, wired globally in `+layout.svelte` so it's reachable from
  anywhere via `?` (guarded the same way the player already avoids
  hijacking keys while an input/textarea has focus). Lists every shortcut
  that exists anywhere in the app, grouped under headings (e.g.
  "Playback", "Navigation", "Comments") for screen-reader scannability.
  Closable via the existing modal's close affordance and `Esc`.
- `n`/`p` next/prev track shortcuts already exist from prior work; no
  changes needed there.

## Testing strategy

Local environment stays exactly as GEMINI.md specified: Docker runs only
MariaDB (`docker-compose.yml`, already gitignored); everything else
(`npm run dev`) runs natively so nothing beyond the repo folder gets
installed on the host.

1. Bring up the MariaDB container, run migrations, start the dev server,
   and fix any startup issues that surface (re-verify the Node 25
   `SlowBuffer` polyfill and the optional-ICECAST-env fix still apply after
   the merge, since dependency versions may have shifted).
2. Register multiple local test accounts through the UI, approving/trusting
   them via a terminal `UPDATE Users SET ...` against the Docker container
   (or the admin UI once one account is promoted) — several features
   (subscriptions, comment threads, shared playlists) need more than one
   account to test meaningfully. Email verification links print to stdout
   via `NO_EMAIL=true`, already configured.
3. Drive the actual UI through Claude in Chrome: upload clips, build
   playlists, toggle autoplay in both playlist and feed contexts, exercise
   the filter checkboxes and `playlist:`/`live:` search prefixes, use
   pagination (including the new combobox), expand/collapse comment
   threads and exercise the new arrow-key navigation, open the `?`
   shortcuts modal, and jump chapters with `Ctrl+←/→`.
4. Do an accessibility-relevant pass alongside the functional pass: check
   the accessibility tree/ARIA states (`read_page`), heading hierarchy, and
   `aria-expanded`/`aria-live` states for the new and changed UI, since this
   platform's correctness bar is screen-reader usability, not just visual
   appearance.
5. Run `npm run check` and `npm run build` clean before considering any
   unit of work done.

## Documentation & progress tracking

Because this round of work spans many unrelated areas of the app at once,
maintain a running log at
`docs/superpowers/progress/2026-09-19-listening-experience-upgrades-log.md`,
appended to after each unit of work (each commit or small group of related
commits) with: what changed, why, which files, and what was tested. This is
in addition to — not a replacement for — normal commit messages, so
progress is legible even if the session is interrupted or context is
summarized.

## Git workflow

- One branch: `feature/listening-experience-upgrades`.
- The upstream merge lands as its own commit (a merge commit, not
  squashed).
- Every subsequent unit of work is its own atomic, single-line
  Conventional Commit (`feat: ...` / `fix: ...` / `docs: ...`), exactly per
  GEMINI.md's existing rule. A single feature may span multiple commits
  (e.g. a `feat:` commit followed by a separate `fix:` commit for something
  found while testing it) — that's expected and fine. What's not fine is
  bulk/monolithic commits bundling unrelated changes, or multi-line commit
  messages.
