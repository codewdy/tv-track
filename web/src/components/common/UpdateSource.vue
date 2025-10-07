<template>
    <SearchSource v-model:result="source" />
    <n-button @click="updateEpisodeSource" :disabled="source == null">修改一集</n-button>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import axios from 'axios'
import { NButton, useMessage } from 'naive-ui'
import SearchSource from './SearchSource.vue';
import type { db } from '@/schema';

const message = useMessage()

const { tv_id, episode_idx } = defineProps<{
    tv_id: number,
    episode_idx: number
}>()
const emit = defineEmits(["done"])

const source = ref<db.Source | null>(null)

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


</script>
