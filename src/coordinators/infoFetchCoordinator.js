import { reactive } from 'vue';
import { database } from '../services/database';
import { useFriendStore } from '../stores';

/**
 * 信息抓取补全的全局响应式状态。
 * StatusBar 等 UI 组件直接读取此对象即可。
 */
export const infoFetchState = reactive({
    /** 'idle' | 'running' | 'done' */
    status: 'idle',
    done: 0,
    total: 0,
    bioUpdated: 0,
    statusUpdated: 0
});

let cancelled = false;

/**
 * 取消正在进行的抓取。
 */
export function cancelInfoFetch() {
    cancelled = true;
}

/**
 * 执行全量信息抓取补全（个人简介 + 隐私状态）。
 * 通过修改 infoFetchState 自动驱动 UI。
 *
 * 可由启动、重连、用户手动点击等多处调用，内建防重入。
 */
export async function runSilentInfoFetch() {
    if (infoFetchState.status === 'running') return;

    cancelled = false;
    infoFetchState.status = 'running';
    infoFetchState.done = 0;
    infoFetchState.bioUpdated = 0;
    infoFetchState.statusUpdated = 0;

    const friendStore = useFriendStore();
    const friendList = [...friendStore.friends.values()].filter((ctx) => ctx.ref);

    infoFetchState.total = friendList.length;

    if (friendList.length === 0) {
        infoFetchState.status = 'done';
        return;
    }

    console.log(`[InfoFetch] 开始抓取，共 ${friendList.length} 位好友`);

    for (const ctx of friendList) {
        if (cancelled) break;

        const ref = ctx.ref;
        const userId = ref.id;
        const displayName = ref.displayName || ctx.name || '';

        try {
            // Bio
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
                infoFetchState.bioUpdated++;
            }
        } catch {
            // ignore
        }

        try {
            // Status
            const currentStatus = ref.status || '';
            const currentStatusDesc = ref.statusDescription || '';
            
            const validStatuses = ['join me', 'active', 'ask me', 'busy'];
            if (validStatuses.includes(currentStatus)) {
                const lastStatus = await database.getLastStatusChangeForUser(userId);
                
                // 仅当状态发生改变时才记录，不记录仅签名（statusDescription）的改变
                if (!lastStatus || lastStatus.status !== currentStatus) {
                    database.addStatusToDatabase({
                        created_at: new Date().toJSON(),
                        userId,
                        displayName,
                        status: currentStatus,
                        statusDescription: currentStatusDesc,
                        previousStatus: lastStatus ? lastStatus.status : '',
                        previousStatusDescription: lastStatus ? lastStatus.statusDescription : ''
                    });
                    infoFetchState.statusUpdated++;
                }
            }
        } catch {
            // ignore
        }

        infoFetchState.done++;
    }

    if (!cancelled) {
        infoFetchState.status = 'done';
        console.log(
            `[InfoFetch] 完成：Bio 更新 ${infoFetchState.bioUpdated} 条，Status 更新 ${infoFetchState.statusUpdated} 条`
        );
    } else {
        infoFetchState.status = 'idle';
        console.log('[InfoFetch] 已取消');
    }
}
