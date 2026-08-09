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
import { error, redirect } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import { Notification, Stream, Subscription } from "$lib/server/database";
import { NotificationTargetType, NotificationType, StreamState } from "$lib/types";
import { v4 as uuidv4 } from "uuid";
import { Op } from "sequelize";

export const load: PageServerLoad = async (event) => {
    const user = event.locals.user;
    if (!user) {
        return redirect(303, "/login");
    }

    const existingStream = await Stream.findOne({
        where: {
            userId: user.id,
            state: { [Op.ne]: StreamState.finished },
        },
    });

    if (existingStream) {
        return redirect(303, `/live/${existingStream.id}`);
    }

    return {};
};

export const actions: Actions = {
    default: async (event) => {
        const user = event.locals.user;
        if (!user) {
            return redirect(303, "/login");
        }

        if (!user.isTrusted) {
            return error(403, "Please wait for your account to be reviewed.");
        }

        if (user.isBanned) {
            return error(403, "You are banned");
        }

        const existingStream = await Stream.findOne({
            where: {
                userId: user.id,
                state: { [Op.ne]: StreamState.finished },
            },
        });

        if (existingStream) {
            return redirect(303, `/live/${existingStream.id}`);
        }

        if (!user.streamKey) {
            user.streamKey = uuidv4();
            await user.save();
        }

        const form = await event.request.formData();
        const title = form.get("title") as string;
        const description = (form.get("description") as string) || "";
        const shouldArchive = form.get("shouldArchive") === "on";

        if (!title || title.length < 1 || title.length > 200) {
            return {
                success: false,
                error: "Title is required (1-200 characters)",
            };
        }

        if (description.length > 2000) {
            return {
                success: false,
                error: "Description too long (max 2000 characters)",
            };
        }

        const stream = await Stream.create({
            title,
            description,
            state: StreamState.pending,
            userId: user.id,
            shouldArchive,
            format: null,
        });

        const subscriptions = await Subscription.findAll({ where: { subscribedToId: event.locals.user?.id } });
        for (const subscription of subscriptions) {
            await Notification.create({
                userId: subscription.subscriberId,
                actorId: user.id,
                type: NotificationType.upload,
                targetType: NotificationTargetType.stream,
                targetId: stream.id,
            });
        }

        return redirect(303, `/live/${stream.id}`);
    },
};
