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
export interface ClientsideUser {
    id: string;
    name: string;
    displayName: string;
    isBanned: boolean;
    isVerified: boolean;
    isTrusted: boolean;
}

export interface ClientsideAudio {
    id: string;
    title: string;
    description: string;
    extension: string;
    path: string;
    transcodedPath: string;
    url: string;
    plays: number;
    playsString: string;
    favoriteCount: number;
    isFavorited?: boolean;
    createdAt: number;
    user?: ClientsideUser;
    comments?: ClientsideComment[];
}

export interface ClientsideComment {
    id: string;
    content: string;
    createdAt: number;
    updatedAt: number;
    user: ClientsideUser;
    audio?: ClientsideAudio;
}

export enum NotificationType {
    comment = "comment",
    upload = "upload",
    system = "system",
    favorite = "favorite",
}

export enum NotificationTargetType {
    audio = "audio",
    comment = "comment",
}

export interface ClientsideResolvedNotification {
    id: string;
    userId: string | null;
    type: NotificationType;
    targetType: NotificationTargetType;
    target?: ClientsideAudio | ClientsideComment|null;
    metadata?: any;
    actor?: ClientsideUser;
    readAt?: number;
    createdAt: number;
}
