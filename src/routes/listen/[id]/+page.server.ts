/*
 * This file is part of the audiopub project.
 *
 * Copyright (C) 2024-2026 the-byte-bender
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
import { error, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { Audio, User, Comment, Stream, StreamChat, Subscription } from "$lib/server/database";
import AudioFollow from "$lib/server/database/models/audio_follow";
import AudioFavorite from "$lib/server/database/models/audio_favorite";
import fs from "fs/promises";
import { Sequelize, Op } from "sequelize";

export const load: PageServerLoad = async (event) => {
    const audio = await Audio.findByPk(event.params.id, {
        include: [
            User,
            {
                model: Stream,
                as: "archivedStream",
                include: [
                    {
                        model: StreamChat,
                        as: "chats",
                        include: [User],
                    },
                ],
            },
        ],
    });
    if (!audio) return error(404, "Not found");
    if (!audio.user?.isTrusted && !event.locals.user?.isAdmin)
        return error(403, "Forbidden");

    let comments: Comment[] = [];
    try {
        comments = await Comment.findAll({
            where: { audioId: audio.id, parentId: null },
            include: [
                User,
                {
                    model: Comment,
                    as: "replies",
                    include: [User],
                },
            ],
            order: [
                ["createdAt", "DESC"],
                [{ model: Comment, as: "replies" }, "createdAt", "ASC"],
            ],
        });
    } catch (err) {
        console.error("Error fetching comments:", err);
    }

    const sortedComments = comments.filter((comment) => {
        if (event.locals.user?.isAdmin) return true;
        if (comment.user.isTrusted) return true;
        if (comment.user.id === event.locals.user?.id) return true;
        return false;
    });

    const nextAudio = await Audio.findOne({
        where: {
            createdAt: { [Op.lt]: audio.createdAt },
        },
        order: [["createdAt", "DESC"]],
    });

    let isFollowing = false;
    let favoriteCount = 0;
    let isFavorited = false;

    if (event.locals.user) {
        try {
            const results = await Promise.all([
                AudioFollow.isFollowing(event.locals.user.id, audio.id),
                AudioFavorite.getFavoriteCount(audio.id),
                AudioFavorite.isFavorited(event.locals.user.id, audio.id),
            ]);

            isFollowing = results[0];
            favoriteCount = results[1];
            isFavorited = results[2];
        } catch (err) {
            console.error("Error fetching audio interaction data:", err);
        }
    } else {
        try {
            favoriteCount = await AudioFavorite.getFavoriteCount(audio.id);
        } catch (err) {
            console.error("Error fetching favorite count:", err);
        }
    }

    let isSubscribed = false;
    if (event.locals.user && audio.userId) {
        const subscription = await Subscription.findOne({
            where: { subscriberId: event.locals.user.id, subscribedToId: audio.userId },
        });
        isSubscribed = !!subscription;
    }

    return {
        audio: audio.toClientside(true, favoriteCount, isFavorited),
        comments: sortedComments.map((c) => c.toClientside(false, true)),
        mimeType: audio.mimeType,
        isFollowing,
        nextAudioId: nextAudio ? nextAudio.id : null,
        isSubscribed,
    };
};

export const actions: Actions = {
    delete: async (event) => {
        const user = event.locals.user;
        const audio = await Audio.findByPk(event.params.id, { include: User });
        if (!audio) {
            return error(404, "Not found");
        }
        if (!user || (!user.isAdmin && user.id !== audio.user?.id)) {
            return error(403, "Forbidden");
        }

        await audio.destroy();
        try {
            await fs.unlink(audio.path);
            await fs.unlink(audio.transcodedPath);
        } catch (e) {
            console.error("Error deleting files:", e);
        }

        return redirect(303, "/");
    },
    add_comment: async (event) => {
        const user = event.locals.user;
        if (!user || user.isBanned) {
            return error(403, "Forbidden");
        }
        const data = await event.request.formData();
        const content = data.get("comment") as string;
        const parentId = data.get("parentId") as string | null;

        if (!content || content.trim() === "") {
            return error(400, "Comment content cannot be empty");
        }

        await Comment.create({
            content: content.trim(),
            userId: user.id,
            audioId: event.params.id,
            parentId: parentId || null,
        });

        return { success: true };
    },
    favorite: async (event) => {
        const user = event.locals.user;
        if (!user || !user.isTrusted || user.isBanned)
            return error(403, "Forbidden");
        const audio = await Audio.findByPk(event.params.id);
        if (!audio) return error(404, "Not found");

        await AudioFavorite.createFavorite(user.id, audio.id);
        return { success: true };
    },
    unfavorite: async (event) => {
        const user = event.locals.user;
        if (!user || !user.isTrusted || user.isBanned)
            return error(403, "Forbidden");
        const audio = await Audio.findByPk(event.params.id);
        if (!audio) return error(404, "Not found");

        await AudioFavorite.removeFavorite(user.id, audio.id);
        return { success: true };
    },
};
