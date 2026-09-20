import { Audio, AudioFavorite, Stream, User } from "$lib/server/database";
import Subscription from "$lib/server/database/models/subscription";
import { redirect, type ServerLoad } from "@sveltejs/kit";
import { Op } from "sequelize";

export const load: ServerLoad = async (event) => {
    const user = event.locals.user;
    if (!user) {
        return redirect(303, "/login")
    }

    const subscriptions = await Subscription.findAll({
        where: { subscriberId: user.id },
    });

    const subscribedToUsers = subscriptions.map((subscription) => subscription.subscribedToId)

    const pageString = event.url.searchParams.get("page");
    const page = pageString ? parseInt(pageString, 10) : 1;
    const limit = 30;
    const offset = (page - 1) * limit;
    
    const audios = await Audio.findAndCountAll({
        where: { userId: { [Op.in]: subscribedToUsers } },
        limit,
        offset,
        order: [["createdAt", "DESC"]],
        include: User
    });

    let clientsideAudios = [];
    for (const audio of audios.rows) {
        const favoriteCount = await AudioFavorite.count({ where: { audioId: audio.id } });
        clientsideAudios.push(audio.toClientside(true, favoriteCount));
    }

    return {
        streams:
            page === 1
                ? (
                      await Stream.findAll({
                          where: { state: "active", userId: { [Op.in]: subscribedToUsers } } ,
                          order: [["createdAt", "DESC"]],
                          include: User,
                      })
                  ).map((s) => s.toClientside(true))
                : [],
        audios: clientsideAudios,
        count: audios.count,
        page,
        limit,
        totalPages: Math.ceil(audios.count / limit),
        hasSubscriptions: subscribedToUsers.length > 0
    }
}
