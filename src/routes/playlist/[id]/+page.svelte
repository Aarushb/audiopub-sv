<!--
  This file is part of the audiopub project.
  
  Copyright (C) 2025 the-byte-bender
-->
<script lang="ts">
    import { enhance } from "$app/forms";
    import AudioList from "$lib/components/audio_list.svelte";
    import { getTitle } from "$lib/title";
    const title = getTitle();
    import type { PageData } from "./$types";

    export let data: PageData;

    $: title.set(`Playlist: ${data.playlist.name}`);
</script>

<svelte:head>
    <title>{`Playlist: `} | audiopub</title>
</svelte:head>

<article class="playlist-header">
    <h1>{data.playlist.name}</h1>
    {#if data.playlist.user}
        <p class="byline">
            Created by <a href={`/user/${data.playlist.user.id}`}>{data.playlist.user.displayName}</a>
        </p>
    {/if}

    {#if data.isOwner}
        <form
            use:enhance={({ cancel }) => {
                if (!confirm("Are you sure you want to delete this playlist?")) {
                    cancel();
                }
            }}
            action="?/delete"
            method="POST"
            class="delete-form"
        >
            <button type="submit" class="btn-danger">Delete Playlist</button>
        </form>
    {/if}
</article>

<h2>Tracks in Playlist</h2>

{#if data.playlist.audios && data.playlist.audios.length > 0}
    <AudioList
        audios={data.playlist.audios}
        groupThreshold={0}
        itemLinkQuery={`?playlist=${data.playlist.id}`}
        paginationBaseUrl={`/playlist/${data.playlist.id}`}
    />
{:else}
    <p>This playlist currently has no tracks.</p>
{/if}

<style>
    .playlist-header {
        margin-bottom: 2rem;
        padding: 1.5rem;
        background-color: #f9f9f9;
        border: 1px solid #ddd;
        border-radius: 8px;
    }

    h1 {
        margin: 0 0 0.5rem 0;
        color: #222;
    }

    .byline {
        color: #666;
        font-size: 1rem;
        margin-bottom: 1rem;
    }

    .byline a {
        color: #007bff;
        text-decoration: none;
    }

    h2 {
        color: #333;
        margin-bottom: 1rem;
    }

    .btn-danger {
        background-color: #dc3545;
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 4px;
        cursor: pointer;
    }

    .btn-danger:hover {
        background-color: #c82333;
    }
</style>
