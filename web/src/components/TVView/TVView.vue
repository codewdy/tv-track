<template>
    <n-space vertical>
        <NH1> {{ name }} </NH1>
        <n-space>
            <n-tag v-for="(item, index) in episodes" @click="changeEpisode(index)" :checked="index == episode_idx"
                checkable>
                {{ item.name }}
            </n-tag>
        </n-space>
        <VideoPlayer v-if="episodes !== null" :url="episodes[episode_idx]?.url ?? ''"
            v-model:current_time="current_time" :time="time" @pause="onPause" @done="onDone" />
    </n-space>
</template>


<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue';
import VideoPlayer from './VideoPlayer.vue';
import { NH1, NTag, NSpace, useMessage } from 'naive-ui';
import axios from 'axios';
import { useRoute } from 'vue-router';
import type { get_tv } from '@/schema';
import type { AxiosResponse } from 'axios';

const route = useRoute()
const message = useMessage()

const episodes = ref<get_tv.Episode[] | null>(null)

const tv_id = ref<number>(0)
const name = ref<string>("")
const episode_idx = ref<number>(0)
const time = ref<number>(0)

const current_time = ref<number>(0)
const current_time_ratio = ref<number>(0)

let latest_update_time = 0

function updateWatched(idx: number, time: number, ratio: number) {
    axios.post('/api/set_watch', {
        id: tv_id.value,
        watch: {
            watched_episode: idx,
            watched_episode_time: time,
            watched_episode_ratio: ratio,
        }
    }).catch(err => {
        message.error("更新观看时间失败: " + err.message)
    })
}


watch(() => current_time.value, (newTime) => {
    if (Math.abs(newTime - latest_update_time) > 5) {
        updateWatched(episode_idx.value, newTime, current_time_ratio.value)
        latest_update_time = newTime
    }
})

function changeEpisode(idx: number) {
    if (idx == episode_idx.value) {
        return
    }
    latest_update_time = 0
    episode_idx.value = idx
    time.value = 0
    updateWatched(episode_idx.value, 0, 0)
}

function onPause() {
    updateWatched(episode_idx.value, current_time.value, current_time_ratio.value)
}

function onDone() {
    latest_update_time = 0
    episode_idx.value++
    time.value = -1
    updateWatched(episode_idx.value, 0, 0)
}

function reload(id: number) {
    axios.post('/api/get_tv', {
        id: id
    }).catch(err => {
        message.error("获取TV信息失败: " + err.message)
    }).then(res => {
        res = res as AxiosResponse<get_tv.Response>
        tv_id.value = id
        name.value = res.data.name
        episodes.value = res.data.episodes
        episode_idx.value = res.data.watch.watched_episode
        time.value = res.data.watch.watched_episode_time
        current_time.value = res.data.watch.watched_episode_time
        current_time_ratio.value = res.data.watch.watched_episode_time_ratio
    })
}

watch(() => route.params.tv_id, (newId) => {
    reload(parseInt(newId as string))
})

onMounted(() => {
    reload(parseInt(route.params.tv_id as string))
})

</script>
