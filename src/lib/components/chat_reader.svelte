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
    import type { ClientsideStreamChat } from "$lib/types";

    export let chat: ClientsideStreamChat | null;

    let enabled = false;
    let outputMode: "assertive" | "polite" | "voice" = "polite";
    let voiceName = "";
    let pitch = 1;
    let rate = 1;
    let interrupt = false;
    let collapsed = false;

    let voices: SpeechSynthesisVoice[] = [];
    let liveRegionText = "";
    let utterThis: SpeechSynthesisUtterance | null = null;
    let liveRegion: HTMLDivElement;

    const STORAGE_KEY = "chatReaderSettings";

    function hasLocalStorage() {
        return typeof localStorage !== "undefined";
    }

    function loadSettings() {
        if (!hasLocalStorage()) return;
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                enabled = parsed.enabled ?? false;
                outputMode = parsed.outputMode ?? "polite";
                voiceName = parsed.voiceName ?? "";
                pitch = parsed.pitch ?? 1;
                rate = parsed.rate ?? 1;
                interrupt = parsed.interrupt ?? false;
            }
        } catch {}
    }

    function saveSettings() {
        if (!hasLocalStorage()) return;
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                enabled,
                outputMode,
                voiceName,
                pitch,
                rate,
                interrupt,
            }),
        );
    }

    function loadVoices() {
        voices = speechSynthesis.getVoices();
    }

    function handleChat() {
        if (!enabled) return;
        if (!chat) return;
        const text = `${chat.user.displayName} says ${chat.content}`;
        if (outputMode === "voice") {
            speak(text);
        } else {
            liveRegionText = text;
        }
    }

    function speak(text: string) {
        if (interrupt) {
            speechSynthesis.cancel();
        }
        utterThis = new SpeechSynthesisUtterance(text);
        utterThis.pitch = pitch;
        utterThis.rate = rate;
        if (voiceName) {
            const voice = voices.find((v) => v.name === voiceName);
            if (voice) utterThis.voice = voice;
        }
        speechSynthesis.speak(utterThis);
    }

    function cancelSpeech() {
        speechSynthesis.cancel();
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === "Escape" && outputMode === "voice") {
            cancelSpeech();
        }
    }

    $: if (chat) handleChat();

    onMount(() => {
        loadSettings();
        loadVoices();
        speechSynthesis.onvoiceschanged = loadVoices;
        window.addEventListener("keydown", handleKeydown);
        return () => {
            saveSettings();
            window.removeEventListener("keydown", handleKeydown);
            cancelSpeech();
        };
    });
</script>

<div class="chat-reader">
    <button
        aria-expanded={!collapsed}
        class="toggle"
        on:click={() => (collapsed = !collapsed)}
    >
        Chat Reader
    </button>

    {#if !collapsed}
        <div class="settings">
            <label class="setting-row">
                <input type="checkbox" bind:checked={enabled} />
                Enable Chat Reader
            </label>

            <fieldset class="setting-row">
                <legend>Output Mode</legend>
                <label>
                    <input
                        type="radio"
                        bind:group={outputMode}
                        value="polite"
                    />
                    Polite (screen reader)
                </label>
                <label>
                    <input
                        type="radio"
                        bind:group={outputMode}
                        value="assertive"
                    />
                    Assertive (screen reader)
                </label>
                <label>
                    <input type="radio" bind:group={outputMode} value="voice" />
                    System Voice (TTS)
                </label>
            </fieldset>

            {#if outputMode === "voice"}
                <div class="voice-settings">
                    <label class="setting-row">
                        Voice:
                        <select bind:value={voiceName}>
                            <option value="">Default</option>
                            {#each voices as voice}
                                <option value={voice.name}>
                                    {voice.name} ({voice.lang})
                                </option>
                            {/each}
                        </select>
                    </label>

                    <label class="setting-row">
                        Pitch
                        <input
                            type="range"
                            min="0.5"
                            max="2"
                            step="0.1"
                            bind:value={pitch}
                        />
                    </label>

                    <label class="setting-row">
                        Rate
                        <input
                            type="range"
                            min="0.5"
                            max="10"
                            step="0.1"
                            bind:value={rate}
                        />
                    </label>
                    <label class="setting-row">
                        <input type="checkbox" bind:checked={interrupt} />
                        Interrupt previous speech on a new message
                    </label>
                </div>
            {/if}
        </div>
    {/if}
</div>

{#if outputMode !== "voice"}
    <div
        bind:this={liveRegion}
        class="sr-only"
        aria-live={outputMode}
        aria-atomic="true"
    >
        {liveRegionText}
    </div>
{/if}

<style>
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

    .chat-reader {
        border: 1px solid #ccc;
        border-radius: 8px;
        margin-bottom: 1rem;
        background: #f9f9f9;
    }

    .toggle {
        width: 100%;
        padding: 0.5rem;
        border: none;
        background: #e9ecef;
        cursor: pointer;
        font-size: 0.9rem;
        font-weight: 600;
        text-align: left;
        border-radius: 8px;
    }

    .toggle:hover {
        background: #dee2e6;
    }

    .settings {
        padding: 0.75rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .setting-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.9rem;
    }

    fieldset {
        border: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    legend {
        font-weight: 600;
        margin-bottom: 0.25rem;
    }

    .voice-settings {
        padding-left: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    input[type="range"] {
        width: 100%;
    }

    select {
        width: 100%;
        max-width: 200px;
    }
</style>
