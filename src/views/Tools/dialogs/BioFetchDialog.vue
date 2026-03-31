<template>
    <Dialog v-model:open="isVisible">
        <DialogContent class="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>{{ t('view.tools.system_tools.bio_fetch') }}</DialogTitle>
                <DialogDescription>{{ t('view.tools.system_tools.bio_fetch_description') }}</DialogDescription>
            </DialogHeader>

            <div class="space-y-4 py-2">
                <div class="text-sm text-muted-foreground">
                    {{ t('view.tools.system_tools.bio_fetch_hint', { count: friendCount }) }}
                </div>

                <!-- Bio row -->
                <div class="flex items-center justify-between">
                    <div class="w-full mr-4">
                        <div class="text-sm font-medium">个人简介 (Bio)</div>
                        <div class="text-xs text-muted-foreground h-4">
                            <span v-if="bioStatus === 'idle'">空闲</span>
                            <span v-else-if="bioStatus === 'running'">正在扫描 {{ bioDone }} / {{ bioTotal }}...</span>
                            <span v-else-if="bioStatus === 'done'" class="text-green-600 dark:text-green-400">完成 — 更新了 {{ bioUpdatedCount }} 条</span>
                        </div>
                        <Progress v-if="bioStatus === 'running'" :model-value="(bioDone / Math.max(bioTotal, 1)) * 100" class="h-1 mt-1 w-full" />
                    </div>
                    <div>
                        <Button 
                            v-if="bioStatus !== 'running'" 
                            size="sm" 
                            variant="default"
                            @click="startFetch('bio')"
                        >
                            {{ bioStatus === 'done' ? '再次刷新' : '刷新简介' }}
                        </Button>
                        <Button
                            v-if="bioStatus === 'running'"
                            size="sm"
                            variant="secondary"
                            @click="stopFetch('bio')"
                        >
                            取消
                        </Button>
                    </div>
                </div>

                <!-- Status row -->
                <div class="flex items-center justify-between mt-2">
                    <div class="w-full mr-4">
                        <div class="text-sm font-medium">隐私状态 (灯色)</div>
                        <div class="text-xs text-muted-foreground h-4">
                            <span v-if="statusStatus === 'idle'">空闲</span>
                            <span v-else-if="statusStatus === 'running'">正在扫描 {{ statusDone }} / {{ statusTotal }}...</span>
                            <span v-else-if="statusStatus === 'done'" class="text-green-600 dark:text-green-400">完成 — 更新了 {{ statusUpdatedCount }} 条</span>
                        </div>
                        <Progress v-if="statusStatus === 'running'" :model-value="(statusDone / Math.max(statusTotal, 1)) * 100" class="h-1 mt-1 w-full" />
                    </div>
                    <div>
                        <Button 
                            v-if="statusStatus !== 'running'" 
                            size="sm" 
                            variant="default"
                            @click="startFetch('status')"
                        >
                            {{ statusStatus === 'done' ? '再次刷新' : '刷新状态' }}
                        </Button>
                        <Button
                            v-if="statusStatus === 'running'"
                            size="sm"
                            variant="secondary"
                            @click="stopFetch('status')"
                        >
                            取消
                        </Button>
                    </div>
                </div>
            </div>

            <DialogFooter class="flex flex-row justify-between items-center sm:justify-between w-full">
                <Button 
                    variant="default" 
                    @click="startFetchAll" 
                    :disabled="bioStatus === 'running' || statusStatus === 'running'"
                >
                    全部抓取
                </Button>
                
                <Button variant="ghost" @click="isVisible = false">
                    {{ t('view.tools.system_tools.bio_fetch_close') }}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>

<script setup>
    import { Button } from '@/components/ui/button';
    import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
    import { Progress } from '@/components/ui/progress';
    import { computed, ref, watch } from 'vue';
    import { storeToRefs } from 'pinia';
    import { useI18n } from 'vue-i18n';

    import { database } from '../../../services/database';
    import { useFriendStore } from '../../../stores';

    const props = defineProps({
        visible: {
            type: Boolean,
            required: true
        }
    });
    const emit = defineEmits(['close']);

    const { t } = useI18n();
    const { friends } = storeToRefs(useFriendStore());

    const isVisible = computed({
        get: () => props.visible,
        set: (v) => { if (!v) emit('close'); }
    });

    const bioStatus = ref('idle');
    const bioDone = ref(0);
    const bioTotal = ref(0);
    const bioUpdatedCount = ref(0);
    let bioCancelled = false;

    const statusStatus = ref('idle');
    const statusDone = ref(0);
    const statusTotal = ref(0);
    const statusUpdatedCount = ref(0);
    let statusCancelled = false;

    const friendCount = computed(() => friends.value.size);

    watch(isVisible, (v) => {
        if (!v) {
            bioCancelled = true;
            statusCancelled = true;
            bioStatus.value = 'idle';
            bioDone.value = 0;
            bioTotal.value = 0;
            bioUpdatedCount.value = 0;

            statusStatus.value = 'idle';
            statusDone.value = 0;
            statusTotal.value = 0;
            statusUpdatedCount.value = 0;
        }
    });

    function stopFetch(type) {
        if (type === 'bio') bioCancelled = true;
        if (type === 'status') statusCancelled = true;
    }

    async function startFetch(type) {
        if (type === 'bio') {
            bioCancelled = false;
            bioStatus.value = 'running';
            bioDone.value = 0;
            bioUpdatedCount.value = 0;
        } else if (type === 'status') {
            statusCancelled = false;
            statusStatus.value = 'running';
            statusDone.value = 0;
            statusUpdatedCount.value = 0;
        }

        const friendList = [...friends.value.values()].filter((ctx) => ctx.ref);
        
        if (type === 'bio') bioTotal.value = friendList.length;
        if (type === 'status') statusTotal.value = friendList.length;

        for (const ctx of friendList) {
            if (type === 'bio' && bioCancelled) break;
            if (type === 'status' && statusCancelled) break;

            const ref = ctx.ref;
            const userId = ref.id;
            const displayName = ref.displayName || ctx.name || '';

            try {
                if (type === 'bio') {
                    const currentBio = ref.bio || '';
                    const last = await database.getLastBioChangeForUser(userId);
                    if (!last || last.bio !== currentBio) {
                        database.addBioToDatabase({
                            created_at: new Date().toJSON(),
                            userId,
                            displayName,
                            bio: currentBio,
                            previousBio: last ? last.bio : ''
                        });
                        bioUpdatedCount.value++;
                    }
                    bioDone.value++;
                } else if (type === 'status') {
                    const currentStatus = ref.status || '';
                    const currentStatusDesc = ref.statusDescription || '';
                    
                    const validStatuses = ['join me', 'active', 'ask me', 'busy'];
                    if (validStatuses.includes(currentStatus)) {
                        const last = await database.getLastStatusChangeForUser(userId);
                        if (!last || last.status !== currentStatus) {
                            database.addStatusToDatabase({
                                created_at: new Date().toJSON(),
                                userId,
                                displayName,
                                status: currentStatus,
                                statusDescription: currentStatusDesc,
                                previousStatus: last ? last.status : '',
                                previousStatusDescription: last ? last.statusDescription : ''
                            });
                            statusUpdatedCount.value++;
                        }
                    }
                    statusDone.value++;
                }
            } catch {
                // ignore individual errors
                if (type === 'bio') bioDone.value++;
                if (type === 'status') statusDone.value++;
            }
        }

        if (type === 'bio') {
            bioStatus.value = !bioCancelled ? 'done' : 'idle';
        } else if (type === 'status') {
            statusStatus.value = !statusCancelled ? 'done' : 'idle';
        }
    }

    function startFetchAll() {
        if (bioStatus.value !== 'running') {
            startFetch('bio');
        }
        if (statusStatus.value !== 'running') {
            startFetch('status');
        }
    }
</script>
