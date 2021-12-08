import { IModify, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { TextObjectType } from '@rocket.chat/apps-engine/definition/uikit/blocks';
import { IUIKitModalViewParam } from '@rocket.chat/apps-engine/definition/uikit/UIKitInteractionResponder';
import { ModalsEnum } from '../enum/Modals';
import { AppEnum } from '../enum/App';
import { getRoomTasks, getUIData } from '../lib/persistence';
import { UIKitBlockInteractionContext } from '@rocket.chat/apps-engine/definition/uikit';
import { TASKS } from '../enum/Tasks';

async function modifyTasksModal(
    { modify, read, context }: { modify: IModify, read: IRead, context: UIKitBlockInteractionContext },
    modalInfo: Record<"viewId" | "modalTitle" | "modifyButtonActionId" | "modifyButtonLabel", ModalsEnum>,
    taskStatus
): Promise<IUIKitModalViewParam> {
    const roomId = (await getUIData(read.getPersistenceReader(), context.getInteractionData().user.id)).roomId;
    const tasks = await getRoomTasks(read.getPersistenceReader(), roomId);
    const block = modify.getCreator().getBlockBuilder();

    for (const taskId in tasks) {
        const task = tasks[taskId];
        if (
            !(taskStatus & TASKS.COMPLETED & TASKS.INCOMPLETE) &&
            !(taskStatus & TASKS.COMPLETED && task.complete) &&
            !(taskStatus & TASKS.INCOMPLETE && !task.complete)
        ) {
            continue;
        }
        block.addSectionBlock({
            text: { text: task.task, type: TextObjectType.PLAINTEXT },
            accessory: block.newButtonElement({
                actionId: modalInfo.modifyButtonActionId,
                text: {
                    text: modalInfo.modifyButtonLabel,
                    type: TextObjectType.PLAINTEXT
                },
                value: taskId
            })
        });
        block.addContextBlock({ elements: [block.newPlainTextObject(`\Created by: @${task.createdBy.username} on ${task.createdAt.toISOString().split('T')[0]}`)] });
        if (task.complete) {
            block.addContextBlock({ elements: [block.newPlainTextObject(`\nCompleted by: @${task.completedBy.username} on ${task.completedAt.toISOString().split('T')[0]}`)] });
        }
    }

    return {
        id: modalInfo.viewId,
        title: {
            type: TextObjectType.PLAINTEXT,
            text: AppEnum.DEFAULT_TITLE + ' - ' + modalInfo.modalTitle,
        },
        close: block.newButtonElement({
            text: {
                type: TextObjectType.PLAINTEXT,
                text: 'Close',
            },
        }),
        blocks: block.getBlocks(),
    };
}

export async function completedTasksModal({
    modify,
    read,
    context,
}: {
    modify: IModify;
    read: IRead;
    context: UIKitBlockInteractionContext;
}): Promise<IUIKitModalViewParam> {
    return await modifyTasksModal(
        { modify, read, context },
        {
            viewId: ModalsEnum.COMPLETED_TASKS_VIEW,
            modalTitle: ModalsEnum.COMPLETED_TASKS_TITLE,
            modifyButtonActionId: ModalsEnum.TASK_UNDO_ACTION,
            modifyButtonLabel: ModalsEnum.TASK_UNDO_LABEL,
        },
        TASKS.COMPLETED
    );
}

export async function deleteTasksModal({
    modify,
    read,
    context,
}: {
    modify: IModify;
    read: IRead;
    context: UIKitBlockInteractionContext;
}): Promise<IUIKitModalViewParam> {
    return await modifyTasksModal(
        { modify, read, context },
        {
            viewId: ModalsEnum.DELETE_TASKS_VIEW,
            modalTitle: ModalsEnum.DELETE_TASKS_TITLE,
            modifyButtonActionId: ModalsEnum.TASK_DELETE_ACTION,
            modifyButtonLabel: ModalsEnum.TASK_DELETE_LABEL,
        },
        TASKS.COMPLETED | TASKS.INCOMPLETE
    );
}

export async function editTasksModal({
    modify,
    read,
    context,
}: {
    modify: IModify;
    read: IRead;
    context: UIKitBlockInteractionContext;
}): Promise<IUIKitModalViewParam> {
    return await modifyTasksModal(
        { modify, read, context },
        {
            viewId: ModalsEnum.EDIT_TASKS_VIEW,
            modalTitle: ModalsEnum.EDIT_TASKS_TITLE,
            modifyButtonActionId: ModalsEnum.TASK_EDIT_ACTION,
            modifyButtonLabel: ModalsEnum.TASK_EDIT_LABEL,
        },
        TASKS.INCOMPLETE
    );
}
