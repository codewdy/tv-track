<template>
    <n-space vertical>
        <TVViewHead v-model:tv="tv" :updateWatched="updateWatched" />
        <TVViewWatch v-model:tv="tv" :updateWatched="updateWatched" />
        <TVViewSetting :tv_id="tv_id" />
    </n-space>
</template>

<script setup lang="ts">
import { inject, ref, onMounted, watch } from 'vue';
import type { db, get_tv, monitor } from '@/schema';
import axios from 'axios';
import type { AxiosResponse } from 'axios';
import { useMessage, NSpace } from 'naive-ui'
import { useRoute } from 'vue-router';
import TVViewWatch from './TVViewWatch.vue';
import TVViewSetting from './TVViewSetting.vue';
import TVViewHead from './TVViewHead.vue';

const route = useRoute()
const message = useMessage()

const tv_id = ref<number>(0)
const tv = ref<get_tv.Response>({
    name: "",
    tag: "watching" as db.WatchTag,
    watch: {
        watched_episode: 0,
        watched_episode_time: 0,
        watched_episode_time_ratio: 0,
    },
    episodes: [],
})

const update_tv = inject('update_tv') as (tv_id: number, updater: (tv: monitor.TV) => void) => void

function updateWatched(ep_id: number, time: number, ratio: number) {
    console.log("updateWatched", ep_id, time, ratio)
    if (isNaN(ratio)) {
        ratio = 0
    }
    update_tv(tv_id.value, (tv) => {
        tv.watch.watched_episode = ep_id
        tv.watch.watched_episode_time = time
        tv.watch.watched_episode_time_ratio = ratio
    })
    axios.post('/api/set_watch', {
        id: tv_id.value,
        watch: {
            watched_episode: ep_id,
            watched_episode_time: time,
            watched_episode_time_ratio: ratio,
        }
    }).catch(err => {
        message.error("更新观看时间失败: " + err.message)
    })
}

function reload(id: number) {
    axios.post('/api/get_tv', {
        id: id
    }).catch(err => {
        message.error("获取TV信息失败: " + err.message)
    }).then(res => {
        res = res as AxiosResponse<get_tv.Response>
        tv_id.value = id
        tv.value = res.data
    })
}

watch(() => route.params.tv_id, (newId) => {
    reload(parseInt(newId as string))
})

onMounted(() => {
    reload(parseInt(route.params.tv_id as string))
})


</script>
