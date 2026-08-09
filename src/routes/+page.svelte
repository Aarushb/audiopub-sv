<!--
  This file is part of the audiopub project.
  
  Copyright (C) 2024 the-byte-bender
-->
<script lang="ts">
    import title from "$lib/title";
    import AudioList from "$lib/components/audio_list.svelte";
    import type { PageData } from "./$types";

    export let data: PageData;
    title.set("Home");

    let clipsChecked = data.filters.clips;
    let archivesChecked = data.filters.archives;
    let playlistsChecked = data.filters.playlists;
    let filterStatusMessage = "";

    $: clipsChecked = data.filters.clips;
    $: archivesChecked = data.filters.archives;
    $: playlistsChecked = data.filters.playlists;

    function handleFilterChange(changedOption: "clips" | "archives" | "playlists", e: Event) {
        const target = e.target as HTMLInputElement;
        let c = clipsChecked;
        let a = archivesChecked;
        let p = playlistsChecked;

        if (changedOption === "clips") c = target.checked;
        if (changedOption === "archives") a = target.checked;
        if (changedOption === "playlists") p = target.checked;

        // Ensure user cannot uncheck all options
        if (!c && !a && !p) {
            e.preventDefault();
            target.checked = true;
            if (changedOption === "clips") clipsChecked = true;
            if (changedOption === "archives") archivesChecked = true;
            if (changedOption === "playlists") playlistsChecked = true;
            filterStatusMessage = "At least one filter option must remain selected.";
        } else {
            clipsChecked = c;
            archivesChecked = a;
            playlistsChecked = p;
            filterStatusMessage = "";
        }
    }

    $: sortDescription = (() => {
        let fieldDesc = "";
        switch (data.sortField) {
            case "createdAt":
                fieldDesc = "date";
                break;
            case "plays":
                fieldDesc = "play count";
                break;
            case "favoriteCount":
                fieldDesc = "favorite count";
                break;
            case "title":
                fieldDesc = "title";
                break;
            case "random":
                fieldDesc = "random";
                break;
            default:
                fieldDesc = "date";
        }
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

<h1>Welcome to Audiopub</h1>

<details class="filter-section" open>
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
                <article class="playlist-card">
                    <h3>
                        <a href={`/playlist/${playlist.id}`}>{playlist.name}</a>
                    </h3>
                    <p>{playlist.trackCount ?? playlist.audios?.length ?? 0} tracks</p>
                    {#if playlist.user}
                        <p class="byline">By <a href={`/user/${playlist.user.id}`}>{playlist.user.displayName}</a></p>
                    {/if}
                </article>
            {/each}
        </div>
    </section>
{/if}

{#if data.audios && data.audios.length > 0}
    <AudioList
        audios={data.audios}
        page={data.page}
        totalPages={data.totalPages}
        currentUser={data.user}
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
        border-radius: 8px;
        padding: 1rem;
        background-color: #f9f9f9;
        margin-bottom: 1.5rem;
    }

    .filter-summary {
        cursor: pointer;
    }

    .filter-summary h2 {
        display: inline-block;
        margin: 0;
        font-size: 1.2rem;
        color: #333;
    }

    .filter-form {
        margin-top: 1rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .filter-fieldset {
        border: 1px solid #ddd;
        border-radius: 6px;
        padding: 1rem;
        background-color: #fff;
    }

    .filter-fieldset legend {
        font-weight: bold;
        color: #444;
        padding: 0 4px;
    }

    .checkbox-row {
        display: flex;
        gap: 1.5rem;
        flex-wrap: wrap;
    }

    .checkbox-label {
        display: flex;
        align-items: center;
        gap: 6px;
        font-weight: normal;
        cursor: pointer;
    }

    .checkbox-label input[type="checkbox"] {
        width: 18px;
        height: 18px;
        cursor: pointer;
    }

    .filter-warning {
        color: #721c24;
        font-weight: bold;
        margin-top: 8px;
        margin-bottom: 0;
    }

    .sort-controls {
        display: flex;
        align-items: center;
        gap: 1rem;
        flex-wrap: wrap;
    }

    .sort-controls select {
        padding: 0.4rem 0.8rem;
        border: 1px solid #ccc;
        border-radius: 4px;
    }

    .apply-btn {
        padding: 0.5rem 1rem;
        background-color: #007bff;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
    }

    .apply-btn:hover {
        background-color: #0056b3;
    }

    .playlists-section {
        margin-bottom: 1.5rem;
    }

    .playlists-section h3 {
        margin-bottom: 0.75rem;
    }

    .playlists-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
        gap: 1rem;
    }

    .playlist-card {
        border: 1px solid #ccc;
        border-radius: 6px;
        padding: 1rem;
        background-color: #fff;
    }

    .playlist-card h3 {
        margin: 0 0 0.4rem 0;
    }

    .playlist-card h3 a {
        color: #007bff;
        text-decoration: none;
    }

    .playlist-card p {
        margin: 0;
        font-size: 0.9rem;
        color: #666;
    }

    .byline {
        margin-top: 4px !important;
    }

    .byline a {
        color: #007bff;
    }
</style>
