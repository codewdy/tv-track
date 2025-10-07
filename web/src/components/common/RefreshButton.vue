<template>
    <n-button @click="setDownloadStatus('running')">重新下载</n-button>
</template>

<script setup lang="ts">
import { NButton, useMessage } from 'naive-ui'
import axios from 'axios'
import type { get_tv } from '@/schema'

const message = useMessage()

const { tv_id, episode_idx } = defineProps<{
    tv_id: number,
    episode_idx: number
}>()
const emit = defineEmits(["done"])

function setDownloadStatus(status: "running" | "success" | "failed") {
    axios.post("/api/set_download_status", {
        id: tv_id,
        episode_idx: episode_idx,
        status: status
    }).then(() => {
        emit("done")
    }).catch(() => {
        message.error("设置失败")
    })
}
</script>