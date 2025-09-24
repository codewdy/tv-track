<template>
    <n-spin :spinning="search_error">
        <n-divider title-placement="left">
            下载中
        </n-divider>
        <n-space vertical>
            <DownloadUnit v-for="item in downloading" :download="item" />
        </n-space>
        <n-divider title-placement="left">
            等待中
        </n-divider>
        <n-space vertical>
            <DownloadUnit v-for="item in pending" :download="item" />
        </n-space>
    </n-spin>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { NSpin, NSpace, NDivider, useMessage } from 'naive-ui'
import DownloadUnit from './DownloadUnit.vue'
import type { get_download_status } from '@/schema'
import type { AxiosResponse } from 'axios'
import axios from 'axios';
const message = useMessage()

let timer: any = null
const downloading = ref<get_download_status.DownloadTask[]>([])
const pending = ref<get_download_status.DownloadTask[]>([])
const search_error = ref(false)

function get_download() {
    axios.post('/api/get_download_status', {}).then((res) => {
        res = res as AxiosResponse<get_download_status.Response>
        downloading.value = res.data.downloading
        pending.value = res.data.pending
        search_error.value = false
    }).catch(err => {
        message.error("获取下载状态失败: " + err.message)
        search_error.value = true
    })
}


onMounted(() => {
    get_download()
    timer = setInterval(() => {
        get_download()
    }, 1000)
})

onUnmounted(() => {
    clearInterval(timer)
})

</script>

<style scoped></style>