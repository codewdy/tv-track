<template>
    <n-collapse>
        <n-collapse-item title="设置" name="setting">
            <n-space>
                <WatchTag :tv_id="tv_id" />
                <DeleteButton :tv_id="tv_id" />
                <n-button @click="setDownloadStatus('running')">重新下载</n-button>
            </n-space>
        </n-collapse-item>
    </n-collapse>
</template>

<script setup lang="ts">
import DeleteButton from '@/components/common/DeleteButton.vue'
import WatchTag from '@/components/common/WatchTag.vue'
import { NCollapse, NCollapseItem, NSpace, NButton, useMessage } from 'naive-ui'
import axios from 'axios'
import type { get_tv } from '@/schema'
import { Reload } from '@vicons/ionicons5'

const message = useMessage()

const { tv_id, reload } = defineProps<{
    tv_id: number,
    reload: (tv_id: number) => void
}>()
const tv = defineModel<get_tv.Response>("tv", { required: true })

function setDownloadStatus(status: "running" | "success" | "failed") {
    axios.post("/api/set_download_status", {
        id: tv_id,
        episode_idx: tv.value.watch.watched_episode,
        status: status
    }).then(() => {
        reload(tv_id)
    }).catch(() => {
        message.error("设置失败")
    })
}
</script>