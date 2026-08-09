/*
 * This file is part of the audiopub project.
 *
 * Copyright (C) 2025 the-byte-bender
 */
import { error, fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { Audio, Playlist, PlaylistAudio } from "$lib/server/database";

export const load: PageServerLoad = async (event) => {
    const user = event.locals.user;
    if (!user) {
        return redirect(303, "/login");
    }

    const audios = await Audio.findAll({
        where: { userId: user.id },
        order: [["createdAt", "DESC"]],
    });

    return {
        audios: audios.map((audio) => audio.toClientside(false)),
    };
};

export const actions: Actions = {
    default: async (event) => {
        const user = event.locals.user;
        if (!user) {
            return redirect(303, "/login");
        }
        if (user.isBanned) {
            return error(403, "You are banned");
        }

        const form = await event.request.formData();
        const name = (form.get("name") as string || "").trim();
        const audioIds = form.getAll("audioIds") as string[];

        if (!name || name.length < 1 || name.length > 120) {
            return fail(400, { name, error: "Playlist name must be between 1 and 120 characters." });
        }

        const playlist = await Playlist.create({
            name,
            userId: user.id,
        });

        if (audioIds && audioIds.length > 0) {
            for (let i = 0; i < audioIds.length; i++) {
                const audioId = audioIds[i];
                // Verify audio belongs to user
                const audio = await Audio.findOne({ where: { id: audioId, userId: user.id } });
                if (audio) {
                    await PlaylistAudio.create({
                        playlistId: playlist.id,
                        audioId: audio.id,
                        order: i,
                    });
                }
            }
        }

        return redirect(303, `/playlist/${playlist.id}`);
    },
};
