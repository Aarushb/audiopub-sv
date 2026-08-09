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
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { User, Stream } from "$lib/server/database";
import { StreamState } from "$lib/types";
import { Op } from "sequelize";

export const POST: RequestHandler = async ({ request }) => {
    const formData = await request.formData();

    const action = formData.get("action");
    if (action !== "stream_auth") {
        return json({ error: "Unknown action" }, { status: 400 });
    }

    const mount = formData.get("mount") as string;
    const pass = formData.get("pass") as string;
    const admin = formData.get("admin") === "1";

    // Mount is the user ID (strip leading slash)
    const userId = mount.startsWith("/") ? mount.slice(1) : mount;

    if (!userId) {
        return new Response(null, {
            status: 401,
            headers: { "icecast-auth-message": "Missing mount point" },
        });
    }

    const user = await User.findByPk(userId);

    if (!user) {
        return new Response(null, {
            status: 401,
            headers: { "icecast-auth-message": "User not found" },
        });
    }
    if (admin && !user.isAdmin) {
        return new Response(null, {
            status: 401,
            headers: { "icecast-auth-message": "Admin access denied" },
        });
    }

    if (!user.streamKey || pass !== user.streamKey) {
        return new Response(null, {
            status: 401,
            headers: { "icecast-auth-message": "Invalid stream key" },
        });
    }

    if (user.isBanned) {
        return new Response(null, {
            status: 401,
            headers: { "icecast-auth-message": "User is banned" },
        });
    }

    if (!user.isTrusted) {
        return new Response(null, {
            status: 401,
            headers: { "icecast-auth-message": "User is not trusted" },
        });
    }

    const activeStream = await Stream.findOne({
        where: {
            userId,
            state: { [Op.ne]: StreamState.finished },
        },
    });

    if (!activeStream) {
        return new Response(null, {
            status: 401,
            headers: { "icecast-auth-message": "No active stream found" },
        });
    }

    return new Response(null, {
        status: 200,
        headers: { "icecast-auth-user": "1" },
    });
};
