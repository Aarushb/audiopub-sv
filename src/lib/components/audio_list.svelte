<!--
  This file is part of the audiopub project.
  
  Copyright (C) 2025 the-byte-bender
-->
<script lang="ts">
    import type { ClientsideAudio, ClientsideUser } from "$lib/types";
    import AudioItem from "./audio_item.svelte";
    import { onMount } from "svelte";

    export let audios: ClientsideAudio[];
    export let groupThreshold: number = 3;
    export let currentUser: ClientsideUser | null = null;

    export let paginationBaseUrl: string = "/";
    export let page: number = 1;
    export let totalPages: number = 0;

    let itemComponents: Record<string, AudioItem> = {};

    function isAutoplayEnabled() {
        const stored = localStorage.getItem("audiopub_autoplay");
        return stored !== "false";
    }

    function handleTrackEnded(currentIndex: number) {
        if (!isAutoplayEnabled() || !audios || currentIndex >= audios.length - 1) {
            return;
        }
        handleNextTrack(currentIndex);
    }

    function handleNextTrack(currentIndex: number) {
        if (!audios || currentIndex >= audios.length - 1) return;
        const nextAudio = audios[currentIndex + 1];
        if (nextAudio) {
            const nextComp = itemComponents[nextAudio.id];
            if (nextComp) {
                nextComp.playAudio();
            }
        }
    }

    function handlePrevTrack(currentIndex: number) {
        if (!audios || currentIndex <= 0) return;
        const prevAudio = audios[currentIndex - 1];
        if (prevAudio) {
            const prevComp = itemComponents[prevAudio.id];
            if (prevComp) {
                prevComp.playAudio();
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

<section class="audio-list">
    {#each processedList as item (item.id)}
        {#if "isGroup" in item}
            <div class="audio-group">
                <h4>
                    <button
                        class="expand-button"
                        on:click={() => toggleGroup(item.id)}
                        aria-expanded={expandedGroups.get(item.id)
                            ? "true"
                            : "false"}
                    >
                        And {item.audios.length} more by {item.user.displayName}
                    </button>
                </h4>
                {#if expandedGroups.get(item.id)}
                    {#each item.audios as audio (audio.id)}
                        <AudioItem
                            bind:this={itemComponents[audio.id]}
                            {audio}
                            {currentUser}
                            onEnded={() => handleTrackEnded(audios.findIndex((a) => a.id === audio.id))}
                            onNext={() => handleNextTrack(audios.findIndex((a) => a.id === audio.id))}
                            onPrev={() => handlePrevTrack(audios.findIndex((a) => a.id === audio.id))}
                        />
                    {/each}
                {/if}
            </div>
        {:else}
            {@const audio = item}
            <AudioItem
                bind:this={itemComponents[audio.id]}
                {audio}
                {currentUser}
                onEnded={() => handleTrackEnded(audios.findIndex((a) => a.id === audio.id))}
                onNext={() => handleNextTrack(audios.findIndex((a) => a.id === audio.id))}
                onPrev={() => handlePrevTrack(audios.findIndex((a) => a.id === audio.id))}
            />
        {/if}
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
        <form class="page-jump" method="get" action={paginationBaseUrl.split("?")[0]}>
            {#each paginationBaseUrl.includes("?") ? paginationBaseUrl.split("?")[1].split("&") : [] as param}
                {#if param && !param.startsWith("page=")}
                    {@const [key, value] = param.split("=")}
                    <input type="hidden" name={key} value={decodeURIComponent(value ?? "")} />
                {/if}
            {/each}
            <label for="page-select">Page</label>
            <select name="page" id="page-select">
                {#each Array(totalPages) as _, i}
                    <option value={i + 1} selected={i + 1 === page}>Page {i + 1}</option>
                {/each}
            </select>
            <span aria-hidden="true">of {totalPages}</span>
            <button type="submit">Go</button>
        </form>
        {#if page < totalPages}
            <a
                href={`${paginationBaseUrl}${paginationQuerySeparator}page=${page + 1}`}
                >Next</a
            >
        {/if}
    </div>
{/if}

<style>
    .audio-list {
        margin-top: 10px;
    }

    .pagination {
        margin-top: 20px;
    }

    .page-jump {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
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
