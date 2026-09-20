<!--
  This file is part of the audiopub project.

  Copyright (C) 2025 the-byte-bender

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
    import Modal from "./modal.svelte";

    export let visible: boolean = false;
</script>

<Modal bind:visible>
    <h2>Keyboard shortcuts</h2>

    <h3>Playback</h3>
    <dl>
        <div><dt>Space / K</dt><dd>Play or pause</dd></div>
        <div><dt>J / Left arrow</dt><dd>Seek back 10 seconds</dd></div>
        <div><dt>L / Right arrow</dt><dd>Seek forward 10 seconds</dd></div>
        <div><dt>N</dt><dd>Next track</dd></div>
        <div><dt>P</dt><dd>Previous track</dd></div>
        <div><dt>M</dt><dd>Mute or unmute</dd></div>
        <div><dt>:</dt><dd>Cycle playback speed</dd></div>
        <div><dt>Ctrl + Left arrow</dt><dd>Jump to the previous chapter</dd></div>
        <div><dt>Ctrl + Right arrow</dt><dd>Jump to the next chapter</dd></div>
    </dl>

    <h3>Comments</h3>
    <dl>
        <div><dt>Up / Down arrow</dt><dd>Move between comments at the same level</dd></div>
        <div><dt>Right arrow</dt><dd>Expand a comment's replies and move into them</dd></div>
        <div><dt>Left arrow</dt><dd>Collapse a comment's replies and move to its parent</dd></div>
    </dl>

    <h3>General</h3>
    <dl>
        <div><dt>?</dt><dd>Show this list of shortcuts</dd></div>
    </dl>

    <button type="button" on:click={() => (visible = false)}>Close</button>
</Modal>

<style>
    dl {
        margin: 0 0 1rem;
    }

    dl div {
        display: flex;
        gap: 0.5rem;
        padding: 0.2rem 0;
        border-bottom: 1px solid #eee;
    }

    dt {
        font-weight: 600;
        min-width: 11rem;
    }
</style>
