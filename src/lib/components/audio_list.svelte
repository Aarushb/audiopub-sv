<!--
  This file is part of the audiopub project.
  
  Copyright (C) 2025 the-byte-bender
-->
<script lang="ts">
    import type { ClientsideAudio, ClientsideUser } from "$lib/types";
    import SafeMarkdown from "./safe_markdown.svelte";
    import AudioItem from "./audio_item.svelte";
    import { onMount } from "svelte";

    export let audios: ClientsideAudio[];
    export let groupThreshold: number = 3;
    export let currentUser: ClientsideUser | null = null;

    export let paginationBaseUrl: string = "/";
    export let page: number = 1;
    export let totalPages: number = 0;

    let autoplayEnabled = true;

    onMount(() => {
        const stored = localStorage.getItem("audiopub_autoplay");
        if (stored !== null) {
            autoplayEnabled = stored === "true";
        }
    });

    function toggleAutoplay(e: Event) {
        const target = e.target as HTMLInputElement;
        autoplayEnabled = target.checked;
        localStorage.setItem("audiopub_autoplay", String(autoplayEnabled));
    }

    let itemComponents: Map<string, AudioItem> = new Map();

    function setItemRef(id: string, comp: AudioItem | null) {
        if (comp) {
            itemComponents.set(id, comp);
        } else {
            itemComponents.delete(id);
        }
    }

    function handleTrackEnded(currentIndex: number) {
        if (!autoplayEnabled || !audios || currentIndex >= audios.length - 1) {
            return;
        }
        const nextAudio = audios[currentIndex + 1];
        if (nextAudio) {
            const nextComp = itemComponents.get(nextAudio.id);
            if (nextComp) {
                nextComp.playAudio();
            }
        }
    }

    type AudioGroup = {
        isGroup: true;
        user: NonNullable<ClientsideAudio["user"]>;
        audios: ClientsideAudio[];
        id: string;
    };

    let processedList: (ClientsideAudio | AudioGroup)[] = [];
    let expandedGroups = new Map<string, boolean>();

    function toggleGroup(id: string) {
        expandedGroups.set(id, !expandedGroups.get(id));
        expandedGroups = expandedGroups;
    }

    $: paginationQuerySeparator = paginationBaseUrl.includes("?") ? "&" : "?";

    $: {
        if (groupThreshold > 0 && audios?.length > 0) {
            const newList: (ClientsideAudio | AudioGroup)[] = [];
            let i = 0;
            while (i < audios.length) {
                const currentAudio = audios[i];
                const currentUser = currentAudio.user;

                if (!currentUser) {
                    newList.push(currentAudio);
                    i++;
                    continue;
                }

                let j = i + 1;
                while (
                    j < audios.length &&
                    audios[j].user?.id === currentUser.id
                ) {
                    j++;
                }

                const consecutiveAudios = audios.slice(i, j);
                const count = consecutiveAudios.length;

                if (count > groupThreshold) {
                    const itemsToShow = Math.max(1, groupThreshold - 1);

                    newList.push(...consecutiveAudios.slice(0, itemsToShow));

                    const groupId = `${currentUser.id}-${i}`;
                    newList.push({
                        isGroup: true,
                        user: currentUser,
                        audios: consecutiveAudios.slice(itemsToShow),
                        id: groupId,
                    });

                    if (!expandedGroups.has(groupId)) {
                        expandedGroups.set(groupId, false);
                    }
                } else {
                    newList.push(...consecutiveAudios);
                }
                i = j;
            }
            processedList = newList;
        } else {
            processedList = audios || [];
        }
    }
</script>

<div class="audio-list-controls">
    <label class="autoplay-toggle" for="autoplay-switch">
        <input
            type="checkbox"
            id="autoplay-switch"
            role="switch"
            aria-checked={autoplayEnabled}
            checked={autoplayEnabled}
            on:change={toggleAutoplay}
        />
        <span>Autoplay Next Track</span>
    </label>
</div>

<section class="audio-list">
    {#each audios as audio, index (audio.id)}
        <AudioItem
            bind:this={itemComponents.get(audio.id) as any}
            {audio}
            {currentUser}
            onEnded={() => handleTrackEnded(index)}
        />
    {/each}
</section>

{#if totalPages > 1}
    <div class="pagination">
        {#if page > 1}
            <a
                href={`${paginationBaseUrl}${paginationQuerySeparator}page=${page - 1}`}
                >Previous</a
            >
        {/if}
        <span aria-live="polite">Page {page} of {totalPages}</span>
        {#if page < totalPages}
            <a
                href={`${paginationBaseUrl}${paginationQuerySeparator}page=${page + 1}`}
                >Next</a
            >
        {/if}
    </div>
{/if}

<style>
    .audio-list-controls {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        margin-bottom: 12px;
        padding: 8px 12px;
        background-color: #f5f5f5;
        border-radius: 6px;
        border: 1px solid #e0e0e0;
    }

    .autoplay-toggle {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: bold;
        color: #333;
        cursor: pointer;
        user-select: none;
    }

    .autoplay-toggle input[type="checkbox"] {
        width: 18px;
        height: 18px;
        cursor: pointer;
    }

    .audio-list {
        margin-top: 10px;
    }

    .pagination {
        margin-top: 20px;
    }

    .pagination a {
        margin-right: 10px;
    }

    .audio-group h4 {
        margin-bottom: 10px;
        font-weight: normal;
    }

    .expand-button {
        background: none;
        border: none;
        color: var(--text-link-color);
        cursor: pointer;
        padding: 0;
        font-size: inherit;
        font-weight: bold;
    }

    .expand-button:hover {
        text-decoration: underline;
    }
</style>
