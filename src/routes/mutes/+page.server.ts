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
import { fail, redirect, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { User, UserMute } from "$lib/server/database";
import { canMute } from "$lib/server/mutes";

export const load: PageServerLoad = async (event) => {
    const user = event.locals.user;
    if (!user) {
        return redirect(303, "/login");
    }

    const pageString = event.url.searchParams.get("page");
    const page = pageString ? parseInt(pageString, 10) : 1;
    const limit = 30;
    const offset = (page - 1) * limit;

    const mutes = await UserMute.findAndCountAll({
        where: { muterId: user.id },
        include: [{ model: User, as: "muted", required: true }],
        order: [["createdAt", "DESC"]],
        limit,
        offset,
    });

    return {
        // Admins cannot mute. The list is still rendered for them so that
        // mutes made before they were promoted can be cleaned up.
        canMute: canMute(user),
        mutes: mutes.rows.map((mute) => ({
            id: mute.id,
            createdAt: mute.createdAt.getTime(),
            user: mute.muted!.toClientside(),
        })),
        count: mutes.count,
        page,
        limit,
        totalPages: Math.ceil(mutes.count / limit),
    };
};

export const actions: Actions = {
    unmute: async (event) => {
        const user = event.locals.user;
        if (!user) {
            return fail(403, { message: "Forbidden" });
        }

        const form = await event.request.formData();
        const mutedId = form.get("mutedId") as string;
        if (!mutedId) {
            return fail(400, { message: "Missing user" });
        }

        const deletedCount = await UserMute.destroy({
            where: { muterId: user.id, mutedId },
        });
        if (deletedCount === 0) {
            return fail(404, { message: "Mute not found" });
        }

        event.locals.mutedUserIds = undefined;
        return { success: true };
    },
};
