<!--
  This file is part of the audiopub project.
  
  Copyright (C) 2024 the-byte-bender
-->
<script lang="ts">
  import AudioList from "$lib/components/audio_list.svelte";
  import { getTitle } from "$lib/title";
  const title = getTitle();

  export let data;

  $: title.set(`Search results for: ${data.query}`);
</script>

<svelte:head>
    <title>{`Search results for: `} | audiopub</title>
</svelte:head>

<h1>Search results for: {data.query}</h1>

{#if data.searchType === "playlist"}
  <h2>Playlist Results</h2>
  {#if data.playlists && data.playlists.length > 0}
    <div class="playlists-grid">
      {#each data.playlists as playlist (playlist.id)}
        <article class="playlist-card">
          <h3>
            <a href={`/playlist/${playlist.id}`}>{playlist.name}</a>
          </h3>
          <p>{playlist.trackCount ?? playlist.audios?.length ?? 0} tracks</p>
          {#if playlist.user}
            <p class="byline">Created by <a href={`/user/${playlist.user.id}`}>{playlist.user.displayName}</a></p>
          {/if}
        </article>
      {/each}
    </div>
  {:else}
    <p>No playlists found matching "{data.query}".</p>
  {/if}
{:else if data.searchType === "live"}
  <h2>Live Archive Results</h2>
  {#if data.audios && data.audios.length > 0}
    <AudioList audios={data.audios} page={data.page} totalPages={0} paginationBaseUrl={`/search?q=${encodeURIComponent(data.query)}`} />
  {:else}
    <p>No live archives found matching "{data.query}".</p>
  {/if}
{:else}
  {#if data.audios && data.audios.length > 0}
    <AudioList audios={data.audios} page={data.page} totalPages={0} paginationBaseUrl={`/search?q=${encodeURIComponent(data.query)}`} />
  {:else}
    <p>No audio results found matching "{data.query}".</p>
  {/if}
{/if}

<style>
  h1 {
    text-align: center;
    margin-bottom: 1rem;
    color: #333;
  }

  h2 {
    margin-top: 1rem;
    margin-bottom: 1rem;
    color: #444;
  }

  .playlists-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1rem;
    margin-top: 1rem;
  }

  .playlist-card {
    border: 1px solid #ccc;
    border-radius: 6px;
    padding: 1rem;
    background-color: #fff;
  }

  .playlist-card h3 {
    margin: 0 0 0.5rem 0;
  }

  .playlist-card h3 a {
    color: #007bff;
    text-decoration: none;
  }

  .playlist-card h3 a:hover {
    text-decoration: underline;
  }

  .playlist-card p {
    margin: 0;
    color: #666;
    font-size: 0.9rem;
  }

  .byline a {
    color: #007bff;
  }
</style>
