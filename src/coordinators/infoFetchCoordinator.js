import { database } from '../services/database';
import { useFriendStore } from '../stores';

let isRunning = false;

/**
 * 静默执行全量信息抓取补全（个人简介 + 隐私状态）。
 * 在好友列表加载完成后自动调用，无 UI 交互。
 */
export async function runSilentInfoFetch() {
    if (isRunning) return;
    isRunning = true;

    const friendStore = useFriendStore();
    const friendList = [...friendStore.friends.values()].filter((ctx) => ctx.ref);

    if (friendList.length === 0) {
        isRunning = false;
        return;
    }

    console.log(`[InfoFetch] 开始静默抓取，共 ${friendList.length} 位好友`);

    let bioUpdated = 0;
    let statusUpdated = 0;

    for (const ctx of friendList) {
        const ref = ctx.ref;
        const userId = ref.id;
        const displayName = ref.displayName || ctx.name || '';

        try {
            // Bio 抓取
            const currentBio = ref.bio || '';
            const lastBio = await database.getLastBioChangeForUser(userId);
            if (!lastBio || lastBio.bio !== currentBio) {
                database.addBioToDatabase({
                    created_at: new Date().toJSON(),
                    userId,
                    displayName,
                    bio: currentBio,
                    previousBio: lastBio ? lastBio.bio : ''
                });
                bioUpdated++;
            }
        } catch {
            // ignore individual bio errors
        }

        try {
            // 隐私状态(灯色) 抓取
            const currentStatus = ref.status || '';
            const currentStatusDesc = ref.statusDescription || '';
            const lastStatus = await database.getLastStatusChangeForUser(userId);
            if (
                !lastStatus ||
                lastStatus.status !== currentStatus ||
                lastStatus.statusDescription !== currentStatusDesc
            ) {
                database.addStatusToDatabase({
                    created_at: new Date().toJSON(),
                    userId,
                    displayName,
                    status: currentStatus,
                    statusDescription: currentStatusDesc,
                    previousStatus: lastStatus ? lastStatus.status : '',
                    previousStatusDescription: lastStatus ? lastStatus.statusDescription : ''
                });
                statusUpdated++;
            }
        } catch {
            // ignore individual status errors
        }
    }

    console.log(
        `[InfoFetch] 静默抓取完成：Bio 更新 ${bioUpdated} 条，Status 更新 ${statusUpdated} 条`
    );
    isRunning = false;
}
