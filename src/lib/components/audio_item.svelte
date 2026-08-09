<!--
  This file is part of the audiopub project.
  
  Copyright (C) 2025 the-byte-bender
-->
<script lang="ts">
    import type { ClientsideAudio, ClientsideUser } from "$lib/types";
    import SafeMarkdown from "./safe_markdown.svelte";
    import AudioPlayer from "./audio_player.svelte";

    export let audio: ClientsideAudio;
    export let currentUser: ClientsideUser | null = null;
    export let onEnded: (() => void) | undefined = undefined;
    export let onNext: (() => void) | undefined = undefined;
    export let onPrev: (() => void) | undefined = undefined;

    let playerComponent: AudioPlayer | undefined = undefined;

    export function playAudio() {
        if (playerComponent && playerComponent.audioElement) {
            playerComponent.audioElement.play().catch(() => {});
        }
    }

    const handlePlay = () => {
        fetch(`/listen/${audio.id}/try_register_play`, { method: "POST" }).catch(() => {});
    };

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

    <div class="item-player-container">
        <AudioPlayer
            bind:this={playerComponent}
            sources={[
                { src: `/${audio.path}`, type: "audio/aac" },
                { src: `/${audio.transcodedPath}`, type: "audio/aac" }
            ]}
            on:play={handlePlay}
            on:ended={onEnded}
            on:next={onNext}
            on:prev={onPrev}
        />
    </div>

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
        padding: 12px;
        border-radius: 6px;
        background: #fff;
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

    .item-player-container {
        margin: 8px 0;
    }

    .playlist-info a {
        color: #007bff;
        text-decoration: none;
    }

    .playlist-info a:hover {
        text-decoration: underline;
    }
</style>
