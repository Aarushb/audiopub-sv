/**
 * Best-effort sync of a device-local setting up to the logged-in user's
 * account, so it follows them to another device or browser. The device's
 * own copy (localStorage/cookie) stays the source of truth for this
 * device regardless of whether this succeeds — a logged-out visitor, a
 * network hiccup, or a stale session all just mean the setting stays
 * local, exactly as it already behaved before account sync existed.
 */
export async function saveAccountPreference(
    partial: Record<string, unknown>,
): Promise<void> {
    try {
        await fetch("/preferences", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(partial),
        });
    } catch {
        // Ignored — see comment above.
    }
}
