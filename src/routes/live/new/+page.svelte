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
    import { enhance } from "$app/forms";
    import title from "$lib/title";
    import Modal from "$lib/components/modal.svelte";
    import { onMount } from "svelte";
    onMount(() => title.set("Go Live"));

    let submitting = false;
    let showConfirm = false;

    let titleValue = "";
    let descriptionValue = "";
    let archiveValue = false;
</script>

<h1>Go Live</h1>

<p class="info">
    Streams are supported in <strong>MP3</strong> and <strong>AAC</strong>
    formats only.
</p>

<div class="info-box">
    <p>
        To be fair to our infrastructure and all streamers, if a stream source
        outputs above <strong>256kbps</strong>
        for a period of time, it will be disconnected and you'll have to reconnect
        the source with a lower bitrate. We recommend using
        <strong>176kbps AAC</strong> for very good quality that works well for most
        conditions.
    </p>
</div>

<p class="stream-help-link">
    Not sure how to connect your software? <a
        href="/stream/instructions"
        target="_blank"
        rel="noopener">Read the streaming instructions</a
    >
</p>

<form
    use:enhance={() => {
        submitting = true;
        return async ({ update }) => {
            await update();
            submitting = false;
            showConfirm = false;
        };
    }}
    method="POST"
    id="stream-form"
>
    <div class="form-group">
        <label for="title">Title:</label>
        <input
            type="text"
            id="title"
            name="title"
            required
            autofocus
            minlength="1"
            maxlength="200"
            class="form-control"
            bind:value={titleValue}
        />
    </div>

    <div class="form-group">
        <label for="description">Description:</label>
        <textarea
            id="description"
            name="description"
            maxlength="2000"
            class="form-control"
            bind:value={descriptionValue}
        ></textarea>
    </div>

    <div class="warning-box">
        <p>
            As the stream owner, you have access to moderation tools for this
            stream. While platform staff may independently moderate, they are
            not always available for a live stream. As such, you are expected to
            take responsibility for keeping your live chat in good taste and
            within the law. Please moderate your chat accordingly. Your help in
            keeping the platform a decent place is appreciated.
        </p>
        <p>
            Note: Archiving will likely cut off after about 6 hours at 256kbps.
            Streaming at a lower bitrate significantly extends this; at 176kbps,
            you can expect archives up to around 9 hours. The live stream itself
            is not affected by this limit.
        </p>
    </div>

    <div class="form-group">
        <label for="shouldArchive">
            <input
                type="checkbox"
                id="shouldArchive"
                name="shouldArchive"
                bind:checked={archiveValue}
            />
            Archive this stream when finished
        </label>
    </div>

    <button type="button" on:click={() => (showConfirm = true)}>
        Create Stream
    </button>
</form>

<Modal bind:visible={showConfirm}>
    <h2>Confirm Stream Settings</h2>
    <p>Please review your stream settings before starting:</p>
    <dl>
        <dt>Title:</dt>
        <dd>{titleValue || "(none)"}</dd>
        <dt>Description:</dt>
        <dd>{descriptionValue || "(none)"}</dd>
        <dt>Archive:</dt>
        <dd>{archiveValue ? "Yes" : "No"}</dd>
    </dl>
    <p class="important">
        <strong>Important:</strong> Once the stream starts, these settings cannot
        be changed!
    </p>
    <div class="modal-buttons">
        <button type="button" on:click={() => (showConfirm = false)}
            >Cancel</button
        >
        <button type="submit" form="stream-form" disabled={submitting}>
            {submitting ? "Creating..." : "Confirm & Create"}
        </button>
    </div>
</Modal>

<style>
    .info {
        margin-bottom: 1rem;
        color: #666;
    }

    .warning-box {
        background-color: #fef3cd;
        border: 1px solid #ffc107;
        border-radius: 4px;
        padding: 1rem;
        margin-bottom: 1rem;
    }

    .warning-box p {
        margin: 0;
        font-size: 0.9rem;
    }

    .info-box {
        background-color: #d4edda;
        border: 1px solid #28a745;
        border-radius: 4px;
        padding: 1rem;
        margin-bottom: 1rem;
    }

    .info-box p {
        margin: 0;
        font-size: 0.9rem;
    }

    .form-group {
        margin-bottom: 1rem;
    }

    label {
        display: block;
        margin-bottom: 0.25rem;
        font-weight: 500;
    }

    .form-control {
        width: 100%;
        padding: 0.5rem;
        border: 1px solid #ccc;
        border-radius: 4px;
        font-size: 1rem;
    }

    textarea.form-control {
        min-height: 100px;
        resize: vertical;
    }

    button {
        padding: 0.75rem 1.5rem;
        background-color: #d9534f;
        color: white;
        border: none;
        border-radius: 4px;
        font-size: 1rem;
        cursor: pointer;
    }

    button:hover:not(:disabled) {
        background-color: #c9302c;
    }

    button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .modal-buttons {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
        margin-top: 1rem;
    }

    .modal-buttons button {
        padding: 0.5rem 1rem;
        border-radius: 4px;
        cursor: pointer;
    }

    .modal-buttons button:first-child {
        background-color: #ccc;
        color: #333;
        border: none;
    }

    .modal-buttons button:first-child:hover {
        background-color: #bbb;
    }

    .modal-buttons button:last-child {
        background-color: #d9534f;
        color: white;
        border: none;
    }

    .modal-buttons button:last-child:hover:not(:disabled) {
        background-color: #c9302c;
    }

    dl {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 0.25rem 1rem;
    }

    dt {
        font-weight: 600;
    }

    dd {
        margin: 0;
    }

    .important {
        background-color: #ffeeba;
        padding: 0.75rem;
        border-radius: 4px;
        margin-top: 1rem;
    }
</style>
