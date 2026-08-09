<!--
  This file is part of the audiopub project.
  
  Copyright (C) 2024 the-byte-bender
-->
<script lang="ts">
    import { enhance } from "$app/forms";
    import AudioList from "$lib/components/audio_list.svelte";
    import title from "$lib/title.js";
    import { onMount } from "svelte";

    export let data;

    onMount(() => title.set(`${data.profileUser.displayName}'s Profile`));
</script>

<h1>{data.profileUser.displayName}'s Profile</h1>

<table>
    <tbody>
        <tr>
            <td>Username</td>
            <td>{data.profileUser.name}</td>
        </tr>
        <tr>
            <td>Display Name</td>
            <td>{data.profileUser.displayName}</td>
        </tr>
    </tbody>
</table>

{#if data.isAdmin}
    {#if !data.profileUser.isTrusted}
        <form use:enhance action="?/trust" method="post">
            <button type="submit">Trust</button>
        </form>
    {/if}

    <details>
        <summary>administrative actions</summary>
        {#if !data.profileUser.isBanned}
            <form use:enhance action="?/ban" method="post">
                <label for="ban-reason">Reason</label>
                <input type="text" name="reason" id="ban-reason" required />
                <br />
                <label for="ban-message">Message</label>
                <textarea name="message" id="ban-message"></textarea>
                <button type="submit">Ban</button>
            </form>
        {/if}
        <br />
        <form use:enhance action="?/warn" method="post">
            <label for="warn-reason">Reason</label>
            <input type="text" name="reason" id="warn-reason" required />
            <br />
            <label for="warn-message">Message</label>
            <textarea name="message" id="warn-message"></textarea>
            <button type="submit">Warn</button>
        </form>
    </details>
{/if}

<h2>Content</h2>

<nav class="profile-tabs" aria-label="User Content Tabs">
    <a
        href={`/user/${data.profileUser.id}?tab=clips`}
        class:active={data.tab === "clips"}
        aria-selected={data.tab === "clips"}
        role="tab"
    >
        Uploaded Clips ({data.clips.length})
    </a>
    <a
        href={`/user/${data.profileUser.id}?tab=archives`}
        class:active={data.tab === "archives"}
        aria-selected={data.tab === "archives"}
        role="tab"
    >
        Live Archives ({data.archives.length})
    </a>
    <a
        href={`/user/${data.profileUser.id}?tab=playlists`}
        class:active={data.tab === "playlists"}
        aria-selected={data.tab === "playlists"}
        role="tab"
    >
        Playlists ({data.playlists.length})
    </a>
</nav>

<section class="tab-content" role="tabpanel">
    {#if data.tab === "clips"}
        <AudioList
            audios={data.clips}
            groupThreshold={0}
            page={data.page}
            totalPages={data.totalPages}
            paginationBaseUrl={`/user/${data.profileUser.id}?tab=clips`}
            currentUser={data.user}
        />
    {:else if data.tab === "archives"}
        <AudioList
            audios={data.archives}
            groupThreshold={0}
            page={data.page}
            totalPages={data.totalPages}
            paginationBaseUrl={`/user/${data.profileUser.id}?tab=archives`}
            currentUser={data.user}
        />
    {:else if data.tab === "playlists"}
        {#if data.playlists && data.playlists.length > 0}
            <div class="playlists-grid">
                {#each data.playlists as playlist (playlist.id)}
                    <article class="playlist-card">
                        <h3>
                            <a href={`/playlist/${playlist.id}`}>{playlist.name}</a>
                        </h3>
                        <p>{playlist.trackCount ?? playlist.audios?.length ?? 0} tracks</p>
                    </article>
                {/each}
            </div>
        {:else}
            <p>This user has not created any playlists yet.</p>
        {/if}
    {/if}
</section>

<style>
    details {
        border: 1px solid #ddd;
        border-radius: 4px;
        padding: 1rem;
        margin-bottom: 1rem;
    }

    summary {
        cursor: pointer;
        font-weight: bold;
    }

    form {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-bottom: 1rem;
    }

    label {
        font-weight: bold;
    }

    input[type="text"],
    textarea {
        padding: 0.5rem;
        border: 1px solid #ccc;
    }

    button {
        background-color: #333;
        color: #fff;
        padding: 0.75rem 1rem;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    }

    button:hover {
        background-color: #444;
    }

    h2 {
        text-align: center;
        margin-top: 2rem;
        margin-bottom: 1rem;
    }

    .profile-tabs {
        display: flex;
        justify-content: center;
        gap: 1rem;
        border-bottom: 2px solid #ccc;
        margin-bottom: 1.5rem;
    }

    .profile-tabs a {
        padding: 0.5rem 1rem;
        text-decoration: none;
        color: #555;
        font-weight: bold;
        border-bottom: 3px solid transparent;
        transition: all 0.2s ease;
    }

    .profile-tabs a.active,
    .profile-tabs a[aria-selected="true"] {
        color: #007bff;
        border-bottom-color: #007bff;
    }

    .playlists-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        gap: 1rem;
        margin-top: 1rem;
    }

    .playlist-card {
        border: 1px solid #ccc;
        border-radius: 6px;
        padding: 1rem;
        background-color: #fff;
    }

    .playlist-card h3 {
        margin: 0 0 0.5rem 0;
    }

    .playlist-card h3 a {
        color: #007bff;
        text-decoration: none;
    }

    .playlist-card h3 a:hover {
        text-decoration: underline;
    }

    .playlist-card p {
        margin: 0;
        color: #666;
        font-size: 0.9rem;
    }
</style>
