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
    import NotificationItem from "$lib/components/notification.svelte";
    import { enhance } from "$app/forms";
    import { browser } from "$app/environment";
    import OneSignal from "react-onesignal";
    import type { PageData } from "./$types";
    import { onMount } from "svelte";
    export let data: PageData;

    let pushSupported = false;
    let permissionGranted = false;

    async function togglePush() {
        if (!browser) return;
        if (!pushSupported) return;
        const optedIn = OneSignal.User.PushSubscription.optedIn as boolean;
        if (optedIn) {
            await OneSignal.User.PushSubscription.optOut();
        } else {
            await OneSignal.User.PushSubscription.optIn();
        }
    }

    async function requestPermission() {
        if (!browser || !pushSupported) return;
        await OneSignal.Notifications.requestPermission();
        permissionGranted = OneSignal.Notifications.permission as boolean;
    }

    onMount(() => {
        pushSupported = OneSignal.Notifications.isPushSupported();
        permissionGranted = OneSignal.Notifications.permission as boolean;
    });
</script>

<h1>Notifications</h1>

{#if browser && data.user && permissionGranted}
    <div class="push-toggle">
        <label>
            <input
                type="checkbox"
                checked={OneSignal.User.PushSubscription.optedIn as boolean}
                on:change={togglePush}
            />
            Push notifications
        </label>
    </div>
{:else if browser && data.user && pushSupported}
    <div class="push-alert" role="alert">
        <p>Would you like to receive push notifications on this device?</p>
        <button on:click={requestPermission}>Enable Push Notifications</button>
    </div>
{/if}

{#if data.notifications.length === 0}
    <p>No notifications.</p>
{:else}
    <ul class="list" role="list">
        {#each data.notifications as n (n.id)}
            <li>
                <NotificationItem notification={n} />
                {#if n.userId === data.user?.id}
                    <form
                        use:enhance
                        action="?/delete"
                        method="POST"
                        class="delete-form"
                    >
                        <input type="hidden" name="id" value={n.id} />
                        <button type="submit" class="delete-btn">Delete</button>
                    </form>
                {/if}
            </li>
        {/each}
    </ul>

    <form use:enhance method="POST" action="?/clear_all">
        <button type="submit">Clear all</button>
    </form>
{/if}

<style>
    h1 {
        margin-bottom: 0.75rem;
    }
    .list {
        display: grid;
        gap: 0.5rem;
        padding: 0;
    }
    li {
        list-style: none;
        padding-bottom: 0.5rem;
        border-bottom: 1px solid #eee;
    }
    form {
        margin-top: 1rem;
    }
    button {
        padding: 0.5rem 0.75rem;
    }
    .delete-form {
        margin-top: 0.5rem;
        text-align: right;
    }
    .delete-btn {
        background: none;
        border: 1px solid #ccc;
        color: #555;
        padding: 0.2rem 0.5rem;
        font-size: 0.8rem;
        border-radius: 4px;
        cursor: pointer;
    }
    .delete-btn:hover {
        background: #f0f0f0;
        border-color: #aaa;
    }

    .push-toggle {
        margin-bottom: 1rem;
    }

    .push-toggle label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        cursor: pointer;
    }

    .push-toggle input {
        width: auto;
    }

    .push-alert {
        background: #fff3cd;
        border: 1px solid #ffc107;
        border-radius: 4px;
        padding: 1rem;
        margin-bottom: 1rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
    }

    .push-alert p {
        margin: 0;
        flex: 1;
    }

    .push-alert button {
        flex-shrink: 0;
        padding: 0.5rem 1rem;
        background: #007bff;
        color: #fff;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    }

    .push-alert button:hover {
        background: #0056b3;
    }
</style>
