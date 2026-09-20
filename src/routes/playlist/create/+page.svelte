<!--
  This file is part of the audiopub project.
  
  Copyright (C) 2025 the-byte-bender
-->
<script lang="ts">
    import { enhance } from "$app/forms";
    import { getTitle } from "$lib/title";
    const title = getTitle();
    import type { PageData, ActionData } from "./$types";

    export let data: PageData;
    export let form: ActionData;

    $: title.set("Make Playlist");
    let submitting = false;
</script>

<svelte:head>
    <title>{"Make Playlist"} | audiopub</title>
</svelte:head>

<h1>Make Playlist</h1>

<form
    use:enhance={() => {
        submitting = true;
        return async ({ update }) => {
            await update();
            submitting = false;
        };
    }}
    method="POST"
>
    {#if form?.error}
        <p class="error-message" role="alert">{form.error}</p>
    {/if}

    <div class="form-group">
        <label for="playlist-name">Playlist Name:</label>
        <input
            type="text"
            id="playlist-name"
            name="name"
            required
            minlength="1"
            maxlength="120"
            class="form-control"
            value={form?.name ?? ""}
        />
    </div>

    <h2>Select Videos to Add</h2>

    {#if data.audios && data.audios.length > 0}
        <div class="audio-selection-list">
            {#each data.audios as audio (audio.id)}
                <div class="audio-selection-item">
                    <label class="audio-checkbox-label">
                        <input
                            type="checkbox"
                            name="audioIds"
                            value={audio.id}
                            id={`audio-select-${audio.id}`}
                        />
                        <span class="audio-title-heading">
                            <h3>{audio.title}</h3>
                        </span>
                    </label>
                    <p class="audio-meta">{audio.playsString}</p>
                </div>
            {/each}
        </div>
    {:else}
        <p>You have not uploaded any audio clips yet.</p>
    {/if}

    <button type="submit" class="btn" disabled={submitting}>
        {#if submitting}Creating...{:else}Add{/if}
    </button>
</form>

<style>
    h1 {
        text-align: center;
        margin-bottom: 1rem;
        color: #333;
    }

    h2 {
        margin-top: 1.5rem;
        margin-bottom: 1rem;
        color: #444;
    }

    form {
        display: flex;
        flex-direction: column;
        max-width: 600px;
        margin: 0 auto;
        padding: 2rem;
        border: 1px solid #ccc;
        border-radius: 8px;
        background-color: #f9f9f9;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }

    .form-group {
        width: 100%;
        display: flex;
        flex-direction: column;
        margin-bottom: 1rem;
    }

    label {
        margin-bottom: 0.5rem;
        font-weight: bold;
        color: #555;
    }

    .form-control {
        padding: 0.5rem;
        border: 1px solid #ccc;
        border-radius: 4px;
        font-size: 1rem;
        width: 100%;
    }

    .form-control:focus {
        border-color: #007bff;
        outline: none;
        box-shadow: 0 0 5px rgba(0, 123, 255, 0.5);
    }

    .error-message {
        color: #721c24;
        background-color: #f8d7da;
        border: 1px solid #f5c6cb;
        border-radius: 4px;
        padding: 0.75rem;
        margin-bottom: 1rem;
    }

    .audio-selection-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-bottom: 1.5rem;
    }

    .audio-selection-item {
        border: 1px solid #ddd;
        border-radius: 4px;
        padding: 10px 14px;
        background: #fff;
    }

    .audio-checkbox-label {
        display: flex;
        align-items: center;
        gap: 10px;
        cursor: pointer;
    }

    .audio-checkbox-label input[type="checkbox"] {
        width: 18px;
        height: 18px;
        cursor: pointer;
    }

    .audio-title-heading h3 {
        margin: 0;
        font-size: 1.1rem;
        color: #222;
    }

    .audio-meta {
        margin: 4px 0 0 28px;
        font-size: 0.85rem;
        color: #666;
    }

    .btn {
        padding: 0.75rem 1.5rem;
        border: none;
        border-radius: 4px;
        background-color: #007bff;
        color: white;
        font-size: 1rem;
        cursor: pointer;
        align-self: flex-start;
        transition: background-color 0.3s ease-in-out;
    }

    .btn:hover {
        background-color: #0056b3;
    }

    .btn:disabled {
        background-color: #cccccc;
        cursor: not-allowed;
    }
</style>
