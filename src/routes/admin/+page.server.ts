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
import { User } from "$lib/server/database";
import { error, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async (event) => {
    const user = event.locals.user;
    if (!user || !user.isAdmin) {
        return error(403, "Forbidden");
    }

    const untrustedUsers = await User.findAll({
        where: { isTrusted: false, isBanned: false, verificationToken: null },
        order: [["createdAt", "DESC"]],
    });

    return {
        untrustedUsers: untrustedUsers.map((u) => ({
            id: u.id,
            name: u.name,
            displayName: u.displayName,
            email: u.email,
            bio: u.bio,
            createdAt: u.createdAt.toISOString(),
        })),
    };
};

export const actions: Actions = {
    trust: async (event) => {
        const user = event.locals.user;
        if (!user || !user.isAdmin) {
            return error(403, "Forbidden");
        }
        const form = await event.request.formData();
        const targetId = form.get("id") as string;
        if (!targetId) {
            return error(400, "Missing user id");
        }
        const targetUser = await User.findByPk(targetId);
        if (!targetUser) {
            return error(404, "User not found");
        }
        targetUser.isTrusted = true;
        await targetUser.save();
        return { success: true };
    },
};
