<template>
    <n-layout-sider bordered collapse-mode="width" :collapsed-width="64" :width="240" :collapsed="collapsed"
        show-trigger @collapse="collapsed = true" @expand="collapsed = false">
        <n-menu :collapsed="collapsed" :collapsed-width="64" :collapsed-icon-size="22" :options="menuOptions"
            :expand-icon="expandIcon" :value="value()" :default-expanded-keys="['tv-view', 'watching']" :indent="5"
            :root-indent="20" />
    </n-layout-sider>
</template>

<script setup lang="ts">
import { NMenu, NIcon, NLayoutSider, NBadge, NSpace, NEllipsis } from 'naive-ui'
import { ref, h, computed, inject } from 'vue'
import {
    CaretDownOutline, LayersOutline, SettingsOutline, HomeOutline,
    CaretForwardCircleOutline, ArrowDownCircleOutline, WarningOutline,
    ExtensionPuzzleOutline
} from '@vicons/ionicons5'
import type { monitor, db, get_config } from '@/schema'
import type { Ref, VNode, VNodeProps } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { watched_episode } from '@/utils'

const tvs = inject<Ref<monitor.TV[]>>('tvs') as Ref<monitor.TV[]>
const critical_errors = inject<Ref<number>>('critical_errors') as Ref<number>
const errors = inject<Ref<number>>('errors') as Ref<number>
const watched_ratio = inject<Ref<number>>('watched_ratio') as Ref<number>
const tags = inject<Ref<string[]>>('tags') as Ref<string[]>
const tag_to_name = inject<Ref<{ [id: string]: string; }>>('tag_to_name') as Ref<{ [id: string]: string; }>
const system_monitor = inject<Ref<get_config.SystemMonitor[]>>('system_monitor') as Ref<get_config.SystemMonitor[]>


const route = useRoute()

function createItem(to: string, v: string | (() => VNode), icon: any) {
    return {
        label: () => h(RouterLink, { to: to }, v),
        key: to,
        icon: () => h(NIcon, null, { default: () => h(icon) })
    }
}

function createTVItem(tv: monitor.TV) {
    return {
        label: () => h(NEllipsis, { "max-width": 160 }, h(RouterLink, { to: "/tv-view/" + tv.id }, tv.name)),
        key: "/tv-view/" + tv.id,
        icon: () => h(NBadge, {
            value: tv.tag === "watching" ? tv.total_episodes - watched_episode(tv.watch, watched_ratio.value) : 0
        }, h(NIcon, null, { default: () => h(CaretForwardCircleOutline) }))
    }
}

function createErrorSign(name: string, critical_errors: number, errors: number) {
    return h(NSpace, { vertical: false }, [
        h("p", null, name),
        h(NBadge, { value: critical_errors }),
        h(NBadge, { value: errors, type: "warning" }),
    ])
}

function createTagGroup(tag: string) {
    return {
        label: tag_to_name.value[tag] || tag,
        key: tag,
        icon: () => h(NIcon, null, { default: () => h(ExtensionPuzzleOutline) }),
        children: tvs.value.filter(tv => tv.tag === tag).map(createTVItem)
    }
}

const menuOptions = computed(() => [
    createItem('/', 'TV列表', HomeOutline),
    createItem('/add-tv', '添加TV', SettingsOutline),
    createItem('/download', '下载进度', ArrowDownCircleOutline),
    createItem('/error-log', () => createErrorSign('错误日志', critical_errors.value, errors.value), WarningOutline),
    {
        label: '系统监控',
        key: 'system-monitor',
        icon: () => h(NIcon, null, { default: () => h(ExtensionPuzzleOutline) }),
        children: [
            createItem('/system-operation', '系统操作', ExtensionPuzzleOutline),
            ...system_monitor.value.map(item => createItem('/system-monitor/' + item.key, item.name, ExtensionPuzzleOutline))
        ]
    },
    {
        label: 'TV',
        key: 'tv-view',
        icon: () => h(NIcon, null, { default: () => h(LayersOutline) }),
        children: tags.value.map(createTagGroup)
    }
])
const collapsed = ref(false)
function expandIcon() {
    return h(NIcon, null, { default: () => h(CaretDownOutline) })
}
function value() {
    return route.path
}
</script>

<style scoped></style>
