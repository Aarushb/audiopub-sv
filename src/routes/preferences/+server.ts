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

// A fixed allowlist rather than merging the whole request body — an
// unrecognized key would otherwise sit in the JSON blob forever with no
// code that ever reads it back.
const ALLOWED_KEYS = ["autoplay", "homeFilters", "chatReader"] as const;

export const POST: RequestHandler = async (event) => {
    const user = event.locals.user;
    if (!user) {
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

    user.preferences = { ...(user.preferences ?? {}), ...sanitized };
    await user.save();

    return json({ success: true });
};
