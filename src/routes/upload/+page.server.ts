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
import fs from "fs/promises";
import path from "path";
import { error, fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { Audio, Playlist, PlaylistAudio, Notification, Subscription } from "$lib/server/database";
import transcode from "$lib/server/transcode";
import { NotificationTargetType, NotificationType } from "$lib/types";

export const load: PageServerLoad = async (event) => {
    const user = event.locals.user;
    if (!user) {
        return redirect(303, "/login");
    }

    const playlists = await Playlist.findAll({
        where: { userId: user.id },
        order: [["name", "ASC"]],
    });

    const isLive = event.url.searchParams.get("type") === "live";

    return {
        playlists: playlists.map((p) => p.toClientside(false, false)),
        isLive,
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
        if (!user.isVerified) {
            return error(403, "Please verify your email first.");
        }
        if (!user.isTrusted) {
            const userAudioCount = await Audio.count({
                where: { userId: user.id },
            });
            if (userAudioCount >= 1) {
                return error(
                    403,
                    "Please wait for your account to be reviewed.",
                );
            }
        }
        const data = await event.request.formData();
        const file = data.get("file") as File;
        const title = data.get("title") as string;
        const description = (data.get("description") as string) || "";
        const isLiveArchive = data.get("isLiveArchive") === "true";
        const playlistIds = data.getAll("playlistIds") as string[];

        if (!file || !title) {
            return fail(400, { title, description });
        }
        if (title.length > 500) {
            return fail(400, { title, description });
        }
        if (file.size > 1024 * 1024 * 500) {
            // 500 MB
            return fail(400, { title, description });
        }
        const audio = await Audio.create({
            title,
            description,
            hasFile: true,
            userId: user.id,
            extension: path.extname(file.name),
            isLiveArchive,
        });

        await fs.mkdir(path.dirname(audio.path), { recursive: true });
        await fs.writeFile(audio.path, new Uint8Array(await file.arrayBuffer()));
        transcode(audio.path).catch(async (err) => {
            console.warn("Transcoding failed or ffmpeg not present. Falling back to original file copy.");
            try {
                await fs.copyFile(audio.path, `${audio.path}.aac`);
            } catch (copyErr) {
                console.error("Fallback copy failed:", copyErr);
            }
        });

        if (playlistIds && playlistIds.length > 0) {
            for (const playlistId of playlistIds) {
                const playlist = await Playlist.findOne({ where: { id: playlistId, userId: user.id } });
                if (playlist) {
                    const currentCount = await PlaylistAudio.count({ where: { playlistId: playlist.id } });
                    await PlaylistAudio.create({
                        playlistId: playlist.id,
                        audioId: audio.id,
                        order: currentCount,
                    });
                }
            }
        }

        const subscriptions = await Subscription.findAll({ where: { subscribedToId: event.locals.user?.id } });
        for (const subscription of subscriptions) {
            await Notification.create({
                userId: subscription.subscriberId,
                actorId: user.id,
                type: NotificationType.upload,
                targetType: NotificationTargetType.audio,
                targetId: audio.id,
            });
        }

        return redirect(303, `/listen/${audio.id}`);
    },
};
