<!--
  This file is part of the audiopub project.
  
  Copyright (C) 2026 the-byte-bender
  
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
    import { enhance } from "$app/forms";
    import title from "$lib/title.js";
    import { onMount } from "svelte";
    import Modal from "$lib/components/modal.svelte";

    export let data;
    let selectedEdit: any = null;
    let showEditDialog = false;

    function openEditDialog(edit: any) {
        selectedEdit = edit;
        showEditDialog = true;
    }

    onMount(() => title.set("Admin"));
</script>

<h1>Pending Account Approvals</h1>

{#if data.untrustedUsers.length === 0}
    <p>No pending approvals.</p>
{:else}
    <table>
        <thead>
            <tr>
                <th>Username</th>
                <th>Display Name</th>
                <th>Email</th>
                <th>Bio</th>
                <th>Registered</th>
                <th>Action</th>
            </tr>
        </thead>
        <tbody>
            {#each data.untrustedUsers as u}
                <tr>
                    <td>
                        <a href="/user/@{encodeURIComponent(u.name)}">{u.name}</a>
                    </td>
                    <td>{u.displayName}</td>
                    <td>{u.email}</td>
                    <td>{u.bio ? u.bio.slice(0, 120) : ""}</td>
                    <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td>
                        <form use:enhance action="?/trust" method="post">
                            <input type="hidden" name="id" value={u.id} />
                            <button type="submit">Approve</button>
                        </form>
                    </td>
                </tr>
            {/each}
        </tbody>
    </table>
{/if}

<h1>Recent Audio Edits</h1>

{#if data.recentEdits.length === 0}
    <p>No audio edits.</p>
{:else}
    <div class="edit-list">
        {#each data.recentEdits as edit}
            <article>
                <h2>
                    <a href="/listen/{edit.audioId}">{edit.audioTitle}</a>
                    <span class="edited-tag">[edited]</span>
                </h2>
                <p>
                    Edited by @{edit.editor || "unknown"} on
                    {new Date(edit.createdAt).toLocaleString()}.
                    {#if edit.audioOwner}Owner: @{edit.audioOwner}.{/if}
                    {#if edit.isAdminEdit}Administrator edit.{/if}
                    {#if edit.restoredEditId}Restoration of an earlier edit.{/if}
                </p>
                <button type="button" on:click={() => openEditDialog(edit)}
                    >View details</button
                >
            </article>
        {/each}
    </div>
{/if}

<Modal bind:visible={showEditDialog}>
    {#if selectedEdit}
        <div class="edit-dialog-content">
            <h2>Edit details</h2>
            <p>
                <a href="/listen/{selectedEdit.audioId}">{selectedEdit.audioTitle}</a>
                edited by @{selectedEdit.editor || "unknown"} on
                {new Date(selectedEdit.createdAt).toLocaleString()}.
            </p>
            <p><strong>Title:</strong> {selectedEdit.previousTitle} → {selectedEdit.newTitle}</p>
            <p><strong>Previous description:</strong></p>
            <pre>{selectedEdit.previousDescription}</pre>
            <p><strong>New description:</strong></p>
            <pre>{selectedEdit.newDescription}</pre>
            <form
                use:enhance={() => {
                    return async ({ result, update }) => {
                        await update();
                        if (result.type === "success") {
                            showEditDialog = false;
                        }
                    };
                }}
                action="?/restoreEdit"
                method="post"
            >
                <input type="hidden" name="editId" value={selectedEdit.id} />
                <button type="submit">Revert this edit</button>
            </form>
            <button type="button" on:click={() => (showEditDialog = false)}
                >Close</button
            >
        </div>
    {/if}
</Modal>

<style>
    table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 1rem;
    }

    th,
    td {
        border: 1px solid #ddd;
        padding: 0.5rem;
        text-align: left;
    }

    th {
        background-color: #f4f4f4;
        font-weight: bold;
    }

    tr:nth-child(even) {
        background-color: #fafafa;
    }

    button {
        background-color: #333;
        color: #fff;
        padding: 0.4rem 0.8rem;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    }

    button:hover {
        background-color: #444;
    }

    .edit-list {
        display: grid;
        gap: 1rem;
    }

    .edit-list article {
        border: 1px solid #ddd;
        border-radius: 4px;
        padding: 1rem;
    }

    .edit-list h2 {
        margin-top: 0;
    }

    .edit-dialog-content pre {
        white-space: pre-wrap;
        overflow-wrap: anywhere;
    }

    .edited-tag {
        font-size: 0.65em;
        font-weight: normal;
    }
</style>
