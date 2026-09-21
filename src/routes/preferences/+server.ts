/*
 * This file is part of the audiopub project.
 *
 * Copyright (C) 2026 the-byte-bender
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */
import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { User } from "$lib/server/database";
import database from "$lib/server/database";

// A fixed allowlist rather than merging the whole request body — an
// unrecognized key would otherwise sit in the JSON blob forever with no
// code that ever reads it back.
const ALLOWED_KEYS = ["autoplay", "homeFilters", "chatReader"] as const;

export const POST: RequestHandler = async (event) => {
    const sessionUser = event.locals.user;
    if (!sessionUser) {
        return error(401, "Forbidden");
    }

    const body = await event.request.json().catch(() => null);
    if (!body || typeof body !== "object") {
        return error(400, "Invalid preferences payload");
    }

    const sanitized: Record<string, unknown> = {};
    for (const key of ALLOWED_KEYS) {
        if (key in body) {
            sanitized[key] = (body as Record<string, unknown>)[key];
        }
    }

    // Two tabs saving different settings (e.g. one flips autoplay while
    // another applies home filters) can otherwise race: both read the same
    // starting JSON, and whichever write commits second silently discards
    // the other's key. Locking the row for a fresh re-read before merging
    // — the same pattern already used for audio/comment edit history —
    // serializes concurrent saves instead of losing one.
    await database.transaction(async (transaction) => {
        const user = await User.findByPk(sessionUser.id, {
            transaction,
            lock: transaction.LOCK.UPDATE,
        });
        if (!user) return;
        user.preferences = { ...(user.preferences ?? {}), ...sanitized };
        await user.save({ transaction });
    });

    return json({ success: true });
};
