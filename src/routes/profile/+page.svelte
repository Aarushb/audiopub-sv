<!--
  This file is part of the audiopub project.
  
  Copyright (C) 2025 the-byte-bender
-->
<script lang="ts">
    import { enhance } from "$app/forms";
    import type { PageData, ActionData } from "./$types";
    import AudioList from "$lib/components/audio_list.svelte";
    import PlaylistItem from "$lib/components/playlist_item.svelte";
    import { getTitle } from "$lib/title";
    const title = getTitle();

    export let data: PageData;
    export let form: ActionData;

    $: title.set("Your profile");
</script>

<svelte:head>
    <title>{"Your profile"} | audiopub</title>
</svelte:head>

<h1>Your Profile</h1>

<form use:enhance method="POST" action="?/updateProfile" class="profile-edit-form">
    {#if form?.message}
        <div class="error-message" role="alert">
            {form.message}
        </div>
    {/if}

    <label for="email">Email:</label>
    <input type="email" id="email" name="email" value={data.email} />

    <label for="displayName">Display Name:</label>
    <input
        type="text"
        id="displayName"
        name="displayName"
        value={data.displayName}
        minlength="3"
        maxlength="30"
    />

    <label for="bio">Bio:</label>
    <textarea
        id="bio"
        name="bio"
        value={data.bio}
        maxlength="1000"
    ></textarea>

    <label for="password">New Password:</label>
    <input
        type="password"
        id="password"
        name="password"
        minlength="8"
        maxlength="64"
    />

    <button type="submit">Update Profile</button>
</form>

<section class="stream-key-section">
    <h2>Stream Key</h2>
    <p class="stream-key-display">
        {data.streamKey ?? "No stream key set"}
    </p>
    {#if data.streamKey}
        <button
            type="button"
            class="copy-key-btn"
            on:click={() => navigator.clipboard.writeText(data.streamKey ?? "")}
            >Copy</button
        >
    {/if}
    <form use:enhance method="POST" action="?/resetStreamKey">
        <button type="submit" class="reset-key-btn">Reset Stream Key</button>
    </form>
    <p class="stream-help-link">
        <a href="/stream/instructions">How to stream?</a>
    </p>
</section>

<h2>Your Content</h2>

<nav class="profile-tabs" aria-label="Content Tabs">
    <a
        href="/profile?tab=clips"
        class:active={data.tab === "clips"}
        aria-selected={data.tab === "clips"}
        role="tab"
    >
        Uploaded Clips ({data.clips.length})
    </a>
    <a
        href="/profile?tab=archives"
        class:active={data.tab === "archives"}
        aria-selected={data.tab === "archives"}
        role="tab"
    >
        Live Archives ({data.archives.length})
    </a>
    <a
        href="/profile?tab=playlists"
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
            paginationBaseUrl="/profile?tab=clips"
        />
    {:else if data.tab === "archives"}
        <AudioList
            audios={data.archives}
            groupThreshold={0}
            page={data.page}
            totalPages={data.totalPages}
            paginationBaseUrl="/profile?tab=archives"
        />
    {:else if data.tab === "playlists"}
        {#if data.playlists && data.playlists.length > 0}
            <div class="playlists-grid">
                {#each data.playlists as playlist (playlist.id)}
                    <PlaylistItem {playlist} showOwner={false} />
                {/each}
            </div>
        {:else}
            <p>You have not created any playlists yet. <a href="/playlist/create">Make a playlist</a>.</p>
        {/if}
    {/if}
</section>

<style>
    .error-message {
        color: #721c24;
        background-color: #f8d7da;
        border: 1px solid #f5c6cb;
        border-radius: 4px;
        padding: 0.75rem;
        margin-bottom: 1rem;
    }

    .profile-edit-form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        width: 100%;
        max-width: 500px;
        margin: 0 auto 2rem auto;
        padding: 1.5rem;
        border: 1px solid #ddd;
        border-radius: 8px;
        background-color: #f9f9f9;
    }

    label {
        font-weight: bold;
    }

    input[type="text"],
    input[type="email"],
    input[type="password"],
    textarea {
        padding: 0.5rem;
        border: 1px solid #ccc;
        border-radius: 4px;
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

    .stream-key-section {
        max-width: 500px;
        margin: 0 auto 2rem auto;
        padding: 1rem;
        border: 1px solid #eee;
        border-radius: 8px;
    }

    h2 {
        text-align: center;
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

</style>
