<!--
  This file is part of the audiopub project.
  
  Copyright (C) 2024 the-byte-bender
-->
<script lang="ts">
    import AudioList from "$lib/components/audio_list.svelte";
    import title from "$lib/title";
    import { onMount } from "svelte";
    import { enhance } from "$app/forms";
    import SafeMarkdown from "$lib/components/safe_markdown.svelte";
    import SubscribeButton from "$lib/components/subscribe_button.svelte";

    export let data;

    onMount(() => title.set(`Profile of ${data.profileUser.displayName}`));
</script>

<h1>Profile of {data.profileUser.displayName}</h1>

{#if data.profileUser.isBanned}
    <p style="color: red">This user is banned.</p>
{/if}

<table>
    <tbody>
        <tr>
            <td>Username</td>
            <td>@{data.profileUser.name}</td>
        </tr>
        <tr>
            <td>Display Name</td>
            <td>{data.profileUser.displayName}</td>
        </tr>
        <tr>
            <td>Uploads</td>
            <td>{data.count}</td>
        </tr>
        <tr>
            <td>Subscribers</td>
            <td>{data.subscribers}</td>
        </tr>
    </tbody>
</table>

{#if data.user && data.user.id != data.profileUser.id}
    <SubscribeButton isSubscribed={data.isSubscribed} targetUserId={data.profileUser.id}></SubscribeButton>
{/if}

{#if data.profileUser.bio != ""}
    <h2>Bio</h2>
    <SafeMarkdown source={data.profileUser.bio} />
{/if}

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
        href={`/user/@${encodeURIComponent(data.profileUser.name)}?tab=clips`}
        class:active={data.tab === "clips"}
        aria-selected={data.tab === "clips"}
        role="tab"
    >
        Uploaded Clips ({data.clips.length})
    </a>
    <a
        href={`/user/@${encodeURIComponent(data.profileUser.name)}?tab=archives`}
        class:active={data.tab === "archives"}
        aria-selected={data.tab === "archives"}
        role="tab"
    >
        Live Archives ({data.archives.length})
    </a>
    <a
        href={`/user/@${encodeURIComponent(data.profileUser.name)}?tab=playlists`}
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
            paginationBaseUrl={`/user/@${encodeURIComponent(data.profileUser.name)}?tab=clips`}
        />
    {:else if data.tab === "archives"}
        <AudioList
            audios={data.archives}
            groupThreshold={0}
            page={data.page}
            totalPages={data.totalPages}
            paginationBaseUrl={`/user/@${encodeURIComponent(data.profileUser.name)}?tab=archives`}
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
            <p>This user has not created any public playlists yet.</p>
        {/if}
    {/if}
</section>

<style>
    h1 {
        text-align: center;
        margin-bottom: 1.5rem;
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

    .profile-tabs a:hover {
        color: #000;
    }

    .profile-tabs a.active {
        color: #007bff;
        border-bottom-color: #007bff;
    }

    .playlists-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: 1rem;
    }

    .playlist-card {
        border: 1px solid #ddd;
        border-radius: 6px;
        padding: 1rem;
        background: #fff;
    }

    .playlist-card h3 {
        margin: 0 0 0.5rem 0;
        text-align: left;
    }

    .playlist-card h3 a {
        color: #007bff;
        text-decoration: none;
    }

    .playlist-card h3 a:hover {
        text-decoration: underline;
    }
</style>
