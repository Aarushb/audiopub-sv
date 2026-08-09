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
import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { StreamChat, Stream } from "$lib/server/database";
import { streamingService } from "$lib/server/streaming";

export const DELETE: RequestHandler = async (event) => {
    const user = event.locals.user;
    const chatId = event.params.chatId;

    if (!chatId) {
        return json({ error: "Missing chat ID" }, { status: 400 });
    }

    const chat = await StreamChat.findByPk(chatId, { include: Stream });
    if (!chat) {
        return json({ error: "Not found" }, { status: 404 });
    }

    const stream = chat.stream!;
    const isOwnerOrAdmin = user && (user.id === stream?.userId || user.isAdmin);

    if (!user || (!isOwnerOrAdmin && user.id !== chat.userId)) {
        return json({ error: "Forbidden" }, { status: 403 });
    }

    await chat.destroy();
    streamingService.notifyChatDeleted(stream.id, chat.id);
    return json({ success: true });
};
