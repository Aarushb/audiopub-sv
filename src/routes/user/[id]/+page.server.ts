/*
 * This file is part of the audiopub project.
 *
 * Copyright (C) 2024 the-byte-bender
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
import { Audio, Comment, User, Playlist, Stream } from "$lib/server/database";
import { error, redirect } from "@sveltejs/kit";
import { Op } from "sequelize";
import type { Actions, PageServerLoad } from "./$types";
import Subscription from "$lib/server/database/models/subscription";
import { subscribe, unsubscribe } from "$lib/server/subscriptions";

async function findUserByProfileParam(param: string) {
    if (param.startsWith("@")) {
        return User.findOne({ where: { name: param.slice(1).toLowerCase() } });
    }
    return User.findByPk(param);
}

export const load: PageServerLoad = async (event) => {
    const tab = event.url.searchParams.get("tab") || "clips";
    const pageString = event.url.searchParams.get("page");
    const page = pageString ? parseInt(pageString, 10) : 1;
    const limit = 30;
    const offset = (page - 1) * limit;

    const profileUser = await findUserByProfileParam(event.params.id);
    if (!profileUser) {
        return redirect(303, "/");
    }

    const [clipsData, archivesData, playlistsData, activeStream, subscribersCount] = await Promise.all([
        Audio.findAndCountAll({
            where: { userId: profileUser.id, isLiveArchive: false, archivedStreamId: { [Op.is]: null } },
            include: [Playlist, User],
            limit,
            offset,
            order: [["createdAt", "DESC"]],
        }),
        Audio.findAndCountAll({
            where: {
                userId: profileUser.id,
                [Op.or]: [{ isLiveArchive: true }, { archivedStreamId: { [Op.ne]: null } }],
            },
            include: [Playlist, User],
            limit,
            offset,
            order: [["createdAt", "DESC"]],
        }),
        Playlist.findAndCountAll({
            where: { userId: profileUser.id },
            include: [User, { model: Audio, include: [User] }],
            limit,
            offset,
            order: [["createdAt", "DESC"]],
        }),
        Stream.findOne({
            where: { userId: profileUser.id, state: { [Op.ne]: "finished" } },
        }),
        Subscription.count({
            where: { subscribedToId: profileUser.id },
        }),
    ]);

    let activeCount = clipsData.count;
    if (tab === "archives") activeCount = archivesData.count;
    if (tab === "playlists") activeCount = playlistsData.count;

    const user = event.locals.user;
    let isSubscribed = false;
    if (user) {
        const sub = await Subscription.findOne({
            where: { subscriberId: user.id, subscribedToId: profileUser.id },
        });
        isSubscribed = !!sub;
    }

    return {
        tab,
        clips: clipsData.rows.map((audio) => audio.toClientside()),
        archives: archivesData.rows.map((audio) => audio.toClientside()),
        playlists: playlistsData.rows.map((playlist) => playlist.toClientside(true, true)),
        stream: activeStream?.toClientside(false) ?? null,
        subscribers: subscribersCount,
        isSubscribed,
        count: activeCount,
        page,
        limit,
        totalPages: Math.ceil(activeCount / limit),
        profileUser: profileUser.toClientside(),
    };
};

export const actions: Actions = {
    ban: async (event) => {
        const user = event.locals.user;
        if (!user || !user.isAdmin) {
            return error(403, "Forbidden");
        }
        const userToBeBanned = await findUserByProfileParam(event.params.id);
        if (!userToBeBanned) {
            return error(404, "User not found");
        }
        const form = await event.request.formData();
        const reason = form.get("reason") as string;
        const message = form.get("message") as string;
        await userToBeBanned.ban(reason, message);
        if (!userToBeBanned.isTrusted) {
            // Delete all audios and comments of the user.
            await Audio.destroy({ where: { userId: userToBeBanned.id } });
            await Comment.destroy({ where: { userId: userToBeBanned.id } });
        }
        return redirect(303, `/user/@${encodeURIComponent(userToBeBanned.name)}`);
    },
    warn: async (event) => {
        const user = event.locals.user;
        if (!user || !user.isAdmin) {
            return error(403, "Forbidden");
        }
        const userToBeWarned = await findUserByProfileParam(event.params.id);
        if (!userToBeWarned) {
            return error(404, "User not found");
        }
        const form = await event.request.formData();
        const reason = form.get("reason") as string;
        const message = form.get("message") as string;
        await userToBeWarned.warn(reason, message);
        return redirect(303, `/user/@${encodeURIComponent(userToBeWarned.name)}`);
    },
    trust: async (event) => {
        const user = event.locals.user;
        if (!user || !user.isAdmin) {
            return error(403, "Forbidden");
        }
        const userToBeTrusted = await findUserByProfileParam(event.params.id);
        if (!userToBeTrusted) {
            return error(404, "User not found");
        }
        userToBeTrusted.isTrusted = true;
        await userToBeTrusted.save();
    },
    subscribe,
    unsubscribe,
};
