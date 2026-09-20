import { Comment, CommentEdit, User } from "$lib/server/database";
import database from "$lib/server/database";

export const MAX_USER_COMMENT_EDITS = 3;

export class CommentEditLimitError extends Error {}
export class CommentNotFoundError extends Error {}

export async function updateCommentContent(
    commentId: string,
    editor: User,
    content: string,
): Promise<CommentEdit | null> {
    return database.transaction(async (transaction) => {
        const comment = await Comment.findByPk(commentId, {
            transaction,
            lock: transaction.LOCK.UPDATE,
        });
        if (!comment) {
            throw new CommentNotFoundError();
        }

        if (comment.content === content) {
            return null;
        }

        if (!editor.isAdmin) {
            const editCount = await CommentEdit.count({
                where: { commentId, isAdminEdit: false },
                transaction,
            });
            if (editCount >= MAX_USER_COMMENT_EDITS) {
                throw new CommentEditLimitError();
            }
        }

        const edit = await CommentEdit.create(
            {
                commentId,
                editorId: editor.id,
                previousContent: comment.content,
                newContent: content,
                isAdminEdit: editor.isAdmin,
            },
            { transaction },
        );

        comment.content = content;
        await comment.save({ transaction });
        return edit;
    });
}
