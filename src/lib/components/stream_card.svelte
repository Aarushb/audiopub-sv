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
    import type { ClientsideStream } from "$lib/types";
    import SafeMarkdown from "./safe_markdown.svelte";

    export let stream: ClientsideStream;
</script>

<article class="stream-card">
    <div class="stream-indicator">
        <span class="live-dot" aria-hidden="true"></span>
    </div>

    <h3>
        <a href="/live/{stream.id}">{stream.title}</a>
        <span class="stats">
            | {stream.activeListeners} listener{stream.activeListeners === 1
                ? ""
                : "s"} | Peak {stream.peekListeners}
        </span>
    </h3>

    {#if stream.user}
        <p class="streamer">
            Streaming by
            <a href="/user/@{encodeURIComponent(stream.user.name)}">{stream.user.displayName}</a>
        </p>
    {/if}

    {#if stream.description}
        <SafeMarkdown source={stream.description} />
    {/if}
</article>

<style>
    .stream-card {
        position: relative;
        margin-bottom: 1rem;
        border: 2px solid #dc3545;
        padding: 1rem;
        border-radius: 8px;
        background: #fff;
    }

    .stream-indicator {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        background: #dc3545;
        color: white;
        padding: 0.2rem 0.6rem;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 700;
        margin-bottom: 0.5rem;
    }

    .live-dot {
        display: inline-block;
        width: 8px;
        height: 8px;
        background: white;
        border-radius: 50%;
        animation: pulse 1.5s ease-in-out infinite;
    }

    @keyframes pulse {
        0%,
        100% {
            opacity: 1;
        }
        50% {
            opacity: 0.4;
        }
    }

    h3 {
        margin: 0.25rem 0;
    }

    h3 a {
        color: #333;
        text-decoration: none;
    }

    h3 a:hover {
        text-decoration: underline;
    }

    .streamer {
        margin: 0.25rem 0;
        color: #555;
        font-size: 0.9rem;
    }

    .streamer a {
        color: #007bff;
        text-decoration: none;
    }

    .streamer a:hover {
        text-decoration: underline;
    }
</style>
