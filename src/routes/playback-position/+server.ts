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
import { clearPlaybackPosition, savePlaybackPosition } from "$lib/server/playback_position";

export const POST: RequestHandler = async (event) => {
    const user = event.locals.user;
    if (!user) {
        return error(401, "Forbidden");
    }

    const body = await event.request.json().catch(() => null);
    if (!body || typeof body !== "object" || typeof body.audioId !== "string") {
        return error(400, "Invalid playback position payload");
    }

    const { audioId, position } = body as { audioId: string; position: unknown };

    if (position === null) {
        await clearPlaybackPosition(user.id, audioId);
        return json({ success: true });
    }

    if (typeof position !== "number" || !isFinite(position) || position < 0) {
        return error(400, "Invalid playback position payload");
    }

    try {
        await savePlaybackPosition(user.id, audioId, position);
    } catch (err) {
        // A nonexistent audioId trips the foreign key constraint rather
        // than crashing the request.
        if ((err as any).name === "SequelizeForeignKeyConstraintError") {
            return error(404, "Not found");
        }
        throw err;
    }

    return json({ success: true });
};
