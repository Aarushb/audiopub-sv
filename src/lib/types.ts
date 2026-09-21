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
    bio: string;
    isBanned: boolean;
    isVerified: boolean;
    isTrusted: boolean;
    isAdmin?: boolean;
    preferences?: ClientsideUserPreferences | null;
}

export interface ClientsideHomeFilterPreferences {
    clips: boolean;
    archives: boolean;
    playlists: boolean;
    sort: string;
    order: string;
}

/** Everything except voiceName, which names a specific OS/browser TTS
 * voice and wouldn't necessarily exist on another device. */
export interface ClientsideChatReaderPreferences {
    enabled: boolean;
    outputMode: "assertive" | "polite" | "voice";
    pitch: number;
    rate: number;
    interrupt: boolean;
}

export interface ClientsideUserPreferences {
    autoplay?: boolean;
    homeFilters?: ClientsideHomeFilterPreferences;
    chatReader?: ClientsideChatReaderPreferences;
    /** Opt-in: whether playback position is remembered automatically at
     * all (locally, and synced to the account when logged in). Off by
     * default — the manual "Save my place" button works regardless of
     * this setting, for cherry-picking individual tracks to track. */
    playbackAutosave?: boolean;
}

export interface ClientsidePlaylist {
    id: string;
    name: string;
    createdAt: number;
    user?: ClientsideUser;
    audios?: ClientsideAudio[];
    trackCount?: number;
}

export interface ClientsideStream {
    id: string;
    title: string;
    description: string;
    state: StreamState;
    peekListeners: number;
    activeListeners: number;
    createdAt: number;
    user?: ClientsideUser;
    chats?: ClientsideStreamChat[];
    isStream: true;
}

export interface ClientsideStreamChat {
    id: string;
    content: string;
    createdAt: number;
    user: ClientsideUser;
    stream?: ClientsideStream;
}

export interface ClientsideStreamMute {
    id: string;
    userId: string;
    userName: string;
    displayName: string;
    expiresAt: number | null;
    reason: string | null;
    createdAt: number;
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
    isLiveArchive?: boolean;
    createdAt: number;
    /** Admin-authored notice pinned to the top of the upload page. */
    isAnnouncement: boolean;
    user?: ClientsideUser;
    comments?: ClientsideComment[];
    playlists?: { id: string; name: string }[];
    archivedStream?: ClientsideStream | null;
}

export interface ClientsideComment {
    id: string;
    content: string;
    createdAt: number;
    updatedAt: number;
    user: ClientsideUser;
    audio?: ClientsideAudio;
    replies?: ClientsideComment[];
    editCount?: number;
    /** Full before/after history — only populated for admin viewers. */
    edits?: ClientsideCommentEdit[];
}

export interface ClientsideCommentEdit {
    id: string;
    previousContent: string;
    newContent: string;
    isAdminEdit: boolean;
    createdAt: number;
    editor?: ClientsideUser;
}

export enum NotificationType {
    comment = "comment",
    upload = "upload",
    system = "system",
    favorite = "favorite",
}

export enum NotificationTargetType {
    audio = "audio",
    stream = "stream",
    comment = "comment",
}

export enum StreamState {
    pending = "pending",
    active = "active",
    disconnected = "disconnected",
    finished = "finished",
}

export enum StreamFormat {
    aac = "aac",
    mp3 = "mp3",
}

export interface ClientsideResolvedNotification {
    id: string;
    userId: string | null;
    type: NotificationType;
    targetType: NotificationTargetType;
    target?: ClientsideAudio | ClientsideStream | ClientsideComment | null;
    metadata?: any;
    actor?: ClientsideUser;
    readAt?: number;
    createdAt: number;
}
