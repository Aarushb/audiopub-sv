<!--
  This file is part of the audiopub project.
  
  Copyright (C) 2025 the-byte-bender
-->
<script lang="ts">
    import { enhance } from "$app/forms";
    import { createTitleStore } from "$lib/title";
    import { onDestroy, onMount } from "svelte";
    import { browser } from "$app/environment";
    import OneSignal from "react-onesignal";
    import type { LayoutData } from "./$types";
    import * as envPublic from "$env/static/public";
    import KeyboardShortcutsModal from "$lib/components/keyboard_shortcuts_modal.svelte";
    const PUBLIC_ONE_SIGNAL_APP_ID = (envPublic as any).PUBLIC_ONE_SIGNAL_APP_ID;

    export let data: LayoutData;

    const title = createTitleStore();

    // Each page renders its own <svelte:head><title> for correct SSR output
    // (a <title> declared here in the layout would always win over a page's
    // own, regardless of source order, leaving every page with this same
    // generic title until hydration). The unread-count prefix is inherently
    // client-only anyway, since it depends on a fetch that never runs
    // during SSR, so it's applied as a plain DOM mutation once mounted
    // instead of through <svelte:head>.
    $: if (browser) {
        document.title = `${unreadCount > 0 ? `(${unreadCount}) ` : ""}${$title} | audiopub`;
    }

    let shortcutsModalVisible = false;

    function handleGlobalKeydown(event: KeyboardEvent) {
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        const target = event.target as HTMLElement;
        if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
        if (event.key === "?") {
            event.preventDefault();
            shortcutsModalVisible = true;
        }
    }

    let unreadCount = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let backoffMs = 60000;
    const maxBackoff = 5 * 60_000;
    const minBackoff = 30_000;
    let inFlight = false;
    let lastFetchTs = 0;
    const MIN_IMMEDIATE_INTERVAL = 20000;
    let onesignalReady = false;

    async function refreshUnread() {
        if (!data.user) return;
        if (document.visibilityState === "hidden") return;
        if (inFlight) return;

        try {
            inFlight = true;
            const ctrl = new AbortController();
            const timeoutId = setTimeout(() => ctrl.abort(), 8000);
            const res = await fetch("/notifications", {
                signal: ctrl.signal,
                headers: { "cache-control": "no-cache" },
            });
            clearTimeout(timeoutId);
            if (!res.ok) throw new Error(String(res.status));
            const body = await res.json();
            unreadCount = Number(body?.unread ?? 0) || 0;

            // Reset backoff on success
            backoffMs = 60000;
        } catch (e) {
            backoffMs = Math.min(
                Math.max(backoffMs * 2, minBackoff),
                maxBackoff,
            );
        } finally {
            lastFetchTs = Date.now();
            inFlight = false;
        }
    }

    function scheduleNext() {
        if (timer) clearTimeout(timer);
        timer = setTimeout(async () => {
            await refreshUnread();
            scheduleNext();
        }, backoffMs);
    }

    function triggerImmediateRefresh() {
        const now = Date.now();
        if (now - lastFetchTs < MIN_IMMEDIATE_INTERVAL) return;
        refreshUnread();
    }

    onMount(() => {
        refreshUnread();
        scheduleNext();

        const handleVisibility = () => {
            if (document.visibilityState === "visible") {
                triggerImmediateRefresh();
            }
        };

        const handleFocus = () => {
            triggerImmediateRefresh();
        };

        window.addEventListener("visibilitychange", handleVisibility);
        window.addEventListener("focus", handleFocus);
        window.addEventListener("keydown", handleGlobalKeydown);

        if (browser && PUBLIC_ONE_SIGNAL_APP_ID) {
            try {
                OneSignal.init({
                    appId: PUBLIC_ONE_SIGNAL_APP_ID,
                    allowLocalhostAsSecureOrigin: true,
                }).then(() => {
                    onesignalReady = true;
                    if (data.user) {
                        OneSignal.login(data.user.id);
                    }
                });
            } catch (e) {
                console.error("Failed to initialize OneSignal:", e);
            }
        }

        return () => {
            if (timer) clearTimeout(timer);
            window.removeEventListener("visibilitychange", handleVisibility);
            window.removeEventListener("focus", handleFocus);
            window.removeEventListener("keydown", handleGlobalKeydown);
        };
    });

    $: if (browser && onesignalReady) {
        if (data.user) {
            OneSignal.login(data.user.id);
        } else {
            OneSignal.logout();
        }
    }
</script>

<header>
    <nav>
        <a href="/">Home</a>
        <a href="/quickfeed">Quickfeed</a>
        <a href="/subscriptions">Subscriptions</a>
        {#if data.user}
            {#if !data.user.isVerified}
                <p>
                    <b>WARNING:</b> Your account is not verified. Please verify your
                    account to access all features.
                </p>
                <a href="/verify">Verify</a>
            {:else}
                <a href="/notifications" class="notifications-link">
                    Notifications
                    {#if unreadCount > 0}
                        <span
                            class="badge"
                            aria-label={`${unreadCount} unread notifications`}
                            >{unreadCount}</span
                        >
                    {/if}
                </a>
                <a href="/favorites">Favorites</a>
                <details class="create-menu">
                    <summary class="create-summary">Create</summary>
                    <div class="create-dropdown">
                        <a href="/upload">Upload</a>
                        <a href="/upload?type=live">Go Live</a>
                        <a href="/playlist/create">Make Playlist</a>
                    </div>
                </details>
                <a href="/profile">Profile</a>
                {#if data.user.isAdmin}
                    <a href="/admin">Admin Panel</a>
                {/if}
                <a href="/logout">Logout</a>
            {/if}
        {:else}
            <a href="/login">Login</a>
            <a href="/register">Register</a>
        {/if}
    </nav>
    <form action="/search" method="get">
        <input type="text" name="q" placeholder="Search..." />
        <button type="submit">Search</button>
    </form>
</header>
<main>
    <slot />
</main>

<KeyboardShortcutsModal bind:visible={shortcutsModalVisible} />

<hr />
<footer>
    <div class="copyright">
        <p>
            All rights to the audio files and associated content uploaded to
            this platform remain with their respective creators or rightful
            owners.
        </p>
        <p>
            For inquiries regarding content ownership or usage, please contact:
            <a href="mailto:cccefg2@gmail.com"> cccefg2@gmail.com</a>
            I'm sorry for the unprofessional email address, I'm still working on
            it.
        </p>
        <a href="/agreement">Our Agreement</a>
        <p>
            Audiopub is open source software. The code is licensed under the GNU
            AFFERO GENERAL PUBLIC LICENSE. You can find the source code on
            <a href="https://github.com/the-byte-bender/audiopub-sv">GitHub</a>.
        </p>
    </div>
</footer>

<style>
    header {
        background-color: #f0f0f0;
        padding: 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        position: sticky;
        top: 0;
        z-index: 1000;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    nav a {
        margin-right: 10px;
        text-decoration: none;
        color: #333;
    }

    nav a:hover {
        color: #000;
    }

    .create-menu {
        display: inline-block;
        position: relative;
        margin-right: 10px;
    }

    .create-summary {
        cursor: pointer;
        font-weight: 600;
        color: #333;
        padding: 4px 8px;
    }

    .create-summary:hover {
        color: #000;
    }

    .create-dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        background: #fff;
        border: 1px solid #ccc;
        border-radius: 4px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        padding: 8px 0;
        z-index: 1001;
        min-width: 140px;
    }

    .create-dropdown a {
        display: block;
        padding: 6px 12px;
        margin-right: 0;
        color: #333;
    }

    .create-dropdown a:hover {
        background-color: #f0f0f0;
    }

    .notifications-link {
        font-weight: 600;
        position: relative;
    }
    .badge {
        margin-left: 0.4rem;
        background: #d00;
        color: #fff;
        border-radius: 999px;
        padding: 0 0.45rem;
        font-size: 0.8rem;
        line-height: 1.2rem;
        display: inline-block;
        min-width: 1.2rem;
        text-align: center;
    }

    main {
        padding: 20px;
        /* Account for sticky header - approximate height is 80px (40px padding + ~40px content) */
        padding-top: calc(20px + 80px);
    }

    footer {
        background-color: #eee;
        padding: 20px;
        text-align: center;
    }
</style>
