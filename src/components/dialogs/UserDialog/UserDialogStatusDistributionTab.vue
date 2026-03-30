<template>
    <div class="flex min-w-0 flex-col overflow-x-hidden" style="min-height: 200px">
        <!-- Toolbar -->
        <div class="flex items-center justify-between">
            <div class="flex items-center">
                <Button
                    class="rounded-full"
                    variant="ghost"
                    size="icon-sm"
                    :disabled="isLoading"
                    :title="t('dialog.user.status_distribution.refresh_hint')"
                    @click="loadData(true)">
                    <Spinner v-if="isLoading" />
                    <RefreshCw v-else />
                </Button>
            </div>
            <div v-if="hasData" class="flex items-center gap-2 pr-1">
                <ZoomOut class="size-3.5 shrink-0 text-muted-foreground" />
                <input
                    type="range"
                    v-model.number="scaleSlider"
                    min="0"
                    max="100"
                    step="1"
                    class="w-28 accent-primary"
                    @change="rebuildChart" />
                <ZoomIn class="size-3.5 shrink-0 text-muted-foreground" />
                <span class="w-20 text-right text-xs tabular-nums text-muted-foreground">
                    {{ bucketDays }}
                    {{ t('dialog.user.status_distribution.days_per_unit') }}
                </span>
            </div>
        </div>

        <!-- Loading -->
        <div
            v-if="isLoading && !hasData"
            class="flex flex-col items-center justify-center flex-1 mt-8 gap-2">
            <Spinner class="h-5 w-5" />
            <span class="text-sm text-muted-foreground">
                {{ t('dialog.user.status_distribution.loading') }}
            </span>
        </div>

        <!-- No data -->
        <div
            v-else-if="!isLoading && !hasData"
            class="flex items-center justify-center flex-1 mt-8">
            <DataTableEmpty type="nodata" />
        </div>

        <!-- Chart -->
        <div
            v-show="hasData"
            ref="chartDomRef"
            class="min-w-0 flex-1"
            style="width: 100%; min-height: 280px"
            role="img"
            :aria-label="t('dialog.user.status_distribution.header')" />
    </div>
</template>

<script setup>
    defineOptions({ name: 'UserDialogStatusDistributionTab' });

    import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { RefreshCw, ZoomIn, ZoomOut } from 'lucide-vue-next';
    import { storeToRefs } from 'pinia';
    import { useI18n } from 'vue-i18n';
    import * as echarts from 'echarts';

    import { Button } from '@/components/ui/button';
    import { DataTableEmpty } from '@/components/ui/data-table';
    import { Spinner } from '@/components/ui/spinner';

    import { database } from '../../../services/database';
    import { useAppearanceSettingsStore, useUserStore } from '../../../stores';

    const { t } = useI18n();
    const { userDialog } = storeToRefs(useUserStore());
    const { isDarkMode } = storeToRefs(useAppearanceSettingsStore());

    // ─── Status colors matching VRChat official palette ──────────────────────────
    const STATUS_COLORS = {
        active:   '#2ED319',
        'join me': '#00B8FF',
        'ask me': '#E97C03',
        busy:     '#C80928'
    };

    // ─── Status keys in display order ────────────────────────────────────────────
    const STATUS_KEYS = ['join me', 'active', 'ask me', 'busy'];

    // ─── State ────────────────────────────────────────────────────────────────────
    const isLoading = ref(false);
    const rawRows = ref([]);
    const chartDomRef = ref(null);
    let echartsInstance = null;
    let resizeObserver = null;

    // ─── Non-linear scale slider (0-100) ──────────────────────────────────────────
    // Mapped to bucketDays = round(90 ^ (slider/100)).
    // 0 → 1 day/bucket, 51 → ~10 days, 100 → 90 days
    const scaleSlider = ref(51);
    const bucketDays = computed(() =>
        Math.max(1, Math.round(Math.pow(90, scaleSlider.value / 100)))
    );
    const DEFAULT_VISIBLE_BUCKETS = 10;

    const hasData = computed(() => rawRows.value.length > 0);

    // ─── Bucket helpers ───────────────────────────────────────────────────────────
    function daysSinceEpoch(isoStr) {
        return Math.floor(Date.parse(isoStr) / 86400000);
    }

    function bucketLabel(bucketIdx, firstDay, bDays) {
        const startDay = firstDay + bucketIdx * bDays;
        const endDay = startDay + bDays - 1;
        const start = new Date(startDay * 86400000).toISOString().slice(0, 10);
        if (bDays === 1) return start;
        const end = new Date(endDay * 86400000).toISOString().slice(0, 10);
        return `${start}~${end}`;
    }

    // ─── Build chart data from rawRows ────────────────────────────────────────────
    function buildChartData() {
        const rows = rawRows.value;
        if (!rows.length) return null;

        const bDays = bucketDays.value;
        let firstDay = Infinity;
        let lastDay = -Infinity;

        for (const row of rows) {
            const day = daysSinceEpoch(row.createdAt);
            if (day < firstDay) firstDay = day;
            if (day > lastDay) lastDay = day;
        }

        if (!isFinite(firstDay)) return null;

        const bucketCount = Math.floor((lastDay - firstDay) / bDays) + 1;

        // Per-bucket counts per status
        const counts = Array.from({ length: bucketCount }, () => ({
            active: 0,
            'join me': 0,
            'ask me': 0,
            busy: 0,
            total: 0
        }));

        for (const row of rows) {
            const day = daysSinceEpoch(row.createdAt);
            const idx = Math.floor((day - firstDay) / bDays);
            const bucket = counts[idx];
            if (bucket && row.status in bucket) {
                bucket[row.status]++;
                bucket.total++;
            }
        }

        const xLabels = Array.from({ length: bucketCount }, (_, i) =>
            bucketLabel(i, firstDay, bDays)
        );

        const series = STATUS_KEYS.map((status) => ({
            name: t(`dialog.user.status_distribution.status.${status.replace(' ', '_')}`),
            type: 'line',
            stack: 'total',
            areaStyle: { opacity: 0.75 },
            lineStyle: { width: 0 },
            smooth: false,
            symbol: 'none',
            color: STATUS_COLORS[status],
            emphasis: { focus: 'series', areaStyle: { opacity: 0.95 } },
            blur: { areaStyle: { opacity: 0.3 } },
            data: counts.map((b) => (b.total > 0 ? +((b[status] / b.total) * 100).toFixed(1) : 0))
        }));

        return { xLabels, series, bucketCount };
    }

    // ─── ECharts option builder ───────────────────────────────────────────────────
    function buildOption(chartData) {
        const { xLabels, series, bucketCount } = chartData;
        const isDark = isDarkMode.value;

        // Default zoom to last DEFAULT_VISIBLE_BUCKETS buckets
        const zoomStart =
            bucketCount <= DEFAULT_VISIBLE_BUCKETS
                ? 0
                : ((bucketCount - DEFAULT_VISIBLE_BUCKETS) / bucketCount) * 100;

        return {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'line',
                    lineStyle: { color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)' }
                },
                formatter(params) {
                    const header = `<div style="margin-bottom:6px;font-weight:600;font-size:12px">${params[0]?.axisValue}</div>`;
                    const items = params
                        .filter((p) => p.value > 0)
                        .sort((a, b) => b.value - a.value);
                    if (!items.length) return '';
                    const rows = items
                        .map(
                            (p) =>
                                `<div style="display:flex;align-items:center;gap:6px;padding:2px 4px">` +
                                `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${p.color};flex-shrink:0"></span>` +
                                `<span style="flex:1;font-size:12px">${p.seriesName}</span>` +
                                `<span style="font-size:12px;font-weight:600;tabular-nums">${p.value.toFixed(1)}%</span>` +
                                `</div>`
                        )
                        .join('');
                    return header + rows;
                }
            },
            legend: {
                top: 0,
                type: 'plain',
                textStyle: { color: isDark ? '#ccc' : '#333', fontSize: 11 },
                data: series.map((s) => s.name)
            },
            grid: {
                left: '3%',
                right: '2%',
                top: 36,
                bottom: 80,
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: xLabels,
                boundaryGap: false,
                axisLabel: {
                    rotate: 30,
                    fontSize: 10,
                    color: isDark ? '#bbb' : '#555'
                },
                axisLine: { lineStyle: { color: isDark ? '#444' : '#ddd' } }
            },
            yAxis: {
                type: 'value',
                max: 100,
                axisLabel: {
                    formatter: '{value}%',
                    color: isDark ? '#bbb' : '#555',
                    fontSize: 11
                },
                splitLine: { lineStyle: { color: isDark ? '#333' : '#eee' } }
            },
            dataZoom: [
                {
                    type: 'slider',
                    show: true,
                    xAxisIndex: [0],
                    start: zoomStart,
                    end: 100,
                    bottom: 5,
                    height: 20,
                    borderColor: 'transparent',
                    fillerColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                    handleStyle: { color: isDark ? '#888' : '#aaa' }
                },
                {
                    type: 'inside',
                    xAxisIndex: [0],
                    start: zoomStart,
                    end: 100
                }
            ],
            series
        };
    }

    // ─── Chart lifecycle ──────────────────────────────────────────────────────────
    function rebuildChart() {
        if (!chartDomRef.value) return;
        const chartData = buildChartData();
        if (!chartData) return;

        if (!echartsInstance) {
            echartsInstance = echarts.init(
                chartDomRef.value,
                isDarkMode.value ? 'dark' : null,
                { renderer: 'canvas' }
            );
            resizeObserver = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    echartsInstance?.resize({ width: entry.contentRect.width });
                }
            });
            resizeObserver.observe(chartDomRef.value);
        }

        echartsInstance.setOption(buildOption(chartData), { notMerge: true });
    }

    function disposeChart() {
        resizeObserver?.disconnect();
        resizeObserver = null;
        echartsInstance?.dispose();
        echartsInstance = null;
    }

    // ─── Data loading ──────────────────────────────────────────────────────────────
    async function loadData(forceRefresh = false) {
        const userId = userDialog.value?.id;
        if (!userId) return;
        if (!forceRefresh && rawRows.value.length > 0 && lastLoadedUserId === userId) return;

        isLoading.value = true;
        try {
            rawRows.value = await database.getStatusHistoryForUser(userId);
            lastLoadedUserId = userId;
        } catch (err) {
            console.error('[StatusDistribution] Failed to load data', err);
            rawRows.value = [];
        } finally {
            isLoading.value = false;
        }
        await nextTick();
        rebuildChart();
    }

    let lastLoadedUserId = '';

    // ─── Public API ────────────────────────────────────────────────────────────────
    function loadStatusDistribution(userId) {
        if (!userId || userDialog.value?.id !== userId) return;
        void loadData();
    }

    defineExpose({ loadStatusDistribution });

    // ─── Watchers ──────────────────────────────────────────────────────────────────
    watch(
        () => userDialog.value?.id,
        () => {
            rawRows.value = [];
            lastLoadedUserId = '';
            disposeChart();
        }
    );

    watch(isDarkMode, () => {
        disposeChart();
        nextTick(() => rebuildChart());
    });

    watch(
        () => userDialog.value?.visible,
        (visible) => {
            if (visible && userDialog.value?.activeTab === 'status-distribution') {
                void loadData();
            }
        }
    );

    onMounted(() => {
        if (userDialog.value?.visible && userDialog.value?.activeTab === 'status-distribution') {
            void loadData();
        }
    });

    onBeforeUnmount(() => {
        disposeChart();
    });
</script>
