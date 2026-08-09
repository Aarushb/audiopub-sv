<script lang="ts">
    import { createEventDispatcher } from "svelte";

    export let sources: { src: string; type: string }[] = [];
    export let live = false;
    export let autofocus = false;
    export let preload: "none" | "metadata" | "auto" = "metadata";
    export let audioElement: HTMLAudioElement | undefined = undefined;

    const dispatch = createEventDispatcher<{
        play: void;
        pause: void;
        ended: void;
    }>();

    let isPlaying = false;
    let isBuffering = false;
    let currentTime = 0;
    let duration = 0;
    let volume = 1;
    let muted = false;
    let playbackRate = 1;

    const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

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
        if (!audioElement || !isFinite(duration)) return;
        audioElement.currentTime = Math.max(
            0,
            Math.min(duration, currentTime + seconds),
        );
    }

    function onSeekInput(event: Event) {
        if (!audioElement) return;
        const value = Number((event.currentTarget as HTMLInputElement).value);
        audioElement.currentTime = value;
        currentTime = value;
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
        if (event.altKey || event.ctrlKey || event.metaKey) return;

        // Don't hijack keys while focus is on the sliders themselves.
        const target = event.target as HTMLElement;
        if (target?.tagName === "INPUT") return;

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
        }}
        on:ended={() => {
            isPlaying = false;
            dispatch("ended");
        }}
        on:waiting={() => (isBuffering = true)}
        on:playing={() => (isBuffering = false)}
        on:canplay={() => (isBuffering = false)}
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
    </div>
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
