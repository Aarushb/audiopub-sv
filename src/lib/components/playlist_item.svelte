<!--
  This file is part of the audiopub project.

  Copyright (C) 2025 the-byte-bender
-->
<script lang="ts">
    import type { ClientsidePlaylist } from "$lib/types";

    export let playlist: ClientsidePlaylist;
    export let showOwner: boolean = true;

    $: trackCount = playlist.trackCount ?? playlist.audios?.length ?? 0;
</script>

<details class="playlist-item">
    <summary>
        <h3>{playlist.name}</h3>
        <span class="track-count">{trackCount} {trackCount === 1 ? "track" : "tracks"}</span>
    </summary>

    {#if showOwner && playlist.user}
        <p class="byline">
            By <a href={`/user/@${encodeURIComponent(playlist.user.name)}`}>{playlist.user.displayName}</a>
        </p>
    {/if}

    {#if playlist.audios && playlist.audios.length > 0}
        <ol class="playlist-tracks">
            {#each playlist.audios as track (track.id)}
                <li>
                    <h4><a href={`/listen/${track.id}?playlist=${playlist.id}`}>{track.title}</a></h4>
                </li>
            {/each}
        </ol>
    {/if}

    <a class="open-playlist" href={`/playlist/${playlist.id}`}>Open playlist page</a>
</details>

<style>
    .playlist-item {
        border: 1px solid #ddd;
        border-radius: 6px;
        padding: 1rem;
        background-color: #fff;
        margin-bottom: 1rem;
    }

    .playlist-item summary {
        cursor: pointer;
        list-style: none;
    }

    .playlist-item summary::-webkit-details-marker {
        display: none;
    }

    .playlist-item summary h3 {
        display: inline;
        margin: 0;
        font-size: 1.1rem;
    }

    .playlist-item summary h3::before {
        content: "▶ ";
        font-size: 0.75em;
    }

    .playlist-item[open] summary h3::before {
        content: "▼ ";
    }

    .track-count {
        margin-left: 0.5rem;
        font-size: 0.9rem;
        color: #666;
    }

    .byline {
        margin: 0.5rem 0 0;
        font-size: 0.9rem;
        color: #666;
    }

    .byline a {
        color: #007bff;
    }

    .playlist-tracks {
        margin: 0.75rem 0 0;
        padding-left: 1.5rem;
    }

    .playlist-tracks h4 {
        margin: 0;
        font-size: 1rem;
        font-weight: normal;
    }

    .playlist-tracks a {
        color: #007bff;
        text-decoration: none;
    }

    .playlist-tracks a:hover {
        text-decoration: underline;
    }

    .open-playlist {
        display: inline-block;
        margin-top: 0.75rem;
        color: #007bff;
        text-decoration: none;
        font-size: 0.9rem;
    }

    .open-playlist:hover {
        text-decoration: underline;
    }
</style>
