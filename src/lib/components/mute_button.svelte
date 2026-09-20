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

    export let isMuted: boolean;
    export let displayName: string;
    export let isSubscribed: boolean = false;
</script>

<form use:enhance method="POST" action={isMuted ? "?/unmute" : "?/mute"}>
    <button type="submit">
        {isMuted ? `Unmute ${displayName}` : `Mute ${displayName}`}
    </button>
    {#if !isMuted}
        <p class="mute-hint">
            Muting hides their uploads and live streams from the home page,
            quickfeed, search and your notifications. Their profile stays
            readable.{isSubscribed
                ? " You will also be unsubscribed from them."
                : ""}
        </p>
    {/if}
</form>

<style>
    .mute-hint {
        font-size: 0.9rem;
        color: #444;
        margin: 0.3rem 0 0;
    }
</style>
