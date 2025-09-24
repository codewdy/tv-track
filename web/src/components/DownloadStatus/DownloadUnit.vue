<template>
    <n-card :title="download.resource">
        {{ download.status }}
    </n-card>
</template>

<script setup lang="ts">
import { defineProps } from 'vue'
import { NCard } from 'naive-ui'
import type { get_download_status } from '@/schema'
const { download } = defineProps<{
    download: get_download_status.DownloadTask
}>()


</script>

<style scoped></style>