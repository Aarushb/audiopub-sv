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
    import { createEventDispatcher, onMount } from "svelte";
    import { saveAccountPreference } from "$lib/preferences";

    export let sources: { src: string; type: string }[] = [];
    export let live = false;
    export let autofocus = false;
    export let preload: "none" | "metadata" | "auto" = "metadata";
    export let audioElement: HTMLAudioElement | undefined = undefined;
    export let chapters: { time: number }[] = [];
    // Off by default for players with no "next track" to advance to (e.g. a
    // preview embed) — toggling it there would still silently change the
    // site-wide autoplay preference via localStorage for no visible effect.
    export let showAutoplayToggle = true;
    // Default true so callers that don't track boundaries (or don't wire
    // next/prev at all) keep the buttons active. When explicitly false, the
    // corresponding button is disabled rather than left clickable with no
    // visible effect (next) or an unexplained history.back() (prev) — a
    // screen reader user has no other way to know there's nothing there.
    export let hasNext = true;
    export let hasPrev = true;
    // When set, playback position for this track is remembered across visits
    // (like YouTube's "continue watching") via localStorage keyed by id.
    export let audioId: string | undefined = undefined;
    // The logged-in account's saved autoplay preference, if any. Read once
    // at mount as the source of truth over this device's own localStorage
    // value — undefined/null (logged out, or never saved) falls back to it.
    export let accountAutoplay: boolean | null | undefined = undefined;
    // The account's saved position for this track, if any — same
    // precedence as accountAutoplay (account wins when present, else this
    // device's localStorage). null means "logged in, nothing saved";
    // undefined means "logged out" or "not applicable" (no audioId yet).
    export let accountPosition: number | null | undefined = undefined;
    // The account's saved autosave preference, same precedence pattern.
    // Off by default (unlike autoplay) — resuming is opt-in.
    export let accountAutosave: boolean | null | undefined = undefined;

    const dispatch = createEventDispatcher<{
        play: void;
        pause: void;
        ended: void;
        next: void;
        prev: void;
    }>();

    let isPlaying = false;
    let isBuffering = false;
    let currentTime = 0;
    let duration = 0;
    let volume = 1;
    let muted = false;
    let playbackRate = 1;
    // Bindable so a parent that decides whether to auto-advance on "ended"
    // (e.g. the listen page) shares this exact value instead of keeping its
    // own copy that only resyncs on the next full page load — otherwise
    // toggling the checkbox mid-session has no effect until the next track.
    export let autoplayEnabled = true;

    const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

    // Opt-in — resuming across sessions is only wired up once a track has
    // both an audioId and a logged-in or local-history source to resume
    // from; this stays false until onMount resolves it below.
    let autosaveEnabled = false;
    // Drives the manual button's label ("Save my place" vs "Clear saved
    // position") — kept in sync with whatever's actually stored, whether
    // that arrived via restore, an automatic save, or the button itself.
    let hasSavedPosition = false;
    let statusAnnouncement: HTMLElement | undefined = undefined;

    function announceStatus(message: string) {
        if (!statusAnnouncement) return;
        statusAnnouncement.textContent = message;
    }

    // bind:currentTime only resyncs from the "timeupdate" event, which
    // doesn't fire for a programmatic seek while paused — so every seek
    // that isn't the visible slider's own on:input has to update the
    // reactive value itself, or the seek bar/time text/aria-valuetext stay
    // frozen at the old position until playback starts.
    function setPosition(time: number) {
        if (!audioElement) return;
        audioElement.currentTime = time;
        currentTime = time;
    }

    function playbackPositionKey(id: string) {
        return `audiopub_playback_${id}`;
    }

    // Don't bother resuming a few seconds from the start. The end-side
    // threshold is a hybrid rather than a flat percentage: 5% of a 6-hour
    // live archive is an 18-minute unresumed blind spot, so it's capped at
    // 60 seconds for anything longer than that.
    const START_THRESHOLD_SECONDS = 5;
    const END_THRESHOLD_PERCENT = 0.05;
    const END_THRESHOLD_CAP_SECONDS = 60;

    function isNearEnd(time: number, dur: number): boolean {
        if (!isFinite(dur) || dur <= 0) return false;
        return time > dur - Math.min(dur * END_THRESHOLD_PERCENT, END_THRESHOLD_CAP_SECONDS);
    }

    // Account position wins over this device's localStorage when present
    // (same precedence as accountAutoplay), and gets written into
    // localStorage so this device's copy starts in sync with it.
    function restorePlaybackPosition() {
        if (!audioId || !audioElement) return;
        let saved: number | null;
        if (accountPosition !== undefined && accountPosition !== null) {
            saved = accountPosition;
            localStorage.setItem(playbackPositionKey(audioId), String(accountPosition));
        } else {
            const local = localStorage.getItem(playbackPositionKey(audioId));
            saved = local !== null ? parseFloat(local) : null;
        }
        hasSavedPosition = saved !== null && isFinite(saved);
        if (saved === null || !isFinite(saved) || saved < START_THRESHOLD_SECONDS) return;
        if (isNearEnd(saved, audioElement.duration)) return;
        setPosition(saved);
    }

    // Fire-and-forget, matching saveAccountPreference's pattern — a
    // logged-out viewer just gets a harmless 401 and the local save (the
    // only copy that matters for them) already happened. keepalive matters
    // here specifically: this fires from beforeunload and from the
    // autoplay-driven navigation on "ended", both of which start tearing
    // the page down in the same tick — without it, the browser aborts the
    // in-flight request before it reaches the server.
    function syncAccountPosition(position: number | null) {
        if (!audioId) return;
        fetch("/playback-position", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ audioId, position }),
            keepalive: true,
        }).catch(() => {});
    }

    // The one save path shared by every trigger — automatic (pause,
    // periodic, beforeunload) and the manual button alike. There's no
    // "manual" flag distinguishing a bookmark from automatic progress:
    // whichever call happens last wins, same as any other save.
    function savePlaybackPosition() {
        if (!audioId || !audioElement) return;
        const time = audioElement.currentTime;
        if (time < START_THRESHOLD_SECONDS || isNearEnd(time, audioElement.duration)) {
            clearPlaybackPosition();
            return;
        }
        localStorage.setItem(playbackPositionKey(audioId), String(time));
        hasSavedPosition = true;
        syncAccountPosition(time);
    }

    function clearPlaybackPosition() {
        if (!audioId) return;
        localStorage.removeItem(playbackPositionKey(audioId));
        hasSavedPosition = false;
        syncAccountPosition(null);
    }

    function handleManualSave() {
        if (hasSavedPosition) {
            clearPlaybackPosition();
            announceStatus("Cleared saved position.");
            return;
        }
        savePlaybackPosition();
        announceStatus(
            hasSavedPosition
                ? "Saved your place."
                : "Too close to the start or end of the track to save a position.",
        );
    }

    let saveInterval: ReturnType<typeof setInterval> | undefined;

    onMount(() => {
        if (accountAutoplay !== undefined && accountAutoplay !== null) {
            autoplayEnabled = accountAutoplay;
            localStorage.setItem("audiopub_autoplay", String(accountAutoplay));
        } else {
            const stored = localStorage.getItem("audiopub_autoplay");
            if (stored !== null) {
                autoplayEnabled = stored === "true";
            }
        }

        if (accountAutosave !== undefined && accountAutosave !== null) {
            autosaveEnabled = accountAutosave;
            localStorage.setItem("audiopub_playbackAutosave", String(accountAutosave));
        } else {
            autosaveEnabled = localStorage.getItem("audiopub_playbackAutosave") === "true";
        }

        // Playback is most often left mid-track by navigating away rather
        // than pausing first, so the position has to be captured on unload
        // too, not just on the periodic save and the pause handler.
        const handleBeforeUnload = () => {
            if (autosaveEnabled) savePlaybackPosition();
        };
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
            if (saveInterval) clearInterval(saveInterval);
        };
    });

    function toggleAutoplay(e: Event) {
        const target = e.target as HTMLInputElement;
        autoplayEnabled = target.checked;
        localStorage.setItem("audiopub_autoplay", String(autoplayEnabled));
        saveAccountPreference({ autoplay: autoplayEnabled });
    }

    function togglePlay() {
        if (!audioElement) return;
        if (audioElement.paused) {
            audioElement.play().catch((error) => {
                console.error("Failed to play audio:", error);
            });
        } else {
            audioElement.pause();
        }
    }

    function seek(seconds: number) {
        if (!audioElement || !isFinite(audioElement.duration)) return;
        setPosition(
            Math.max(
                0,
                Math.min(audioElement.duration, audioElement.currentTime + seconds),
            ),
        );
    }

    // These read audioElement.currentTime directly rather than the bound
    // `currentTime` variable above — that binding only resyncs on the
    // "timeupdate" event, which doesn't fire for a programmatic seek while
    // paused, so repeated presses while paused would keep computing from a
    // stale value and get stuck jumping to the same chapter.
    function jumpToPreviousChapter() {
        if (!audioElement || chapters.length === 0) return;
        const previous = [...chapters].reverse().find((c) => c.time < audioElement!.currentTime - 1);
        setPosition(previous ? previous.time : 0);
    }

    function jumpToNextChapter() {
        if (!audioElement || chapters.length === 0) return;
        const next = chapters.find((c) => c.time > audioElement!.currentTime + 0.5);
        if (next) setPosition(next.time);
    }

    function onSeekInput(event: Event) {
        const value = Number((event.currentTarget as HTMLInputElement).value);
        setPosition(value);
    }

    function onVolumeInput(event: Event) {
        if (!audioElement) return;
        const value = Number((event.currentTarget as HTMLInputElement).value);
        audioElement.volume = value;
        audioElement.muted = value === 0;
    }

    function toggleMute() {
        if (!audioElement) return;
        audioElement.muted = !audioElement.muted;
    }

    function cycleSpeed() {
        if (!audioElement || live) return;
        const index = SPEEDS.indexOf(playbackRate);
        const next = SPEEDS[(index + 1) % SPEEDS.length];
        audioElement.playbackRate = next;
    }

    function formatTime(seconds: number): string {
        if (!seconds || isNaN(seconds) || !isFinite(seconds)) return "0:00";
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        const paddedSecs = secs.toString().padStart(2, "0");
        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, "0")}:${paddedSecs}`;
        }
        return `${mins}:${paddedSecs}`;
    }

    function onKeydown(event: KeyboardEvent) {
        // Don't hijack keys while focus is on an input or textarea
        const target = event.target as HTMLElement;
        if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;

        if (event.ctrlKey && !event.altKey && !event.metaKey) {
            if (event.key === "ArrowLeft") {
                event.preventDefault();
                jumpToPreviousChapter();
                return;
            }
            if (event.key === "ArrowRight") {
                event.preventDefault();
                jumpToNextChapter();
                return;
            }
            return;
        }

        if (event.altKey || event.metaKey) return;

        switch (event.key) {
            case " ":
            case "k":
                event.preventDefault();
                togglePlay();
                break;
            case "j":
            case "ArrowLeft":
                if (!live) {
                    event.preventDefault();
                    seek(-10);
                }
                break;
            case "l":
            case "ArrowRight":
                if (!live) {
                    event.preventDefault();
                    seek(10);
                }
                break;
            case "n":
            case "N":
                event.preventDefault();
                dispatch("next");
                break;
            case "p":
            case "P":
                event.preventDefault();
                dispatch("prev");
                break;
            case "m":
                event.preventDefault();
                toggleMute();
                break;
            case ":":
                event.preventDefault();
                cycleSpeed();
                break;
        }
    }

    $: progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<section
    class="audio-player"
    aria-label="Audio player"
    role="group"
    on:keydown={onKeydown}
    tabindex="-1"
>
    <audio
        bind:this={audioElement}
        bind:currentTime
        bind:duration
        bind:volume
        bind:muted
        bind:playbackRate
        {preload}
        on:play={() => {
            isPlaying = true;
            isBuffering = false;
            dispatch("play");
        }}
        on:pause={() => {
            isPlaying = false;
            dispatch("pause");
            if (autosaveEnabled) savePlaybackPosition();
        }}
        on:ended={() => {
            isPlaying = false;
            dispatch("ended");
            clearPlaybackPosition();
            if (saveInterval) clearInterval(saveInterval);
        }}
        on:waiting={() => (isBuffering = true)}
        on:playing={() => (isBuffering = false)}
        on:canplay={() => (isBuffering = false)}
        on:loadedmetadata={() => {
            restorePlaybackPosition();
            if (!live && audioId) {
                if (saveInterval) clearInterval(saveInterval);
                saveInterval = setInterval(() => {
                    if (autosaveEnabled) savePlaybackPosition();
                }, 5000);
            }
        }}
    >
        {#each sources as source (source.src)}
            <source src={source.src} type={source.type} />
        {/each}
        <p>Your browser doesn't support the audio element.</p>
    </audio>

    <div class="controls">
        {#if !live}
            <button
                type="button"
                class="ctrl"
                on:click={() => dispatch("prev")}
                aria-label="Previous track (P)"
                title="Previous track (P)"
                disabled={!hasPrev}
            >
                <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                    <polygon points="6,6 6,18 8,18 8,6" fill="currentColor" />
                    <polygon points="18,6 9,12 18,18" fill="currentColor" />
                </svg>
            </button>
            <button
                type="button"
                class="ctrl"
                on:click={() => seek(-10)}
                aria-label="Rewind 10 seconds"
            >
                <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                    <path
                        fill="currentColor"
                        d="M12 5V1L7 6l5 5V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z"
                    />
                </svg>
            </button>
        {/if}

        <!-- svelte-ignore a11y-autofocus -->
        <button
            type="button"
            class="ctrl play"
            on:click={togglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
            {autofocus}
        >
            {#if isBuffering}
                <span class="spinner" aria-hidden="true"></span>
            {:else if isPlaying}
                <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
                    <rect x="6" y="4" width="4" height="16" fill="currentColor" />
                    <rect x="14" y="4" width="4" height="16" fill="currentColor" />
                </svg>
            {:else}
                <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
                    <polygon points="6,4 20,12 6,20" fill="currentColor" />
                </svg>
            {/if}
        </button>

        {#if !live}
            <button
                type="button"
                class="ctrl"
                on:click={() => seek(10)}
                aria-label="Forward 10 seconds"
            >
                <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                    <path
                        fill="currentColor"
                        d="M12 5V1l5 5-5 5V7a6 6 0 1 0 6 6h2a8 8 0 1 1-8-8z"
                    />
                </svg>
            </button>
            <button
                type="button"
                class="ctrl"
                on:click={() => dispatch("next")}
                aria-label="Next track (N)"
                title="Next track (N)"
                disabled={!hasNext}
            >
                <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                    <polygon points="6,6 15,12 6,18" fill="currentColor" />
                    <polygon points="16,6 16,18 18,18 18,6" fill="currentColor" />
                </svg>
            </button>
        {/if}

        {#if live}
            <span class="live-badge" class:on={isPlaying}>● LIVE</span>
        {:else}
            <span class="time current">{formatTime(currentTime)}</span>
            <input
                class="seek"
                type="range"
                min="0"
                max={duration || 0}
                step="any"
                value={currentTime}
                on:input={onSeekInput}
                aria-label="Seek"
                aria-valuetext="{formatTime(currentTime)}/{formatTime(duration)}"
                disabled={!duration}
            />
            <span class="time duration">{formatTime(duration)}</span>

            <button
                type="button"
                class="ctrl speed"
                on:click={cycleSpeed}
                aria-label="Playback speed {playbackRate}x"
            >
                {playbackRate}×
            </button>
        {/if}

        <button
            type="button"
            class="ctrl"
            on:click={toggleMute}
            aria-label={muted || volume === 0 ? "Unmute" : "Mute"}
        >
            {#if muted || volume === 0}
                <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                    <path
                        fill="currentColor"
                        d="M5 9v6h4l5 5V4L9 9H5zm11.5 3l2.7-2.7-1-1L15.5 11l-2.7-2.7-1 1L14.5 12l-2.7 2.7 1 1 2.7-2.7 2.7 2.7 1-1L16.5 12z"
                    />
                </svg>
            {:else}
                <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                    <path
                        fill="currentColor"
                        d="M5 9v6h4l5 5V4L9 9H5zm11 3a4 4 0 0 0-2-3.46v6.92A4 4 0 0 0 16 12z"
                    />
                </svg>
            {/if}
        </button>
        <input
            class="volume"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={muted ? 0 : volume}
            on:input={onVolumeInput}
            aria-label="Volume"
            aria-valuetext="{muted ? 0 : volume * 100}%"
        />

        {#if !live && showAutoplayToggle}
            <label class="autoplay-toggle-label" for="player-autoplay">
                <input
                    type="checkbox"
                    id="player-autoplay"
                    role="switch"
                    aria-checked={autoplayEnabled}
                    checked={autoplayEnabled}
                    on:change={toggleAutoplay}
                />
                Autoplay
            </label>
        {/if}

        {#if !live && audioId}
            <button type="button" class="position-btn" on:click={handleManualSave}>
                {hasSavedPosition ? "Clear saved position" : "Save my place"}
            </button>
        {/if}
    </div>

    <div aria-live="polite" class="sr-only" bind:this={statusAnnouncement}></div>
</section>

<style>
    .audio-player {
        width: 100%;
        box-sizing: border-box;
        background-color: #f0f0f0;
        border: 1px solid #ccc;
        border-radius: 8px;
        padding: 0.75rem;
        outline: none;
    }

    .controls {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-wrap: wrap;
    }

    .ctrl {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: none;
        background: none;
        color: #333;
        cursor: pointer;
        padding: 0.35rem;
        border-radius: 50%;
        line-height: 0;
        transition: background-color 0.2s ease, color 0.2s ease;
    }

    .ctrl:hover {
        background-color: #ddd;
        color: #000;
    }

    .ctrl:disabled {
        cursor: default;
        opacity: 0.4;
    }

    .ctrl:disabled:hover {
        background-color: transparent;
        color: #333;
    }

    .ctrl:focus-visible {
        outline: 2px solid #007bff;
        outline-offset: 2px;
    }

    .ctrl.play {
        background-color: #007bff;
        color: #fff;
        width: 44px;
        height: 44px;
        flex-shrink: 0;
    }

    .ctrl.play:hover {
        background-color: #0056b3;
        color: #fff;
    }

    .ctrl.speed {
        border-radius: 4px;
        font-size: 0.85rem;
        font-weight: 600;
        min-width: 2.5rem;
        padding: 0.35rem 0.4rem;
    }

    .time {
        font-size: 0.85rem;
        color: #666;
        font-variant-numeric: tabular-nums;
        flex-shrink: 0;
    }

    .seek {
        flex: 1 1 120px;
        min-width: 80px;
        accent-color: #007bff;
        cursor: pointer;
    }

    .volume {
        flex: 0 1 80px;
        min-width: 50px;
        accent-color: #007bff;
        cursor: pointer;
    }

    .autoplay-toggle-label {
        display: flex;
        align-items: center;
        gap: 0.3rem;
        font-size: 0.85rem;
        font-weight: 600;
        color: #444;
        cursor: pointer;
        margin-left: 0.5rem;
    }

    .position-btn {
        background: none;
        border: 1px solid #ccc;
        padding: 0.3rem 0.6rem;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.85rem;
        color: #444;
        margin-left: 0.5rem;
    }

    .position-btn:hover {
        background-color: #ddd;
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

    .live-badge {
        flex: 1;
        font-weight: 700;
        font-size: 0.9rem;
        color: #999;
        letter-spacing: 0.05em;
    }

    .live-badge.on {
        color: #d9534f;
    }

    .spinner {
        width: 22px;
        height: 22px;
        border: 3px solid rgba(255, 255, 255, 0.4);
        border-top-color: #fff;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }
</style>
