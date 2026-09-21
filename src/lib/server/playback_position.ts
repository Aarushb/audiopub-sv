import { PlaybackPosition } from "$lib/server/database";
import database from "$lib/server/database";

// The near-start/near-end "don't bother saving this" thresholds only make
// sense where the track's actual duration is known, which is the decoded
// <audio> element's own duration in the browser — the server has no
// reliable source for it, so that decision is made client-side in
// audio_player.svelte, not here. This module only persists whatever the
// client already decided to save (or clears it, for `position: null`).

/**
 * Saves only if there's no existing row, or the new position is further
 * along than what's stored — a stale device's write (automatic or manual)
 * can't clobber more recent progress saved from elsewhere. Locks the row
 * for a fresh read before comparing, the same pattern used for comment and
 * audio edit history, so two concurrent saves for the same track can't
 * race past each other the way an unlocked read-then-write would.
 */
export async function savePlaybackPosition(
    userId: string,
    audioId: string,
    position: number,
): Promise<void> {
    await database.transaction(async (transaction) => {
        const existing = await PlaybackPosition.findOne({
            where: { userId, audioId },
            transaction,
            lock: transaction.LOCK.UPDATE,
        });
        if (existing) {
            if (position > existing.position) {
                existing.position = position;
                await existing.save({ transaction });
            }
            return;
        }
        try {
            await PlaybackPosition.create({ userId, audioId, position } as any, { transaction });
        } catch (err) {
            // Another request created the row between our SELECT and this
            // INSERT (both saving this track for the first time at once) —
            // fall back to a locked read-modify-write instead of failing.
            if ((err as any).name !== "SequelizeUniqueConstraintError") throw err;
            const raceWinner = await PlaybackPosition.findOne({
                where: { userId, audioId },
                transaction,
                lock: transaction.LOCK.UPDATE,
            });
            if (raceWinner && position > raceWinner.position) {
                raceWinner.position = position;
                await raceWinner.save({ transaction });
            }
        }
    });
}

export async function clearPlaybackPosition(userId: string, audioId: string): Promise<void> {
    await PlaybackPosition.destroy({ where: { userId, audioId } });
}

export async function getPlaybackPosition(
    userId: string,
    audioId: string,
): Promise<number | null> {
    const row = await PlaybackPosition.findOne({ where: { userId, audioId } });
    return row ? row.position : null;
}
