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
    import type { PageData } from "./$types";
    import { getTitle } from "$lib/title";
    const title = getTitle();

    export let data: PageData;

    $: title.set("Muted users");
</script>

<svelte:head>
    <title>Muted users | audiopub</title>
</svelte:head>

<h1>Muted users</h1>

{#if !data.canMute}
    <p>
        Administrators do not mute users; use the moderation tools instead.
        {#if data.count > 0}
            Any mutes below are left over from before you became an admin and
            are no longer applied. You can still remove them.
        {/if}
    </p>
{/if}

{#if data.canMute && data.count === 0}
    <p>
        You haven't muted anyone. You can mute someone from their profile page
        or from one of their uploads.
    </p>
{:else if data.count > 0}
    {#if data.canMute}
    <p>
        Uploads and live streams from these {data.count === 1
            ? "person"
            : "people"} are hidden from the home page, quickfeed, search and your
        notifications.
    </p>
    {/if}

    <ul class="mute-list">
        {#each data.mutes as mute (mute.id)}
            <li>
                <a href="/user/@{encodeURIComponent(mute.user.name)}"
                    >{mute.user.displayName}</a
                >
                <span class="username">(@{mute.user.name})</span>
                <span class="muted-since">
                    muted on {new Date(mute.createdAt).toLocaleDateString()}
                </span>
                <form use:enhance method="POST" action="?/unmute">
                    <input type="hidden" name="mutedId" value={mute.user.id} />
                    <button type="submit"
                        >Unmute {mute.user.displayName}</button
                    >
                </form>
            </li>
        {/each}
    </ul>

    {#if data.totalPages > 1}
        <nav class="pagination" aria-label="Muted users pages">
            {#if data.page > 1}
                <a href={`/mutes?page=${data.page - 1}`}>Previous</a>
            {/if}
            <span aria-live="polite">Page {data.page} of {data.totalPages}</span>
            {#if data.page < data.totalPages}
                <a href={`/mutes?page=${data.page + 1}`}>Next</a>
            {/if}
        </nav>
    {/if}
{/if}

<style>
    .mute-list {
        list-style: none;
        padding: 0;
    }

    .mute-list li {
        padding: 0.6rem 0;
        border-bottom: 1px solid #ddd;
    }

    .username,
    .muted-since {
        color: #555;
        font-size: 0.9rem;
    }

    .mute-list form {
        display: inline;
        margin-left: 0.5rem;
    }

    .pagination {
        margin-top: 1rem;
        display: flex;
        gap: 0.75rem;
        align-items: center;
    }
</style>
