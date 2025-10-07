<template>
    <n-collapse>
        <n-collapse-item title="设置" name="setting">
            <n-space>
                <WatchTag :tv_id="tv_id" />
                <DeleteButton :tv_id="tv_id" />
                <RefreshButton :tv_id="tv_id" :episode_idx="tv.watch.watched_episode" @done="reload(tv_id)" />
            </n-space>
        </n-collapse-item>
        <n-collapse-item title="源" name="update_source">
            <UpdateSource :tv_id="tv_id" :episode_idx="tv.watch.watched_episode" @done="reload(tv_id)" />
        </n-collapse-item>
    </n-collapse>
</template>

<script setup lang="ts">
import DeleteButton from '@/components/common/DeleteButton.vue'
import WatchTag from '@/components/common/WatchTag.vue'
import RefreshButton from '@/components/common/RefreshButton.vue'
import UpdateSource from '@/components/common/UpdateSource.vue'
import { NCollapse, NCollapseItem, NSpace, useMessage } from 'naive-ui'
import type { get_tv } from '@/schema'

const { tv_id, reload } = defineProps<{
    tv_id: number,
    reload: (tv_id: number) => void
}>()
const tv = defineModel<get_tv.Response>("tv", { required: true })
</script>