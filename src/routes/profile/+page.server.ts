/*
 * This file is part of the audiopub project.
 *
 * Copyright (C) 2025 the-byte-bender
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
import { User, Audio, Playlist, AudioFavorite } from "$lib/server/database";
import { hash } from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import { Op } from "sequelize";

export const load: PageServerLoad = async (event) => {
    const user = event.locals.user;
    if (!user) {
        return redirect(303, "/login");
    }

    const tab = event.url.searchParams.get("tab") || "clips";
    const pageString = event.url.searchParams.get("page");
    const page = pageString ? parseInt(pageString, 10) : 1;
    const limit = 30;
    const offset = (page - 1) * limit;

    const [clipsData, archivesData, playlistsData] = await Promise.all([
        Audio.findAndCountAll({
            where: { userId: user.id, isLiveArchive: false, archivedStreamId: { [Op.is]: null } },
            include: [Playlist, User],
            limit,
            offset,
            order: [["createdAt", "DESC"]],
        }),
        Audio.findAndCountAll({
            where: {
                userId: user.id,
                [Op.or]: [{ isLiveArchive: true }, { archivedStreamId: { [Op.ne]: null } }],
            },
            include: [Playlist, User],
            limit,
            offset,
            order: [["createdAt", "DESC"]],
        }),
        Playlist.findAndCountAll({
            where: { userId: user.id },
            include: [User, { model: Audio, include: [User] }],
            limit,
            offset,
            order: [["createdAt", "DESC"]],
        }),
    ]);

    let activeCount = clipsData.count;
    if (tab === "archives") activeCount = archivesData.count;
    if (tab === "playlists") activeCount = playlistsData.count;

    const withFavoriteCounts = async (rows: Audio[]) =>
        Promise.all(
            rows.map(async (audio) => {
                const favoriteCount = await AudioFavorite.count({
                    where: { audioId: audio.id },
                });
                return audio.toClientside(true, favoriteCount);
            }),
        );

    const [clips, archives] = await Promise.all([
        withFavoriteCounts(clipsData.rows),
        withFavoriteCounts(archivesData.rows),
    ]);

    return {
        name: user.name,
        email: user.email,
        displayName: user.displayName,
        bio: user.bio,
        streamKey: user.streamKey,
        tab,
        clips,
        archives,
        playlists: playlistsData.rows.map((playlist) => playlist.toClientside(true, true)),
        count: activeCount,
        page,
        limit,
        totalPages: Math.ceil(activeCount / limit),
        profileUser: user.toClientside(),
    };
};

export const actions: Actions = {
    updateProfile: async (event) => {
        const user = event.locals.user;
        const data = await event.request.formData();
        if (!user) {
            return redirect(303, "/login");
        }
        let email = data.get("email") as string;
        let displayName = data.get("displayName") as string;
        let bio = data.get("bio") as string;
        let password = data.get("password") as string;
        if (email) {
            email = email.trim().toLowerCase();
            if (
                email !== user.email &&
                (await User.count({ where: { email: email } }))
            ) {
                return fail(400, {
                    email,
                    displayName,
                    message: "Email already in use",
                });
            }
            await user.resetEmail(email);
            await user.trySendVerificationEmail();
        }
        if (displayName) {
            if (displayName.length < 3 || displayName.length > 30) {
                return fail(400, {
                    email,
                    displayName,
                    message: "Display name must be between 3 and 30 characters",
                });
            }
            user.displayName = displayName;
        }
        if (bio || bio == "") {
            if (bio.length > 1000) {
                return fail(400, {
                    email,
                    displayName,
                    message: "Bio can't be longer than 1000 characters",
                });
            }
            user.bio = bio;
        }
        if (password) {
            if (password.length < 8 || password.length > 64) {
                return fail(400, {
                    email,
                    displayName,
                    message: "Password must be between 8 and 64 characters",
                });
            }
            user.password = await hash(password, 12);
            user.version++;
        }
        await user.save();
        event.cookies.set("token", await user.generateToken(), { path: "/" });
        return redirect(303, "/");
    },

    resetStreamKey: async (event) => {
        const user = event.locals.user;
        if (!user) {
            return redirect(303, "/login");
        }

        user.streamKey = uuidv4();
        user.version++;
        await user.save();
        event.cookies.set("token", await user.generateToken(), { path: "/" });

        return { streamKey: user.streamKey };
    },
};
