/*
 * This file is part of the audiopub project.
 *
 * Copyright (C) 2025 the-byte-bender
 */
import { error, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { Playlist, User, Audio, PlaylistAudio } from "$lib/server/database";

export const load: PageServerLoad = async (event) => {
    const playlistId = event.params.id;

    const playlist = await Playlist.findByPk(playlistId, {
        include: [
            { model: User },
            {
                model: Audio,
                include: [User],
                through: { attributes: ["order"] },
            },
        ],
    });

    if (!playlist) {
        return error(404, "Playlist not found");
    }

    // Sort audios by order
    if (playlist.audios) {
        playlist.audios.sort((a, b) => {
            const orderA = (a as any).PlaylistAudio?.order ?? 0;
            const orderB = (b as any).PlaylistAudio?.order ?? 0;
            return orderA - orderB;
        });
    }

    const currentUser = event.locals.user;

    return {
        playlist: playlist.toClientside(true, true),
        isOwner: currentUser ? currentUser.id === playlist.userId || currentUser.isAdmin : false,
    };
};

export const actions: Actions = {
    delete: async (event) => {
        const user = event.locals.user;
        if (!user) {
            return redirect(303, "/login");
        }

        const playlistId = event.params.id;
        const playlist = await Playlist.findByPk(playlistId);

        if (!playlist) {
            return error(404, "Playlist not found");
        }

        if (playlist.userId !== user.id && !user.isAdmin) {
            return error(403, "Permission denied");
        }

        await playlist.destroy();
        return redirect(303, "/profile");
    },
};
