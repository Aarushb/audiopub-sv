import { Audio, Stream, User } from "$lib/server/database";
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
        audios: audios.rows.map((audio) => audio.toClientside()),
        count: audios.count,
        page,
        limit,
        totalPages: Math.ceil(audios.count / limit),
        hasSubscriptions: subscribedToUsers.length > 0
    }
}
