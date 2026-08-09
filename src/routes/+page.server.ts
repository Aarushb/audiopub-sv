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
import { Audio, User, Playlist } from "$lib/server/database";
import AudioFavorite from "$lib/server/database/models/audio_favorite";
import type { PageServerLoad } from "./$types";
import { type OrderItem, Sequelize, Op } from "sequelize";

export const load: PageServerLoad = async (event) => {
    const pageString = event.url.searchParams.get("page");
    const page = pageString ? parseInt(pageString, 10) : 1;
    const sortField = event.url.searchParams.get("sort") || "createdAt";
    const sortOrder = event.url.searchParams.get("order") || "DESC";

    const hasFilterParams = event.url.searchParams.has("filter_clips") ||
                             event.url.searchParams.has("filter_archives") ||
                             event.url.searchParams.has("filter_playlists");

    let filterClips = event.url.searchParams.get("filter_clips") !== "false";
    let filterArchives = event.url.searchParams.get("filter_archives") !== "false";
    let filterPlaylists = event.url.searchParams.get("filter_playlists") !== "false";

    if (hasFilterParams) {
        filterClips = event.url.searchParams.get("filter_clips") === "true";
        filterArchives = event.url.searchParams.get("filter_archives") === "true";
        filterPlaylists = event.url.searchParams.get("filter_playlists") === "true";
    }

    // Enforce at least one option checked
    if (!filterClips && !filterArchives && !filterPlaylists) {
        filterClips = true;
        filterArchives = true;
        filterPlaylists = true;
    }

    const validSortFields = ["createdAt", "plays", "title", "random", "favoriteCount"];
    const validSortOrders = ["ASC", "DESC"];
    const validatedSortField = validSortFields.includes(sortField)
        ? sortField
        : "createdAt";
    const validatedSortOrder = validSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "DESC";

    const limit = 30;
    const offset = (page - 1) * limit;

    let order: OrderItem[] | undefined;
    if (validatedSortField === "random") {
        order = [Sequelize.fn('RAND')];
    } else if (validatedSortField === "favoriteCount") {
        order = [[Sequelize.literal('(SELECT COUNT(*) FROM AudioFavorites WHERE audioId = Audio.id)'), validatedSortOrder]];
    } else {
        order = [[validatedSortField, validatedSortOrder]];
    }

    const audioWhere: any = {};
    if (filterClips && !filterArchives) {
        audioWhere.isLiveArchive = false;
    } else if (!filterClips && filterArchives) {
        audioWhere.isLiveArchive = true;
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
                        'audioId',
                        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
                    ],
                    group: ['audioId']
                }),
                currentUser ? AudioFavorite.findAll({
                    where: { 
                        userId: currentUser.id,
                        audioId: audioIds 
                    },
                    attributes: ['audioId']
                }) : Promise.resolve([])
            ]);

            favoriteCounts = new Map(
                favoriteCountsData.map(item => [
                    item.audioId, 
                    parseInt((item as any).get('count')) || 0
                ])
            );
            userFavorites = new Set(userFavoritesData.map(item => item.audioId));
        } catch (err) {
            console.error('Error fetching favorite data:', err);
        }
    }

    const totalCount = audios.count + playlists.count;

    return {
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
