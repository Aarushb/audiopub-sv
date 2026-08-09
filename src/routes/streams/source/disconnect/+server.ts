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
import type { RequestHandler } from "./$types";
import { Stream } from "$lib/server/database";
import { StreamState } from "$lib/types";
import { streamingService } from "$lib/server/streaming";

export const POST: RequestHandler = async ({ request }) => {
    const formData = await request.formData();

    const action = formData.get("action");
    if (action !== "mount_remove") {
        return new Response(null, { status: 400 });
    }

    const mount = formData.get("mount") as string;
    const userId = mount.startsWith("/") ? mount.slice(1) : mount;

    if (!userId) {
        return new Response(null, { status: 400 });
    }

    const stream = await Stream.findOne({
        where: {
            userId,
            state: StreamState.active,
        },
    });

    if (stream) {
        await streamingService.sourceDisconnected(stream.id);
    }

    return new Response(null, { status: 204 });
};
