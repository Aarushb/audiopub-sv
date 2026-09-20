<!--
  This file is part of the audiopub project.
  
  Copyright (C) 2024 the-byte-bender
  
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
    // Every nesting level shares this same handler (see the template
    // below) so that a single keydown bubbling up through several nested
    // <ul>s is only ever acted on once, at the outermost (non-nested)
    // instance.
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

{#if comments.length > 0}
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<ul class="comments-list" aria-label={label} on:keydown={handleKeydown}>
    {#each comments as comment (comment.id)}
      <li><Comment {comment} {user} {isAdmin} {onReply} /></li>
    {/each}
</ul>
{/if}


<style>
.comments-list {
    list-style-type: none;
    padding-left: 0;
    margin-left: 0;
}

</style>