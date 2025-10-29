<template>
    <n-space>
        <n-button type="primary" @click="type = 'video'">
            视频
        </n-button>
        <n-button type="primary" @click="type = 'audio'">
            音频
        </n-button>
    </n-space>
    <VideoPlayer :url="video_url" :time="tv.watch.watched_episode_time" v-model:current_time="current_time"
        v-model:current_time_ratio="current_time_ratio" v-model:playing="playing" @pause="onPause" @done="onDone" />
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { NButton, NSpace } from 'naive-ui';
import VideoPlayer from './VideoPlayer.vue'
import type { db, get_tv } from '@/schema';

const tv = defineModel<get_tv.Response>("tv", { required: true })
const playing = defineModel<boolean>("playing", { default: false })
const { updateWatched } = defineProps<{
    updateWatched: (ep_id: number, time: number, ratio: number) => void
}>()

const current_time = ref<number>(0)
const current_time_ratio = ref<number>(0)
const type = ref<string>("video")

let latest_update_time = 0

let video_url = computed(() => type.value === "video"
    ? tv.value.episodes[tv.value.watch.watched_episode]?.url ?? ''
    : tv.value.episodes[tv.value.watch.watched_episode]?.audio_url ?? '')

watch(() => type.value, (newType) => {
    tv.value.watch.watched_episode_time = -current_time.value
})

watch(() => tv.value.watch, (newWatch: db.WatchStatus) => {
    latest_update_time = newWatch.watched_episode_time
    current_time.value = newWatch.watched_episode_time
    current_time_ratio.value = newWatch.watched_episode_time_ratio
})

watch(() => current_time.value, (newTime) => {
    if (Math.abs(newTime - latest_update_time) > 5) {
        updateWatched(tv.value.watch.watched_episode, newTime, current_time_ratio.value)
        latest_update_time = newTime
    }
})

function onPause() {
    updateWatched(tv.value.watch.watched_episode, current_time.value, current_time_ratio.value)
}

function onDone() {
    latest_update_time = 0
    tv.value.watch.watched_episode++
    tv.value.watch.watched_episode_time = -1000000
    tv.value.watch.watched_episode_time_ratio = 0
    updateWatched(tv.value.watch.watched_episode, 0, 0)
}

</script>