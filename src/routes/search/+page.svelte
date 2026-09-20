<!--
  This file is part of the audiopub project.

  Copyright (C) 2024 the-byte-bender

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU Affero General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
  GNU Affero General Public License for more details.

  You should have received a copy of the GNU Affero General Public License
  along with this program. If not, see <https://www.gnu.org/licenses/>.
-->
<script lang="ts">
  import AudioList from "$lib/components/audio_list.svelte";
  import PlaylistItem from "$lib/components/playlist_item.svelte";
  import { getTitle } from "$lib/title";
  const title = getTitle();

  export let data;

  $: title.set(`Search results for: ${data.query}`);
</script>

<svelte:head>
    <title>Search results for: {data.query} | audiopub</title>
</svelte:head>

<h1>Search results for: {data.query}</h1>

{#if data.hasMutes && (data.includeMuted || data.hiddenByMutes > 0)}
  <p class="mute-notice">
    {#if data.includeMuted}
      Showing results from muted users.
      <a href={`/search?q=${encodeURIComponent(data.query)}`}>Hide them again</a>
    {:else if data.hiddenByMutes > 0}
      {data.hiddenByMutes}
      {data.hiddenByMutes === 1 ? "result is" : "results are"} hidden because you
      muted the uploader.
      <a
        href={`/search?q=${encodeURIComponent(data.query)}&includeMuted=on`}
        >Include muted users</a
      >
    {/if}
  </p>
{/if}

{#if data.searchType === "playlist"}
  <h2>Playlist Results</h2>
  {#if data.playlists && data.playlists.length > 0}
    <div class="playlists-grid">
      {#each data.playlists as playlist (playlist.id)}
        <PlaylistItem {playlist} />
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

  .mute-notice {
    text-align: center;
    margin-bottom: 1rem;
  }

  .playlists-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1rem;
    margin-top: 1rem;
  }

</style>
