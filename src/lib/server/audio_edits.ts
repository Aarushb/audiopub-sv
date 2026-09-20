import { Audio, AudioEdit, User } from "$lib/server/database";
import database from "$lib/server/database";

export const MAX_USER_AUDIO_EDITS = 3;

export class AudioEditLimitError extends Error {}
export class AudioNotFoundError extends Error {}

export async function updateAudioDetails(
    audioId: string,
    editor: User,
    title: string,
    description: string,
    restoredEditId: string | null = null,
): Promise<AudioEdit | null> {
    return database.transaction(async (transaction) => {
        const audio = await Audio.findByPk(audioId, {
            transaction,
            lock: transaction.LOCK.UPDATE,
        });
        if (!audio) {
            throw new AudioNotFoundError();
        }

        if (audio.title === title && audio.description === description) {
            return null;
        }

        if (!editor.isAdmin) {
            const editCount = await AudioEdit.count({
                where: { audioId, isAdminEdit: false },
                transaction,
            });
            if (editCount >= MAX_USER_AUDIO_EDITS) {
                throw new AudioEditLimitError();
            }
        }

        const edit = await AudioEdit.create(
            {
                audioId,
                editorId: editor.id,
                previousTitle: audio.title,
                previousDescription: audio.description,
                newTitle: title,
                newDescription: description,
                isAdminEdit: editor.isAdmin,
                restoredEditId,
            },
            { transaction },
        );

        audio.title = title;
        audio.description = description;
        await audio.save({ transaction });
        return edit;
    });
}
