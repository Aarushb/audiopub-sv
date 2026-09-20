# Listening Experience Upgrades Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the local environment up and verify the just-completed upstream merge, then add the four newly-requested features (pagination combobox, collapsible/keyboard-navigable comment replies, a chapter-jump shortcut, and a global keyboard-shortcuts help modal) on top of it.

**Architecture:** SvelteKit 2 / Svelte 5 (legacy `export let` component syntax throughout the existing codebase — no runes), Sequelize/MariaDB. No automated test suite exists in this repository (no vitest/jest/playwright configured) — verification is `npm run check` (svelte-check) plus manual exercise of each feature through a running local instance (Docker-only MariaDB, native `npm run dev`), including a screen-reader-relevant accessibility pass, per the project's own stated priority that this platform is built for blind users first.

**Tech Stack:** SvelteKit, Svelte 5, TypeScript (strict), Sequelize-TypeScript, MariaDB (Docker), native HTML `<details>`/`<summary>` and `<dialog>` for disclosure/modal UI (both already idiomatic in this codebase).

**Spec:** `docs/superpowers/specs/2026-09-19-listening-experience-upgrades-design.md`

## Global Constraints

- Match the indentation/quoting style of whichever file is being edited (this codebase is not internally consistent — some files use 2-space indent, most newer ones use 4-space — follow the file you're touching, not a global rule).
- Every `.svelte` and `.ts` file in this repository carries the AGPL license header (see any existing file for the exact text) — new files must have it too.
- Comment only where the WHY is non-obvious; do not add comments describing what the code visibly does.
- No unit/integration test framework exists — "testing" a task means `npm run check` passing with 0 new errors, plus the manual verification procedure described in that task's steps.
- Never introduce AI-artifact writing tics (em dashes, "Let's dive in", etc.) into code comments or commit messages — match the existing codebase's plain, terse style.
- One atomic, single-line Conventional Commit (`feat:`/`fix:`/`docs:`) per logical unit of work — a task may span more than one commit (e.g. a `feat:` commit plus a separate `fix:` commit for something found while testing it), but never bundle unrelated changes into one commit, and never write multi-line commit messages.
- Append an entry to `docs/superpowers/progress/2026-09-19-listening-experience-upgrades-log.md` after finishing each task, describing what changed, why, and what was tested — this is in addition to commit messages, not a replacement for them.

---

## Task 1: Bring up the local environment and verify the merge

**Files:** none (operational task) — verification touches whatever files turn out to need fixing.

**Interfaces:** N/A.

- [ ] **Step 1: Bring up MariaDB and the dev server**

```powershell
docker compose up -d
npx sequelize-cli db:migrate
npm run dev
```

If `docker compose up -d` fails because Docker Desktop isn't running, stop and ask the user to start it — do not attempt to install or start Docker Desktop itself.

- [ ] **Step 2: Register at least two local test accounts through the UI**

Navigate to `http://localhost:5173/register` for each. With `NO_EMAIL=true` already set in `.env`, verification links print to the `npm run dev` terminal output instead of being emailed — use them to verify both accounts.

- [ ] **Step 3: Promote one account to admin/trusted via the database**

```powershell
docker exec -i audiopub-mariadb mariadb -u audiopub -paudiopubpassword audiopub -e "UPDATE Users SET isTrusted=1, isAdmin=1 WHERE email='<first account email>';"
```

- [ ] **Step 4: Smoke-test the merged features**

Using the admin account: upload a clip, create a playlist and add the clip to it via both the creation page and the upload page's multi-select, confirm the homepage shows "Part of [Playlist Name]" on the feed item, confirm the profile page's Uploaded Clips/Live Archives/Playlists tabs work, toggle the player's Autoplay switch and verify it both advances to and **actually starts playing** the next track in a playlist and in the homepage feed (this was the specific bug reported previously — confirm whether it's still present), test the `playlist:`/`live:` search prefixes, and open a track's listen page to confirm chapters render (upload a clip with a `## Chapters` heading and a `- [00:05] Intro` style line in the description to test this) and that its comment section, edit dialog (as the uploader), and announcement pin (as admin) all work.

- [ ] **Step 5: Fix anything broken, as its own atomic commit**

If the autoplay-doesn't-play bug or anything else from Step 4 is still broken, fix it now as a separate `fix:` commit (or several, one per distinct bug) — do not fold fixes into the merge commit, which is already made.

- [ ] **Step 6: Append the progress log entry for this task**

Document what was tested, what (if anything) was found broken and fixed, in `docs/superpowers/progress/2026-09-19-listening-experience-upgrades-log.md`.

---

## Task 2: Pagination combobox

**Files:**
- Modify: `src/lib/components/audio_list.svelte`

**Interfaces:**
- Consumes: existing `page: number` and `totalPages: number` props (already present on this component), and `paginationBaseUrl: string`.
- Produces: no new props — this is a template-only change, so nothing downstream changes.

- [ ] **Step 1: Replace the "Page X of Y" text with a page-select form**

Current block (found via `totalPages > 1`):

```svelte
{#if totalPages > 1}
    <div class="pagination">
        {#if page > 1}
            <a
                href={`${paginationBaseUrl}${paginationQuerySeparator}page=${page - 1}`}
                >Previous</a
            >
        {/if}
        <span aria-live="polite">Page {page} of {totalPages}</span>
        {#if page < totalPages}
            <a
                href={`${paginationBaseUrl}${paginationQuerySeparator}page=${page + 1}`}
                >Next</a
            >
        {/if}
    </div>
{/if}
```

Replace with:

```svelte
{#if totalPages > 1}
    <div class="pagination">
        {#if page > 1}
            <a
                href={`${paginationBaseUrl}${paginationQuerySeparator}page=${page - 1}`}
                >Previous</a
            >
        {/if}
        <form class="page-jump" method="get" action={paginationBaseUrl.split("?")[0]}>
            {#each paginationBaseUrl.includes("?") ? paginationBaseUrl.split("?")[1].split("&") : [] as param}
                {#if param && !param.startsWith("page=")}
                    {@const [key, value] = param.split("=")}
                    <input type="hidden" name={key} value={decodeURIComponent(value ?? "")} />
                {/if}
            {/each}
            <label for="page-select">Page</label>
            <select name="page" id="page-select">
                {#each Array(totalPages) as _, i}
                    <option value={i + 1} selected={i + 1 === page}>Page {i + 1}</option>
                {/each}
            </select>
            <span aria-hidden="true">of {totalPages}</span>
            <button type="submit">Go</button>
        </form>
        {#if page < totalPages}
            <a
                href={`${paginationBaseUrl}${paginationQuerySeparator}page=${page + 1}`}
                >Next</a
            >
        {/if}
    </div>
{/if}
```

`paginationBaseUrl` is used both as a plain path (e.g. `/`) and as a path-plus-existing-query-string (e.g. from `search/+page.svelte`: `` `/search?q=${encodeURIComponent(data.query)}` ``) depending on caller — the hidden-input loop preserves any such existing query parameters (other than `page`, which the `<select>` itself supplies) so a page-jump on `/search?q=foo` still carries `q=foo` through as a GET form field rather than losing it.

- [ ] **Step 2: Add pagination form styling**

In the same file's `<style>` block, alongside the existing `.pagination` rule:

```css
.page-jump {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
}
```

- [ ] **Step 3: Verify with `npm run check`**

```powershell
npm run check
```

Expected: 0 new errors (the one pre-existing `audio_item.svelte` `currentUser` warning is unrelated and expected to remain).

- [ ] **Step 4: Manually verify in the browser**

With the dev server running and enough uploaded clips to produce at least 3 pages on the homepage (`limit` is 30 per page per `+page.server.ts` — either upload 61+ clips or temporarily lower the limit locally to test, then revert), confirm: the Previous/Next links still work, the `<select>` lists every page with the current one pre-selected, and choosing a different page and clicking Go navigates there. Tab to the `<select>` and operate it with arrow keys + Enter to confirm keyboard operability. Check that on `/search?q=...` the `q` parameter survives a page-jump.

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/audio_list.svelte
git commit -m "feat: add page-jump combobox to pagination"
```

---

## Task 3: Collapsible comment replies

**Files:**
- Modify: `src/lib/components/comment.svelte`

**Interfaces:**
- Consumes: existing `comment.replies?: ClientsideComment[]` field (already present on the type and already populated server-side via `Comment.constructThreads`).
- Produces: no prop/interface changes — purely a template change to how `comment.replies` is rendered. Task 4 builds directly on top of the DOM structure this task produces, so its exact shape matters: each `<li>` in `comment_list.svelte` will contain a `.comment` div and, as its sibling (still inside the same `<li>`), a `<details class="replies">` when the comment has replies.

- [ ] **Step 1: Wrap the recursive replies render in a collapsed-by-default `<details>`**

Current block at the bottom of the template:

```svelte
{#if comment.replies}
<CommentList comments={comment.replies} {user} {isAdmin} {onReply} label="Replies" />
{/if}
```

Replace with:

```svelte
{#if comment.replies && comment.replies.length > 0}
<details class="replies">
  <summary>{comment.replies.length} {comment.replies.length === 1 ? "reply" : "replies"}</summary>
  <CommentList comments={comment.replies} {user} {isAdmin} {onReply} label="Replies" />
</details>
{/if}
```

(The original `{#if comment.replies}` check was true even for an empty array, since `[]` is truthy in JavaScript — the `.length > 0` check fixes that latent redundant-render, not just adds the wrapper.)

- [ ] **Step 2: Add styling for the replies disclosure**

In the `<style>` block, after the existing `.comment #comment-actions > form` rule:

```css
  .comment + .replies {
    margin-top: 0.5rem;
    margin-left: 1rem;
  }

  .comment + .replies > summary {
    cursor: pointer;
    font-weight: 600;
    color: #333;
  }
```

- [ ] **Step 3: Verify with `npm run check`**

```powershell
npm run check
```

Expected: 0 new errors.

- [ ] **Step 4: Manually verify in the browser**

On a track with a multi-level comment thread (post a comment, reply to it as a second test account, then reply to that reply as the first account again to get 3 levels), confirm: replies are collapsed by default at every level, each level's "N replies" summary expands independently (expanding a parent does not auto-expand its own nested children), and the disclosure is operable with keyboard alone (Tab to the summary, Enter/Space to toggle) as well as with a mouse click.

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/comment.svelte
git commit -m "feat: collapse comment replies behind a disclosure by default"
```

---

## Task 4: Comment arrow-key navigation

**Files:**
- Modify: `src/lib/components/comment_list.svelte`
- Modify: `src/lib/components/comment.svelte`

**Interfaces:**
- Consumes: the `.comment h3 a` (heading link) and `details.replies > summary` selectors that Task 3's DOM structure produces, and each comment's enclosing `<li>` from `comment_list.svelte`'s own `{#each}` render.
- Produces: a new `isNested: boolean = false` prop on `comment_list.svelte`, defaulting to `false` for existing callers (the listen page and quickfeed player, which pass neither `isNested` nor anything that would set it) and set to `true` only by `comment.svelte`'s own recursive `<CommentList>` call — this is what prevents the keydown handler from being attached once per nesting level (which would otherwise fire multiple times per keypress as the event bubbles through nested `<ul>`s).

- [ ] **Step 1: Add the `isNested` prop and keydown handler to `comment_list.svelte`**

Current script:

```svelte
<script lang="ts">
  import Comment from "./comment.svelte";
  import type { ClientsideComment, ClientsideUser } from "$lib/types";

  export let comments: ClientsideComment[];
  export let user: ClientsideUser | undefined = undefined;
  export let isAdmin: boolean = false;
  export let onReply: ((comment: ClientsideComment) => void) = comment => {};
  export let label: string = "comments";
</script>
```

Replace with:

```svelte
<script lang="ts">
  import Comment from "./comment.svelte";
  import type { ClientsideComment, ClientsideUser } from "$lib/types";

  export let comments: ClientsideComment[];
  export let user: ClientsideUser | undefined = undefined;
  export let isAdmin: boolean = false;
  export let onReply: ((comment: ClientsideComment) => void) = comment => {};
  export let label: string = "comments";
  export let isNested: boolean = false;

  function commentLi(el: HTMLElement): HTMLLIElement | null {
    return el.closest("li");
  }

  function headingLink(li: HTMLLIElement): HTMLElement | null {
    return li.querySelector(":scope > .comment h3 a");
  }

  function repliesDetails(li: HTMLLIElement): HTMLDetailsElement | null {
    return li.querySelector(":scope > details.replies");
  }

  function parentLi(li: HTMLLIElement): HTMLLIElement | null {
    const ul = li.parentElement;
    if (!ul || !ul.classList.contains("comments-list")) return null;
    const details = ul.parentElement;
    if (!details || details.tagName !== "DETAILS") return null;
    return details.closest("li");
  }

  function handleKeydown(event: KeyboardEvent) {
    // Every nesting level shares this same handler (see Step 2) so that a
    // single keydown bubbling up through several nested <ul>s is only ever
    // acted on once, at the outermost (non-nested) instance.
    if (isNested) return;
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;

    const target = event.target as HTMLElement;
    const isHeadingLink = target.matches(".comment h3 a");
    const isRepliesSummary = target.matches("details.replies > summary");
    if (!isHeadingLink && !isRepliesSummary) return;

    const li = commentLi(target);
    if (!li) return;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      const ul = li.parentElement;
      if (!ul) return;
      const siblings = Array.from(ul.children) as HTMLLIElement[];
      const index = siblings.indexOf(li);
      const sibling = siblings[event.key === "ArrowDown" ? index + 1 : index - 1];
      if (!sibling) return;
      event.preventDefault();
      headingLink(sibling)?.focus();
      return;
    }

    if (event.key === "ArrowRight") {
      const details = repliesDetails(li);
      if (!details) return;
      event.preventDefault();
      details.open = true;
      const firstReplyLi = details.querySelector(":scope > ul.comments-list > li") as HTMLLIElement | null;
      firstReplyLi && headingLink(firstReplyLi)?.focus();
      return;
    }

    if (event.key === "ArrowLeft") {
      const details = repliesDetails(li);
      const wasOpen = details?.open ?? false;
      if (details && wasOpen) details.open = false;
      const parent = parentLi(li);
      if (!parent) {
        if (wasOpen) {
          event.preventDefault();
          headingLink(li)?.focus();
        }
        return;
      }
      event.preventDefault();
      headingLink(parent)?.focus();
    }
  }
</script>
```

- [ ] **Step 2: Attach the handler only at the outermost (non-nested) instance**

Current template:

```svelte
{#if comments.length > 0}
<ul class="comments-list" aria-label={label}>
    {#each comments as comment (comment.id)}
      <li><Comment {comment} {user} {isAdmin} {onReply} /></li>
    {/each}
</ul>
{/if}
```

Replace with:

```svelte
{#if comments.length > 0}
<ul class="comments-list" aria-label={label} on:keydown={handleKeydown}>
    {#each comments as comment (comment.id)}
      <li><Comment {comment} {user} {isAdmin} {onReply} /></li>
    {/each}
</ul>
{/if}
```

Every nesting level binds the same handler; the `if (isNested) return;` guard at the top of `handleKeydown` (Step 1) is what makes only the outermost instance actually act on a bubbled event — a keydown fired deep in the tree hits each nested (and therefore no-op) instance first before reaching the one outer instance where `isNested` is `false`.

- [ ] **Step 3: Mark the recursive call in `comment.svelte` as nested**

In `comment.svelte`, from Task 3's replacement block:

```svelte
<CommentList comments={comment.replies} {user} {isAdmin} {onReply} label="Replies" />
```

becomes:

```svelte
<CommentList comments={comment.replies} {user} {isAdmin} {onReply} label="Replies" isNested />
```

- [ ] **Step 4: Verify with `npm run check`**

```powershell
npm run check
```

Expected: 0 new errors. (`querySelector`/`closest` return nullable types under strict mode — the code above already guards every use with `?.` or an early `return`, so no `strictNullChecks` errors should appear; if any do, add the missing guard rather than a non-null assertion.)

- [ ] **Step 5: Manually verify in the browser**

On the same 3-level thread from Task 3: Tab to a top-level comment's heading link, press `↓`/`↑` and confirm focus moves between sibling top-level comments (not into nested replies). Press `→` on a comment with replies and confirm its disclosure opens and focus lands on the first reply's heading link. Press `↓`/`↑` there and confirm it only moves among that comment's own sibling replies, not back out to the top level. Press `←` and confirm the disclosure collapses and focus returns to the parent comment's heading link. Confirm none of this interferes with Tab-based navigation to the Reply/Delete buttons or with typing normally in the comment textarea.

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/comment_list.svelte src/lib/components/comment.svelte
git commit -m "feat: add arrow-key navigation between comments"
```

---

## Task 5: Chapter-jump keyboard shortcut

**Files:**
- Modify: `src/lib/components/audio_player.svelte`
- Modify: `src/routes/listen/[id]/+page.svelte`

**Interfaces:**
- Produces: a new `chapters: { time: number }[] = []` prop on `AudioPlayer`, defaulting to empty so every other caller (`audio_item.svelte`, `quickfeed_player.svelte`) is unaffected without changes. Callers are expected to pass chapters already sorted ascending by `time` — `listen/[id]/+page.svelte`'s existing `chapters` derived value (restored in the merge, built by `extractChapterSection`/`parseChapterLines`) already satisfies this.

- [ ] **Step 1: Add the `chapters` prop and jump helpers to `audio_player.svelte`**

Add alongside the other `export let` props near the top of the script:

```ts
export let chapters: { time: number }[] = [];
```

Add near the other control functions (e.g. after `seek`):

```ts
function jumpToPreviousChapter() {
    if (!audioElement || chapters.length === 0) return;
    const previous = [...chapters].reverse().find((c) => c.time < currentTime - 1);
    audioElement.currentTime = previous ? previous.time : 0;
}

function jumpToNextChapter() {
    if (!audioElement || chapters.length === 0) return;
    const next = chapters.find((c) => c.time > currentTime + 0.5);
    if (next) audioElement.currentTime = next.time;
}
```

- [ ] **Step 2: Wire `Ctrl+←`/`Ctrl+→` into `onKeydown`, ahead of the existing modifier-key guard**

Current start of `onKeydown`:

```ts
function onKeydown(event: KeyboardEvent) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;

    // Don't hijack keys while focus is on an input or textarea
    const target = event.target as HTMLElement;
    if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;

    switch (event.key) {
```

Replace with:

```ts
function onKeydown(event: KeyboardEvent) {
    // Don't hijack keys while focus is on an input or textarea
    const target = event.target as HTMLElement;
    if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;

    if (event.ctrlKey && !event.altKey && !event.metaKey) {
        if (event.key === "ArrowLeft") {
            event.preventDefault();
            jumpToPreviousChapter();
            return;
        }
        if (event.key === "ArrowRight") {
            event.preventDefault();
            jumpToNextChapter();
            return;
        }
        return;
    }

    if (event.altKey || event.metaKey) return;

    switch (event.key) {
```

This must be the *only* change to `onKeydown`'s control flow — every existing `case` below it is untouched, and the original `if (event.altKey || event.ctrlKey || event.metaKey) return;` guard is replaced by the two narrower guards above so that `Ctrl+←`/`Ctrl+→` reach the new branch instead of returning early, while every other Ctrl/Alt/Meta combination still bails out exactly as before.

- [ ] **Step 3: Pass chapters into the listen page's `AudioPlayer`**

In `src/routes/listen/[id]/+page.svelte`, the `<AudioPlayer>` invocation:

```svelte
<AudioPlayer
    autofocus
    bind:audioElement
    on:play={handlePlay}
    on:ended={handleEnded}
    on:next={handleNext}
    on:prev={handlePrev}
    sources={[
```

Add `{chapters}` to the prop list:

```svelte
<AudioPlayer
    autofocus
    bind:audioElement
    on:play={handlePlay}
    on:ended={handleEnded}
    on:next={handleNext}
    on:prev={handlePrev}
    {chapters}
    sources={[
```

- [ ] **Step 4: Verify with `npm run check`**

```powershell
npm run check
```

Expected: 0 new errors.

- [ ] **Step 5: Manually verify in the browser**

On a track uploaded with a `## Chapters` section containing at least 3 timestamped lines, focus the player and press `Ctrl+→` repeatedly to confirm it steps forward through chapters (and does nothing past the last one), then `Ctrl+←` to step back (and stops at 0). Confirm `Ctrl+←`/`Ctrl+→` on a track with **no** chapters does nothing and doesn't throw a console error. Confirm plain `←`/`→` (no Ctrl) still seek by 10 seconds as before, and that `j`/`l`/`n`/`p`/`m`/`:`/`Space`/`k` are all unaffected.

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/audio_player.svelte "src/routes/listen/[id]/+page.svelte"
git commit -m "feat: add ctrl+arrow chapter-jump shortcut to the audio player"
```

---

## Task 6: Global keyboard-shortcuts help modal

**Files:**
- Create: `src/lib/components/keyboard_shortcuts_modal.svelte`
- Modify: `src/routes/+layout.svelte`

**Interfaces:**
- Consumes: `Modal` from `src/lib/components/modal.svelte` (`visible: boolean` bindable prop, native `<dialog>`-based, closes on `Esc` and backdrop click for free).
- Produces: `KeyboardShortcutsModal` takes a single bindable `visible: boolean` prop, same convention as `Modal` itself.

- [ ] **Step 1: Create the modal component**

```svelte
<!--
  This file is part of the audiopub project.

  Copyright (C) 2025 the-byte-bender

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU Affero General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
  GNU Affero General Public License for more details.

  You should have received a copy of the GNU Affero General Public License
  along with this program. If not, see <https://www.gnu.org/licenses/>.
-->
<script lang="ts">
    import Modal from "./modal.svelte";

    export let visible: boolean = false;
</script>

<Modal bind:visible>
    <h2>Keyboard shortcuts</h2>

    <h3>Playback</h3>
    <dl>
        <div><dt>Space / K</dt><dd>Play or pause</dd></div>
        <div><dt>J / Left arrow</dt><dd>Seek back 10 seconds</dd></div>
        <div><dt>L / Right arrow</dt><dd>Seek forward 10 seconds</dd></div>
        <div><dt>N</dt><dd>Next track</dd></div>
        <div><dt>P</dt><dd>Previous track</dd></div>
        <div><dt>M</dt><dd>Mute or unmute</dd></div>
        <div><dt>:</dt><dd>Cycle playback speed</dd></div>
        <div><dt>Ctrl + Left arrow</dt><dd>Jump to the previous chapter</dd></div>
        <div><dt>Ctrl + Right arrow</dt><dd>Jump to the next chapter</dd></div>
    </dl>

    <h3>Comments</h3>
    <dl>
        <div><dt>Up / Down arrow</dt><dd>Move between comments at the same level</dd></div>
        <div><dt>Right arrow</dt><dd>Expand a comment's replies and move into them</dd></div>
        <div><dt>Left arrow</dt><dd>Collapse a comment's replies and move to its parent</dd></div>
    </dl>

    <h3>General</h3>
    <dl>
        <div><dt>?</dt><dd>Show this list of shortcuts</dd></div>
    </dl>

    <button type="button" on:click={() => (visible = false)}>Close</button>
</Modal>

<style>
    dl {
        margin: 0 0 1rem;
    }

    dl div {
        display: flex;
        gap: 0.5rem;
        padding: 0.2rem 0;
        border-bottom: 1px solid #eee;
    }

    dt {
        font-weight: 600;
        min-width: 11rem;
    }
</style>
```

- [ ] **Step 2: Wire the `?` shortcut and the modal into the root layout**

In `src/routes/+layout.svelte`, add the import alongside the existing ones:

```ts
import KeyboardShortcutsModal from "$lib/components/keyboard_shortcuts_modal.svelte";
```

Add state and a handler alongside the other script-level state:

```ts
let shortcutsModalVisible = false;

function handleGlobalKeydown(event: KeyboardEvent) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.target as HTMLElement;
    if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
    if (event.key === "?") {
        event.preventDefault();
        shortcutsModalVisible = true;
    }
}
```

In the existing `onMount`, add the listener registration and extend the existing cleanup function — current end of `onMount`:

```ts
        window.addEventListener("visibilitychange", handleVisibility);
        window.addEventListener("focus", handleFocus);

        if (browser && PUBLIC_ONE_SIGNAL_APP_ID) {
```

becomes:

```ts
        window.addEventListener("visibilitychange", handleVisibility);
        window.addEventListener("focus", handleFocus);
        window.addEventListener("keydown", handleGlobalKeydown);

        if (browser && PUBLIC_ONE_SIGNAL_APP_ID) {
```

and the existing cleanup:

```ts
        return () => {
            if (timer) clearTimeout(timer);
            window.removeEventListener("visibilitychange", handleVisibility);
            window.removeEventListener("focus", handleFocus);
        };
```

becomes:

```ts
        return () => {
            if (timer) clearTimeout(timer);
            window.removeEventListener("visibilitychange", handleVisibility);
            window.removeEventListener("focus", handleFocus);
            window.removeEventListener("keydown", handleGlobalKeydown);
        };
```

Add the modal instance right after `<main>`'s closing tag (so it doesn't interfere with `<main>`'s layout):

```svelte
</main>

<KeyboardShortcutsModal bind:visible={shortcutsModalVisible} />

<hr />
```

- [ ] **Step 3: Verify with `npm run check`**

```powershell
npm run check
```

Expected: 0 new errors.

- [ ] **Step 4: Manually verify in the browser**

From several different pages (homepage, a listen page, the upload form with focus *outside* any text field), press `?` and confirm the modal opens listing all shortcuts, grouped under headings. Confirm `Esc` and clicking the backdrop both close it (native `<dialog>` behavior via the existing `Modal` component — should work with no extra code). Confirm typing `?` inside a comment textarea or the search box does **not** open the modal. Confirm the modal's heading structure and grouping reads sensibly with `read_page`/accessibility-tree inspection (proper heading levels, no orphaned `<dl>` items).

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/keyboard_shortcuts_modal.svelte src/routes/+layout.svelte
git commit -m "feat: add global keyboard shortcuts help modal"
```

---

## Task 7: Final full pass

**Files:** none — verification only.

- [ ] **Step 1: Full regression pass**

With the dev server running against the same local database used throughout, re-walk every feature touched across this whole plan and the prior merge: playlists (create/add-on-upload/feed links/profile tabs), autoplay (playlist and feed), filters and search prefixes, the pagination combobox, collapsible/keyboard-navigable comments, the chapter-jump shortcut, and the shortcuts modal — using two test accounts and the admin account, on at least one multi-page feed and one multi-level comment thread.

- [ ] **Step 2: Run final checks**

```powershell
npm run check
npm run build
```

Both must pass clean.

- [ ] **Step 3: Final progress log entry**

Append a closing summary to `docs/superpowers/progress/2026-09-19-listening-experience-upgrades-log.md` — what shipped, what was tested, anything explicitly deferred or out of scope, and confirmation that `npm run check`/`npm run build` both pass.
