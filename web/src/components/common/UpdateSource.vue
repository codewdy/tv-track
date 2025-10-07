<template>
    <n-space vertical>
        <SearchSource v-model:result="source" />
        <n-button @click="updateEpisodeSource" :disabled="source == null">修改一集</n-button>
        <n-space>
            <n-checkbox v-model:checked="tracking" size="large">
                跟踪更新
            </n-checkbox>
            <n-checkbox v-model:checked="update_downloaded" size="large">
                重新下载
            </n-checkbox>
            <n-button @click="updateSource" :disabled="source == null">修改源</n-button>
        </n-space>
    </n-space>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import axios from 'axios'
import { NSpace, NButton, NCheckbox, useMessage } from 'naive-ui'
import SearchSource from './SearchSource.vue';
import type { db } from '@/schema';

const message = useMessage()

const { tv_id, episode_idx } = defineProps<{
    tv_id: number,
    episode_idx: number
}>()
const emit = defineEmits(["done"])

const source = ref<db.Source | null>(null)
const tracking = ref<boolean>(false)
const update_downloaded = ref<boolean>(false)

async function updateEpisodeSource() {
    if (source.value == null) {
        return
    }
    await axios.post('/api/update_episode_source', {
        id: tv_id,
        episode_idx: episode_idx,
        source: source.value.episodes[episode_idx]
    }).catch(() => {
        message.error('修改失败')
    }).then(() => {
        message.success('修改成功')
        emit("done")
    })
}

async function updateSource() {
    if (source.value == null) {
        return
    }
    source.value.tracking = tracking.value
    await axios.post('/api/update_source', {
        id: tv_id,
        update_downloaded: update_downloaded.value,
        source: source.value
    }).catch(() => {
        message.error('修改失败')
    }).then(() => {
        message.success('修改成功')
        emit("done")
    })
}


</script>
