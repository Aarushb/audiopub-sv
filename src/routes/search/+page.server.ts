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
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { Audio, User, Playlist } from "$lib/server/database";
import AudioFavorite from "$lib/server/database/models/audio_favorite";
import { Sequelize, Op } from "sequelize";
import { getMutedUserIds } from "$lib/server/mutes";

export const load: PageServerLoad = async (event) => {
  let query = event.url.searchParams.get("q") as string;
  const pageString = event.url.searchParams.get("page") as string;
  const page = pageString ? parseInt(pageString) : 1;
  query = query?.trim();

  if (!query || query.length < 2) {
    return error(400, "Query must be at least 2 characters long");
  }

  // Search is deliberate rather than a feed, so muted uploaders are hidden by
  // default but can be brought back for a single search.
  const includeMuted = event.url.searchParams.get("includeMuted") === "on";
  const mutedUserIds = await getMutedUserIds(event);
  const mutesApply = !includeMuted && mutedUserIds.length > 0;

  const lowerQuery = query.toLowerCase();

  // Prefix check: playlist:query
  if (lowerQuery.startsWith("playlist:") || lowerQuery.startsWith("playlist ")) {
    const searchTerm = query.replace(/^playlist[:\s]+/i, "").trim();
    const baseWhere: any = searchTerm ? { name: { [Op.like]: `%${searchTerm}%` } } : {};
    const whereClause = mutesApply
      ? { [Op.and]: [baseWhere, { userId: { [Op.notIn]: mutedUserIds } }] }
      : baseWhere;

    const playlists = await Playlist.findAll({
      where: whereClause,
      limit: 30,
      offset: (page - 1) * 30,
      include: [User, { model: Audio, include: [User] }],
      order: [["createdAt", "DESC"]],
    });

    const hiddenByMutes = mutesApply
      ? await Playlist.count({
          where: { [Op.and]: [baseWhere, { userId: { [Op.in]: mutedUserIds } }] },
        })
      : 0;

    return {
      searchType: "playlist",
      playlists: playlists.map((p) => p.toClientside(true, true)),
      audios: [],
      query,
      page,
      includeMuted,
      hiddenByMutes,
      hasMutes: mutedUserIds.length > 0,
    };
  }

  // Prefix check: live:query or archive:query
  if (lowerQuery.startsWith("live:") || lowerQuery.startsWith("live ") || lowerQuery.startsWith("archive:")) {
    const searchTerm = query.replace(/^(live|archive)[:\s]+/i, "").trim();
    const baseWhere: any = { isLiveArchive: true };

    if (searchTerm) {
      baseWhere[Op.or] = [
        { title: { [Op.like]: `%${searchTerm}%` } },
        { description: { [Op.like]: `%${searchTerm}%` } },
      ];
    }

    const whereClause = mutesApply
      ? { [Op.and]: [baseWhere, { userId: { [Op.notIn]: mutedUserIds } }] }
      : baseWhere;

    const audios = await Audio.findAll({
      where: whereClause,
      limit: 30,
      offset: (page - 1) * 30,
      include: [
        {
          model: User,
          where: event.locals.user?.isAdmin ? {} : { isTrusted: true },
        },
        { model: Playlist },
      ],
      order: [["createdAt", "DESC"]],
    });

    const hiddenByMutes = mutesApply
      ? await Audio.count({
          where: { [Op.and]: [baseWhere, { userId: { [Op.in]: mutedUserIds } }] },
          include: {
            model: User,
            where: event.locals.user?.isAdmin ? {} : { isTrusted: true },
          },
        } as Parameters<typeof Audio.count>[0])
      : 0;

    return {
      searchType: "live",
      audios: audios.map((audio) => audio.toClientside()),
      playlists: [],
      query,
      page,
      includeMuted,
      hiddenByMutes,
      hasMutes: mutedUserIds.length > 0,
    };
  }

  // Standard Audio Search
  const matchesQuery = Sequelize.literal(
    `MATCH(title, description) AGAINST(:query IN NATURAL LANGUAGE MODE)`
  );
  const audioWhere = mutesApply
    ? { [Op.and]: [matchesQuery, { userId: { [Op.notIn]: mutedUserIds } }] }
    : matchesQuery;

  const audios = await Audio.findAll({
    where: audioWhere,
    replacements: { query },
    limit: 30,
    offset: (page - 1) * 30,
    include: [
      {
        model: User,
        where: event.locals.user?.isAdmin ? {} : { isTrusted: true },
      },
      { model: Playlist },
    ],
  });

  // How many matches across the whole result set the mutes are keeping out, so
  // the page can say so instead of silently coming up short.
  // count() forwards replacements at runtime, but sequelize's CountOptions type
  // does not list them, hence the cast on the options object.
  const hiddenByMutes = mutesApply
    ? await Audio.count({
        where: {
          [Op.and]: [matchesQuery, { userId: { [Op.in]: mutedUserIds } }],
        },
        replacements: { query },
        include: {
          model: User,
          where: event.locals.user?.isAdmin ? {} : { isTrusted: true },
        },
      } as Parameters<typeof Audio.count>[0])
    : 0;

  const audioIds = audios.map(audio => audio.id);
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

  return {
    searchType: "standard",
    audios: audios.map((audio) => {
      const favoriteCount = favoriteCounts.get(audio.id) || 0;
      const isFavorited = userFavorites.has(audio.id);
      return audio.toClientside(true, favoriteCount, isFavorited);
    }),
    playlists: [],
    query,
    page,
    includeMuted,
    hiddenByMutes,
    hasMutes: mutedUserIds.length > 0,
  };
};
