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
import { Audio, User, Playlist, Stream } from "$lib/server/database";
import AudioFavorite from "$lib/server/database/models/audio_favorite";
import type { PageServerLoad } from "./$types";
import { type OrderItem, Sequelize, Op } from "sequelize";
import { excludeMutedUsers, getMutedUserIds } from "$lib/server/mutes";

const FILTER_COOKIE_NAME = "audiopub_home_filters";

type SavedFilterPrefs = {
    clips?: boolean;
    archives?: boolean;
    playlists?: boolean;
    sort?: string;
    order?: string;
};

function readSavedFilterPrefs(raw: string | undefined): SavedFilterPrefs {
    if (!raw) return {};
    try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
        return {};
    }
}

export const load: PageServerLoad = async (event) => {
    const pageString = event.url.searchParams.get("page");
    const page = pageString ? parseInt(pageString, 10) : 1;
    const viewer = event.locals.user;

    // A bare link to "/" (the nav's Home link, the logo, etc.) carries no
    // query params at all, so without this fallback every such navigation
    // silently reset filters and sort back to the defaults — even though
    // the user had deliberately chosen something else moments earlier.
    // The account's own saved preference (if any) wins over the device
    // cookie once logged in, so a choice made on one device follows you to
    // another rather than staying stuck to whichever browser set the cookie.
    const savedPrefs: SavedFilterPrefs =
        viewer?.preferences?.homeFilters ??
        readSavedFilterPrefs(event.cookies.get(FILTER_COOKIE_NAME));

    const hasFilterParams =
        event.url.searchParams.has("filter_clips") ||
        event.url.searchParams.has("filter_archives") ||
        event.url.searchParams.has("filter_playlists");
    const hasSortParams =
        event.url.searchParams.has("sort") || event.url.searchParams.has("order");

    const sortField =
        event.url.searchParams.get("sort") || savedPrefs.sort || "createdAt";
    const sortOrder =
        event.url.searchParams.get("order") || savedPrefs.order || "DESC";

    let filterClips: boolean;
    let filterArchives: boolean;
    let filterPlaylists: boolean;

    if (hasFilterParams) {
        filterClips = event.url.searchParams.get("filter_clips") === "true";
        filterArchives = event.url.searchParams.get("filter_archives") === "true";
        filterPlaylists = event.url.searchParams.get("filter_playlists") === "true";
    } else if (
        savedPrefs.clips !== undefined ||
        savedPrefs.archives !== undefined ||
        savedPrefs.playlists !== undefined
    ) {
        filterClips = savedPrefs.clips ?? true;
        filterArchives = savedPrefs.archives ?? true;
        filterPlaylists = savedPrefs.playlists ?? true;
    } else {
        filterClips = true;
        filterArchives = true;
        filterPlaylists = true;
    }

    // Enforce at least one option checked
    if (!filterClips && !filterArchives && !filterPlaylists) {
        filterClips = true;
        filterArchives = true;
        filterPlaylists = true;
    }

    const validSortFields = [
        "createdAt",
        "plays",
        "title",
        "random",
        "favoriteCount",
    ];
    const validSortOrders = ["ASC", "DESC"];
    const validatedSortField = validSortFields.includes(sortField)
        ? sortField
        : "createdAt";
    const validatedSortOrder = validSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "DESC";

    // Whenever the request explicitly chose filters or a sort (via the
    // "Apply Filters" form, or a filtered link), remember that choice so it
    // survives a later bare navigation back to "/". The cookie stays the
    // fallback for logged-out visitors (and for a device before its first
    // sync); logged-in requests also mirror the choice onto the account.
    if (hasFilterParams || hasSortParams) {
        const newFilterPrefs = {
            clips: filterClips,
            archives: filterArchives,
            playlists: filterPlaylists,
            sort: validatedSortField,
            order: validatedSortOrder,
        };
        event.cookies.set(FILTER_COOKIE_NAME, JSON.stringify(newFilterPrefs), {
            path: "/",
            maxAge: 60 * 60 * 24 * 365,
        });
        if (viewer) {
            viewer.preferences = { ...(viewer.preferences ?? {}), homeFilters: newFilterPrefs };
            await viewer.save();
        }
    }

    const limit = 30;
    const offset = (page - 1) * limit;

    let order: OrderItem[] | undefined;
    if (validatedSortField === "random") {
        order = [Sequelize.fn("RAND")];
    } else if (validatedSortField === "favoriteCount") {
        order = [
            [
                Sequelize.literal(
                    "(SELECT COUNT(*) FROM AudioFavorites WHERE audioId = Audio.id)",
                ),
                validatedSortOrder,
            ],
        ];
    } else {
        order = [[validatedSortField, validatedSortOrder]];
    }

    const mutedUserIds = await getMutedUserIds(event);

    const audioWhere: any = { ...excludeMutedUsers(mutedUserIds) };
    if (filterClips && !filterArchives) {
        audioWhere.isLiveArchive = false;
        audioWhere.archivedStreamId = { [Op.is]: null };
    } else if (!filterClips && filterArchives) {
        audioWhere[Op.or] = [
            { isLiveArchive: true },
            { archivedStreamId: { [Op.ne]: null } },
        ];
    } else if (!filterClips && !filterArchives) {
        audioWhere.id = null; // matches nothing
    }

    let audios: { rows: Audio[]; count: number } = { rows: [], count: 0 };
    let playlists: { rows: Playlist[]; count: number } = { rows: [], count: 0 };

    if (filterClips || filterArchives) {
        audios = await Audio.findAndCountAll({
            where: audioWhere,
            limit,
            offset,
            order,
            include: [
                {
                    model: User,
                    where: event.locals.user?.isAdmin ? {} : { isTrusted: true },
                },
                { model: Playlist },
            ],
        });
    }

    if (filterPlaylists) {
        playlists = await Playlist.findAndCountAll({
            where: { ...excludeMutedUsers(mutedUserIds) },
            limit,
            offset,
            order: [["createdAt", "DESC"]],
            include: [User, { model: Audio, include: [User] }],
        });
    }

    const audioIds = audios.rows.map((audio) => audio.id);
    const currentUser = event.locals.user;

    let favoriteCounts = new Map<string, number>();
    let userFavorites = new Set<string>();

    if (audioIds.length > 0) {
        try {
            const [favoriteCountsData, userFavoritesData] = await Promise.all([
                AudioFavorite.findAll({
                    where: { audioId: audioIds },
                    attributes: [
                        "audioId",
                        [Sequelize.fn("COUNT", Sequelize.col("id")), "count"],
                    ],
                    group: ["audioId"],
                }),
                currentUser
                    ? AudioFavorite.findAll({
                          where: {
                              userId: currentUser.id,
                              audioId: audioIds,
                          },
                          attributes: ["audioId"],
                      })
                    : Promise.resolve([]),
            ]);

            favoriteCounts = new Map(
                favoriteCountsData.map((item) => [
                    item.audioId,
                    parseInt((item as any).get("count")) || 0,
                ]),
            );
            userFavorites = new Set(
                userFavoritesData.map((item) => item.audioId),
            );
        } catch (err) {
            console.error("Error fetching favorite data:", err);
        }
    }

    const totalCount = audios.count + playlists.count;

    return {
        streams:
            page === 1
                ? (
                      await Stream.findAll({
                          where: {
                              state: "active",
                              ...excludeMutedUsers(mutedUserIds),
                          },
                          order: [["createdAt", "DESC"]],
                          include: User,
                      })
                  ).map((s) => s.toClientside(true))
                : [],
        audios: audios.rows.map((audio) => {
            const favoriteCount = favoriteCounts.get(audio.id) || 0;
            const isFavorited = userFavorites.has(audio.id);
            return audio.toClientside(true, favoriteCount, isFavorited);
        }),
        playlists: playlists.rows.map((p) => p.toClientside(true, true)),
        count: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        sortField: validatedSortField,
        sortOrder: validatedSortOrder,
        filters: {
            clips: filterClips,
            archives: filterArchives,
            playlists: filterPlaylists,
        },
    };
};
