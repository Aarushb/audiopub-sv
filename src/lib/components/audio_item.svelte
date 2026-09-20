<!--
  This file is part of the audiopub project.

  Copyright (C) 2025 the-byte-bender
-->
<script lang="ts">
    import type { ClientsideAudio } from "$lib/types";
    import SafeMarkdown from "./safe_markdown.svelte";

    export let audio: ClientsideAudio;

    $: favoritesString = (() => {
        const count = audio.favoriteCount || 0;
        if (count === 0) return "No favorites";
        if (count === 1) return "1 favorite";
        return `${count} favorites`;
    })();
</script>

<article class="audio-item">
    <h3>
        {#if audio.user && !audio.user.isTrusted}
            <span style="color: red">(Pending review)</span> |{" "}
        {/if}
        <a href={`/listen/${audio.id}`}>{audio.title}</a>
        <span class="stats"> | {audio.playsString} | {favoritesString}</span>
    </h3>
    <p>
        {#if audio.playlists && audio.playlists.length > 0}
            <span class="playlist-info">
                {#each audio.playlists as playlist, i}
                    Part of <a href={`/playlist/${playlist.id}`}>{playlist.name}</a>{i < audio.playlists.length - 1 ? ", " : ""}
                {/each}
            </span>
            {#if audio.user} | {/if}
        {/if}
        {#if audio.user}
            By <a href={`/user/@${encodeURIComponent(audio.user.name)}`}>{audio.user.displayName}</a>
        {/if}
    </p>
    <SafeMarkdown source={audio.description} />
</article>

<style>
    .audio-item {
        margin-bottom: 20px;
        border: 1px solid #ccc;
        padding: 10px;
    }

    h3 {
        margin: 0 0 8px 0;
    }

    .stats {
        color: #666;
        font-size: 0.9em;
        font-weight: normal;
        margin-left: 0.5em;
        white-space: nowrap;
    }

    .playlist-info a {
        color: #007bff;
        text-decoration: none;
    }

    .playlist-info a:hover {
        text-decoration: underline;
    }
</style>
