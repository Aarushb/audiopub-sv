<!--
  This file is part of the audiopub project.
  
  Copyright (C) 2025 the-byte-bender
-->
<script lang="ts">
    export let data;

    import { enhance } from "$app/forms";
    import { onMount } from "svelte";
    import CommentList from "$lib/components/comment_list.svelte";
    import StreamChatList from "$lib/components/stream_chat_list.svelte";
    import title from "$lib/title";
    import SafeMarkdown from "$lib/components/safe_markdown.svelte";
    import type { ClientsideComment } from "$lib/types.js";
    import SubscribeButton from "$lib/components/subscribe_button.svelte";
    import AudioPlayer from "$lib/components/audio_player.svelte";

    let autoplayEnabled = true;
    let audioElement: HTMLAudioElement | undefined = undefined;

    onMount(() => {
        if (data.audio) {
            title.set(data.audio.title);
        }
        const stored = localStorage.getItem("audiopub_autoplay");
        if (stored !== null) {
            autoplayEnabled = stored === "true";
        }

        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("autoplay") === "true") {
            setTimeout(() => {
                if (audioElement) {
                    audioElement.play().catch(() => {});
                }
            }, 100);
        }
    });

    const handlePlay = () => {
        if (data.audio) {
            fetch(`/listen/${data.audio.id}/try_register_play`, { method: "POST" }).catch(() => {});
        }
    };

    const handleEnded = () => {
        if (autoplayEnabled && data.nextAudioId) {
            window.location.href = `/listen/${data.nextAudioId}?autoplay=true`;
        }
    };

    const handleNext = () => {
        if (data.nextAudioId) {
            window.location.href = `/listen/${data.nextAudioId}`;
        }
    };

    const handlePrev = () => {
        window.history.back();
    };

    $: favoritesString = (() => {
        const count = data.audio?.favoriteCount || 0;
        if (count === 0) return "No favorites";
        if (count === 1) return "1 favorite";
        return `${count} favorites`;
    })();

    function shareAudio() {
        if (!data.audio) return;
        const url = window.location.href;
        if (navigator.share) {
            navigator
                .share({
                    title: data.audio.title,
                    url: url,
                })
                .catch((error) => console.log("Error sharing", error));
        } else {
            navigator.clipboard
                .writeText(url)
                .then(() => {
                    alert("Link copied to clipboard");
                })
                .catch((err) => {
                    console.error("Could not copy text: ", err);
                });
        }
    }
</script>

{#if data.audio}
<h1>{data.audio.title}</h1>

<div class="audio-player">
    <AudioPlayer
        autofocus
        bind:audioElement
        on:play={handlePlay}
        on:ended={handleEnded}
        on:next={handleNext}
        on:prev={handlePrev}
        sources={[
            { src: `/${data.audio.path}`, type: data.mimeType },
            { src: `/${data.audio.transcodedPath}`, type: "audio/aac" },
        ]}
    />

    <a
        href="/{data.audio.path}"
        download={data.audio.title +
            (data.audio.extension.startsWith(".")
                ? data.audio.extension
                : "." + data.audio.extension)}
    >
        Download Audio File
    </a>
</div>

<div class="audio-details">
    <div class="audio-stats">
        <span>{data.audio.playsString}</span>
        <span>{favoritesString}</span>
        {#if data.user}
            {#if data.audio.isFavorited}
                <form use:enhance action="?/unfavorite" method="POST">
                    <button type="submit" class="favorite-btn favorited">
                        ★ Favorited
                    </button>
                </form>
            {:else}
                <form use:enhance action="?/favorite" method="POST">
                    <button type="submit" class="favorite-btn">
                        ☆ Favorite
                    </button>
                </form>
            {/if}
        {/if}
        <button type="button" class="share-btn" on:click={shareAudio}>
            Share
        </button>
    </div>
    {#if data.audio.user}
        <p>
            Uploaded by: <a href="/user/@{encodeURIComponent(data.audio.user.name)}"
                >{data.audio.user.displayName}</a
            >
            {#if data.user && data.audio.user.id !== data.user.id}
                <SubscribeButton
                    targetUserId={data.audio.user.id}
                    isSubscribed={data.isSubscribed}
                />
            {/if}
        </p>
    {/if}
    <p>Upload date: {new Date(data.audio.createdAt).toLocaleDateString()}</p>

    {#if data.audio.description}
        <h2>Description:</h2>
        <SafeMarkdown source={data.audio.description} />
    {/if}

    {#if data.user && (data.isAdmin || data.user.id === data.audio.user?.id)}
        <form
            use:enhance={({ cancel }) => {
                if (!confirm("Are you sure you want to delete this audio?")) {
                    cancel();
                }
            }}
            action="?/delete"
            method="POST"
        >
            <button type="submit"> Permanently delete</button>
        </form>
    {/if}

    {#if data.audio.archivedStream}
        <div class="chat-archive">
            <h2>Stream Chat Archive</h2>
            <StreamChatList
                streamId={data.audio.archivedStream.id}
                chats={data.audio.archivedStream.chats || []}
            />
        </div>
    {:else}
        <CommentList
            comments={data.comments}
            isAdmin={data.isAdmin}
            user={data.user || undefined}
        />

        {#if data.user && !data.user.isBanned}
            {#if !data.user.isTrusted}
                <p role="alert">
                    You're not trusted yet. Your comments will be reviewed before
                    being shown. If you submit a comment, it will not be displayed
                    until it's reviewed.
                </p>
            {/if}
            <form use:enhance action="?/add_comment" method="POST">
                <label for="comment">Add a comment:</label>
                <textarea name="comment" id="comment" required maxlength="4000"
                ></textarea>
                <button type="submit">Submit</button>
            </form>
        {/if}
    {/if}
</div>
{/if}

<style>
    h1 {
        text-align: center;
        margin-bottom: 1rem;
        color: #333;
    }

    .audio-player {
        margin-bottom: 1rem;
    }

    .audio-player a {
        display: block;
        text-align: center;
        margin-top: 0.5rem;
        color: #007bff;
        text-decoration: none;
        font-weight: bold;
    }

    .audio-details {
        margin-top: 1rem;
    }

    .audio-stats {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1rem;
        font-size: 0.95rem;
        color: #555;
    }

    .favorite-btn,
    .share-btn {
        background: none;
        border: 1px solid #ccc;
        padding: 0.3rem 0.6rem;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.9rem;
    }

    .favorite-btn:hover,
    .share-btn:hover {
        background-color: #f0f0f0;
    }

    .favorite-btn.favorited {
        color: #d9534f;
        border-color: #d9534f;
    }

    .chat-archive {
        margin-top: 2rem;
        border-top: 2px solid #eee;
        padding-top: 1rem;
    }
</style>
