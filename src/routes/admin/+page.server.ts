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
import { Audio, AudioEdit, User } from "$lib/server/database";
import { updateAudioDetails } from "$lib/server/audio_edits";
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
    const recentEdits = await AudioEdit.findAll({
        include: [
            {
                model: Audio,
                as: "audio",
                include: [{ model: User }],
            },
            { model: User, as: "editor" },
        ],
        order: [["createdAt", "DESC"]],
        limit: 50,
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
        recentEdits: recentEdits.map((edit) => ({
            id: edit.id,
            audioId: edit.audioId,
            audioTitle: edit.audio?.title,
            audioOwner: edit.audio?.user?.name,
            editor: edit.editor?.name,
            previousTitle: edit.previousTitle,
            previousDescription: edit.previousDescription,
            newTitle: edit.newTitle,
            newDescription: edit.newDescription,
            isAdminEdit: edit.isAdminEdit,
            restoredEditId: edit.restoredEditId,
            createdAt: edit.createdAt.toISOString(),
        })),
    };
};

export const actions: Actions = {
    restoreEdit: async (event) => {
        const user = event.locals.user;
        if (!user || !user.isAdmin) {
            return error(403, "Forbidden");
        }
        const form = await event.request.formData();
        const editId = form.get("editId");
        if (typeof editId !== "string" || !editId) {
            return error(400, "Missing edit id");
        }

        const edit = await AudioEdit.findByPk(editId, { include: [Audio] });
        if (!edit || !edit.audio) {
            return error(404, "Edit not found");
        }

        await updateAudioDetails(
            edit.audioId,
            user,
            edit.previousTitle,
            edit.previousDescription,
            edit.id,
        );
        return { restoreSuccess: true };
    },
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
