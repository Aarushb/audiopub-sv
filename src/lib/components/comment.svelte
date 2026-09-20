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
          import { formatRelative } from "date-fns";
  import type { ClientsideComment, ClientsideUser } from "$lib/types";
  import Modal from "./modal.svelte";
  import { enhance } from "$app/forms";
  import SafeMarkdown from "./safe_markdown.svelte";
  import { updated } from "$app/state";
  import CommentList from "./comment_list.svelte";

  export let comment: ClientsideComment;
  export let user: ClientsideUser | undefined = undefined;
  export let isAdmin: boolean = false;
  export let onReply: ((comment: ClientsideComment) => void) = comment => {};
  export let form: any = undefined;
  let isDeletionModalVisible: boolean = false;
  let replyDisabled: boolean = false;
  let repliesOpen: boolean = false;
  let isEditing: boolean = false;
  let editValue: string = comment.content;
  let editDisabled: boolean = false;

  $: commentDate = comment
    ? formatRelative(new Date(comment.createdAt), new Date())
    : "";

  $: editError =
    form?.commentId === comment.id ? form?.editCommentMessage : undefined;

  function startEdit() {
    editValue = comment.content;
    isEditing = true;
  }
</script>

<div class="comment" tabindex="-1">
  <h3>
    <a href={`/user/@${encodeURIComponent(comment.user.name)}`}>{comment.user.displayName}</a>
    <span class="comment-date"> - {commentDate}</span>
    {#if comment.editCount}<span class="edited-tag">(edited)</span>{/if}
  </h3>
  {#if comment.replies && comment.replies.length > 0}
    <span class="sr-only">
      {comment.replies.length} {comment.replies.length === 1 ? "reply" : "replies"}.
      {repliesOpen ? "Replies expanded, press left arrow to collapse." : "Press right arrow to expand."}
    </span>
  {/if}

  {#if isEditing}
    <form
      class="edit-comment-form"
      method="post"
      action="?/edit_comment"
      use:enhance={() => {
        editDisabled = true;
        return async ({ update, result }) => {
          await update();
          editDisabled = false;
          if (result.type === "success") {
            isEditing = false;
          }
        };
      }}
    >
      {#if editError}
        <p class="form-message" role="alert">{editError}</p>
      {/if}
      <input type="hidden" name="commentId" value={comment.id} />
      <label for="edit-comment-{comment.id}">Edit comment</label>
      <textarea
        id="edit-comment-{comment.id}"
        name="content"
        bind:value={editValue}
        minlength="3"
        maxlength="4000"
        required
      ></textarea>
      <button type="submit" disabled={editDisabled}>Save</button>
      <button type="button" on:click={() => (isEditing = false)}>Cancel</button>
    </form>
  {:else}
    <SafeMarkdown source={comment.content} />
  {/if}

  <div id="comment-actions">
    {#if user && !isEditing}
      <form method="post" action="?/reply_to_comment" use:enhance={() => {
        replyDisabled = true;
        return async ({ update }) => {
            await update({ invalidateAll: false });
            onReply(comment);
            replyDisabled = false;
        };
      }}>
        <input type="hidden" name="parentId" value={comment.id} />
        <button type="submit" disabled={replyDisabled}>Reply</button>
      </form>
    {/if}

    {#if user && (user.id === comment.user.id || isAdmin) && !isEditing}
      <button type="button" on:click={startEdit}>Edit</button>
    {/if}

    {#if isAdmin || (user && user.id === comment.user.id)}
      <button on:click={() => (isDeletionModalVisible = true)}>Delete</button>
      <Modal bind:visible={isDeletionModalVisible}>
        <h2>Delete this comment?</h2>
        <p>Are you sure? This action cannot be undone.</p>
        <p>Comment content:</p>
        <pre>{comment.content}</pre>
        <button on:click={() => (isDeletionModalVisible = false)}>Cancel</button
        >
        <form action="?/delete_comment" method="post"
        use:enhance={() => {
          return async ({ update }) => {
            await update();
            isDeletionModalVisible = false; // close modal after deletion
          };
        }}>
          <input type="hidden" name="id" value={comment.id} />
          <button type="submit">Confirm delete</button>
        </form>
      </Modal>
    {/if}
  </div>

  {#if isAdmin && comment.edits && comment.edits.length > 0}
    <details class="edit-history">
      <summary>{comment.edits.length} {comment.edits.length === 1 ? "edit" : "edits"}</summary>
      <ol>
        {#each comment.edits as edit (edit.id)}
          <li>
            <strong>{new Date(edit.createdAt).toLocaleString()}</strong>
            by @{edit.editor?.name ?? "unknown"}{#if edit.isAdminEdit} (administrator){/if}
            <p>Previous:</p>
            <pre>{edit.previousContent}</pre>
            <p>New:</p>
            <pre>{edit.newContent}</pre>
          </li>
        {/each}
      </ol>
    </details>
  {/if}
</div>

{#if comment.replies && comment.replies.length > 0}
<details class="replies" bind:open={repliesOpen}>
  <summary>{comment.replies.length} {comment.replies.length === 1 ? "reply" : "replies"}</summary>
  <CommentList comments={comment.replies} {user} {isAdmin} {onReply} {form} label="Replies" isNested />
</details>
{/if}

<style>
  .comment {
    margin-top: 1rem;
    padding: 0.5rem;
    background-color: #fff;
    border: 1px solid #ccc;
    border-radius: 4px;
    outline: none;
  }

  .comment:focus-visible {
    outline: 2px solid #007bff;
    outline-offset: 2px;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .comment h3 a {
    color: #007bff;
    text-decoration: none;
  }

  .comment .comment-date {
    color: #6c757d; /* A muted color for the date */
    font-size: 0.9em;
    margin-left: 0.5em;
  }

  .edited-tag {
    font-size: 0.65em;
    font-weight: normal;
    color: #6c757d;
    margin-left: 0.4em;
  }

  .form-message {
    color: #a00;
  }

  .edit-comment-form textarea {
    width: 100%;
    box-sizing: border-box;
    min-height: 4rem;
    margin: 0.3rem 0;
  }

  .edit-history {
    margin-top: 0.5rem;
    font-size: 0.9em;
    color: #333;
  }

  .edit-history summary {
    cursor: pointer;
  }

  .edit-history pre {
    white-space: pre-wrap;
    background-color: #f7f7f7;
    padding: 0.4rem;
    border: 1px solid #ddd;
    margin: 0.25rem 0 0.5rem;
  }

  .comment pre {
    white-space: pre-wrap;
    background-color: #fff;
    padding: 0.5rem;
    border: none;
    margin-top: 0.5rem;
  }

  .comment #comment-actions {
    margin-top: 0.5rem;
    display: flex;
    gap: 0.5rem;
    align-items: center; /* So they're all at same height */
    flex-wrap: wrap; /* allow wrapping on very small screens */
  }

  /* prevent direct child forms inside the actions area from adding extra vertical spacing
     (this avoids changing layouts inside nested components like the Modal) */
  .comment #comment-actions > form {
    margin: 0;
  }

  .comment + .replies {
    margin-top: 0.5rem;
    margin-left: 1rem;
  }

  .comment + .replies > summary {
    cursor: pointer;
    font-weight: 600;
    color: #333;
  }
</style>
