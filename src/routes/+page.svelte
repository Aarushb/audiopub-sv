<!--
  This file is part of the audiopub project.
  
  Copyright (C) 2024 the-byte-bender
-->
<script lang="ts">
    import AudioList from "$lib/components/audio_list.svelte";
    import StreamCard from "$lib/components/stream_card.svelte";
    import PlaylistItem from "$lib/components/playlist_item.svelte";
    import { getTitle } from "$lib/title";
    const title = getTitle();
    import { onMount } from "svelte";

    export let data;

    onMount(() => {
        title.set("Home");
    });

    let clipsChecked = data.filters?.clips ?? true;
    let archivesChecked = data.filters?.archives ?? true;
    let playlistsChecked = data.filters?.playlists ?? true;
    let filterStatusMessage = "";

    function handleFilterChange(type: "clips" | "archives" | "playlists", event: Event) {
        const target = event.target as HTMLInputElement;
        const checked = target.checked;

        if (type === "clips") clipsChecked = checked;
        if (type === "archives") archivesChecked = checked;
        if (type === "playlists") playlistsChecked = checked;

        if (!clipsChecked && !archivesChecked && !playlistsChecked) {
            if (type === "clips") clipsChecked = true;
            if (type === "archives") archivesChecked = true;
            if (type === "playlists") playlistsChecked = true;

            filterStatusMessage = "At least one content type filter must remain selected.";
            setTimeout(() => {
                filterStatusMessage = "";
            }, 4000);
        } else {
            filterStatusMessage = "";
        }
    }

    $: sortDescription = (() => {
        let fieldDesc = "date";
        if (data.sortField === "plays") fieldDesc = "play count";
        if (data.sortField === "favoriteCount") fieldDesc = "favorite count";
        if (data.sortField === "title") fieldDesc = "title";
        if (data.sortField === "random") return "random order";

        const orderDesc =
            data.sortField === "random"
                ? ""
                : data.sortOrder === "DESC"
                  ? "descending"
                  : "ascending";
        return `${fieldDesc} ${orderDesc}`.trim();
    })();

    $: paginationBaseUrl = `/?sort=${data.sortField}${data.sortField === "random" ? "" : "&order=" + data.sortOrder}&filter_clips=${clipsChecked}&filter_archives=${archivesChecked}&filter_playlists=${playlistsChecked}`;
</script>

<svelte:head>
    <title>{"Home"} | audiopub</title>
</svelte:head>

<h1>Welcome to Audiopub</h1>

{#if data.streams && data.streams.length > 0}
    <h2 id="streams-heading">Currently live</h2>
    {#each data.streams as stream (stream.id)}
        <StreamCard {stream} />
    {/each}
{/if}

<details class="filter-section">
    <summary class="filter-summary">
        <h2>Filter & Sort Options</h2>
    </summary>
    <form method="GET" action="/" class="filter-form">
        <fieldset class="filter-fieldset">
            <legend>Content Types:</legend>
            <div class="checkbox-row">
                <label class="checkbox-label" for="filter-clips">
                    <input
                        type="checkbox"
                        id="filter-clips"
                        name="filter_clips"
                        value="true"
                        bind:checked={clipsChecked}
                        on:change={(e) => handleFilterChange("clips", e)}
                    />
                    Clips
                </label>

                <label class="checkbox-label" for="filter-archives">
                    <input
                        type="checkbox"
                        id="filter-archives"
                        name="filter_archives"
                        value="true"
                        bind:checked={archivesChecked}
                        on:change={(e) => handleFilterChange("archives", e)}
                    />
                    Live Archives
                </label>

                <label class="checkbox-label" for="filter-playlists">
                    <input
                        type="checkbox"
                        id="filter-playlists"
                        name="filter_playlists"
                        value="true"
                        bind:checked={playlistsChecked}
                        on:change={(e) => handleFilterChange("playlists", e)}
                    />
                    Playlists
                </label>
            </div>
            {#if filterStatusMessage}
                <p class="filter-warning" role="alert" aria-live="polite">
                    {filterStatusMessage}
                </p>
            {/if}
        </fieldset>

        <div class="sort-controls">
            <label for="sort">Sort by:</label>
            <select name="sort" id="sort">
                <option value="createdAt" selected={data.sortField === "createdAt"}>Date</option>
                <option value="plays" selected={data.sortField === "plays"}>Play Count</option>
                <option value="favoriteCount" selected={data.sortField === "favoriteCount"}>Favorite Count</option>
                <option value="title" selected={data.sortField === "title"}>Title</option>
                <option value="random" selected={data.sortField === "random"}>Random</option>
            </select>

            {#if data.sortField !== "random"}
                <label for="order">Order:</label>
                <select name="order" id="order">
                    <option value="DESC" selected={data.sortOrder === "DESC"}>Descending</option>
                    <option value="ASC" selected={data.sortOrder === "ASC"}>Ascending</option>
                </select>
            {/if}

            <button type="submit" class="apply-btn">Apply Filters</button>
        </div>
    </form>
</details>

<h2>Audio & Playlist Results (sorted by {sortDescription})</h2>

{#if data.filters.playlists && data.playlists && data.playlists.length > 0}
    <section class="playlists-section">
        <h3>Playlists</h3>
        <div class="playlists-grid">
            {#each data.playlists as playlist (playlist.id)}
                <PlaylistItem {playlist} />
            {/each}
        </div>
    </section>
{/if}

{#if data.audios && data.audios.length > 0}
    <AudioList
        audios={data.audios}
        page={data.page}
        totalPages={data.totalPages}
        paginationBaseUrl={paginationBaseUrl}
    />
{:else if (!data.playlists || data.playlists.length === 0)}
    <p>No results match the selected filter criteria.</p>
{/if}

<style>
    h1 {
        text-align: center;
        margin-bottom: 1.5rem;
    }

    .filter-section {
        border: 1px solid #ccc;
        border-radius: 6px;
        padding: 0.75rem 1rem;
        background-color: #f9f9f9;
        margin-bottom: 1.5rem;
    }

    .filter-summary h2 {
        display: inline;
        font-size: 1.1rem;
        cursor: pointer;
        margin: 0;
    }

    .filter-form {
        margin-top: 1rem;
    }

    .filter-fieldset {
        border: none;
        padding: 0;
        margin: 0 0 1rem 0;
    }

    .filter-fieldset legend {
        font-weight: 600;
        margin-bottom: 0.5rem;
    }

    .checkbox-row {
        display: flex;
        gap: 1.5rem;
        flex-wrap: wrap;
    }

    .checkbox-label {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        cursor: pointer;
        font-size: 0.95rem;
    }

    .filter-warning {
        color: #d9534f;
        margin-top: 0.5rem;
        font-size: 0.9rem;
        font-weight: 600;
    }

    .sort-controls {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex-wrap: wrap;
        margin-top: 0.5rem;
    }

    .apply-btn {
        padding: 0.35rem 0.8rem;
        background-color: #007bff;
        color: #fff;
        border: none;
        border-radius: 4px;
        cursor: pointer;

    }

    .apply-btn:hover {
        background-color: #0056b3;
    }

    .playlists-section {
        margin-bottom: 2rem;
    }

    .playlists-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
        gap: 1rem;
        margin-top: 0.5rem;
    }

</style>
