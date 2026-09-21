<!--
  This file is part of the audiopub project.

  Copyright (C) 2026 the-byte-bender

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
    import { onMount } from "svelte";
    import { getTitle } from "$lib/title";
    import { saveAccountPreference } from "$lib/preferences";

    export let data;
    const title = getTitle();
    $: title.set("Settings");

    const STORAGE_KEY = "audiopub_playbackAutosave";

    // Same local+account precedence as every other preference on this
    // page's account: the account's value wins once known, and a guest (or
    // a not-yet-hydrated page) falls back to this device's own copy.
    let playbackAutosave = false;
    let statusAnnouncement: HTMLElement | undefined = undefined;

    function announceStatus(message: string) {
        if (!statusAnnouncement) return;
        statusAnnouncement.textContent = message;
    }

    onMount(() => {
        const accountValue = data.user?.preferences?.playbackAutosave;
        if (accountValue !== undefined && accountValue !== null) {
            playbackAutosave = accountValue;
            localStorage.setItem(STORAGE_KEY, String(accountValue));
        } else {
            playbackAutosave = localStorage.getItem(STORAGE_KEY) === "true";
        }
    });

    function toggleAutosave(e: Event) {
        const checked = (e.target as HTMLInputElement).checked;
        playbackAutosave = checked;
        localStorage.setItem(STORAGE_KEY, String(checked));
        saveAccountPreference({ playbackAutosave: checked });
        announceStatus(
            checked
                ? "Automatic playback position saving turned on."
                : "Automatic playback position saving turned off.",
        );
    }
</script>

<svelte:head>
    <title>Settings | audiopub</title>
</svelte:head>

<h1>Settings</h1>

<div aria-live="polite" class="sr-only" bind:this={statusAnnouncement}></div>

<section class="settings-section">
    <label class="toggle-label" for="playback-autosave">
        <input
            type="checkbox"
            id="playback-autosave"
            role="switch"
            aria-checked={playbackAutosave}
            checked={playbackAutosave}
            on:change={toggleAutosave}
        />
        Automatically remember my playback position
    </label>
    <p class="setting-help">
        When on, your place in a track is saved automatically as you listen
        and pause, and restored the next time you open it — on this device,
        and on your account if you're signed in elsewhere. The "Save my
        place" button on the listen page always works regardless of this
        setting, for tracks you want to bookmark individually.
    </p>
</section>

<style>
    h1 {
        text-align: center;
        margin-bottom: 1rem;
        color: #333;
    }

    .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
    }

    .settings-section {
        max-width: 500px;
        margin: 0 auto;
        padding: 1.5rem;
        border: 1px solid #ddd;
        border-radius: 8px;
        background-color: #f9f9f9;
    }

    .toggle-label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: bold;
        cursor: pointer;
    }

    .setting-help {
        margin: 0.75rem 0 0;
        color: #555;
        font-size: 0.9rem;
    }
</style>
