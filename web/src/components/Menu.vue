<template>
    <n-layout-sider bordered collapse-mode="width" :collapsed-width="64" :width="240" :collapsed="collapsed"
        show-trigger @collapse="collapsed = true" @expand="collapsed = false">
        <n-menu :collapsed="collapsed" :collapsed-width="64" :collapsed-icon-size="22" :options="menuOptions"
            :expand-icon="expandIcon" :value="value()" :default-expanded-keys="['anime-view']" />
    </n-layout-sider>
</template>

<script setup lang="ts">
import { NMenu, NIcon, NLayoutSider, NBadge } from 'naive-ui'
import { ref, h, computed, inject } from 'vue'
import { CaretDownOutline, LayersOutline, SettingsOutline, HomeOutline, CaretForwardCircleOutline, ArrowDownCircleOutline } from '@vicons/ionicons5'

import { RouterLink, useRoute } from 'vue-router'

const route = useRoute()

function createItem(to: string, v: string, icon: any) {
    return {
        label: () => h(RouterLink, { to: to }, v),
        key: to,
        icon: () => h(NIcon, null, { default: () => h(icon) })
    }
}

const menuOptions = computed(() => [
    createItem('/', '动画列表', HomeOutline),
    createItem('/add-anime', '添加动画', SettingsOutline),
    createItem('/download', '下载进度', ArrowDownCircleOutline),
    {
        label: '动画',
        key: 'anime-view',
        icon: () => h(NIcon, null, { default: () => h(LayersOutline) }),
        children: [
            // TODO: 动画列表
        ]
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
