<template>
    <p v-if="url === ''"> 看完了！ </p>
    <p v-if="url !== ''"> 当前视频源: {{ url }} </p>
    <div :style="`width: 100%; max-width: ${width}px; margin: 0 auto; border: 1px solid black; float: left;`">
        <div ref="videoRef"></div>
    </div>
</template>

<script setup lang="ts">
import XGPlayer, { Events } from 'xgplayer';
import 'xgplayer/dist/index.min.css';
import { watch, onMounted, onUnmounted, ref, defineProps, defineEmits, defineModel } from 'vue';

const { url = '', width = 800, time = 0 } = defineProps(['url', 'width', 'time'])
const current_time = defineModel('current_time', { default: 0 })
const current_time_ratio = defineModel('current_time_ratio', { default: 0 })
const playing = defineModel('playing', { default: false })
const emit = defineEmits(['done', 'pause'])

let player: XGPlayer | null = null;
const videoRef = ref();

watch(() => [url, time], ([newUrl, newTime]) => {
    if (player) {
        let autoplay = false;
        if (newTime < 0) {
            newTime = 0
            autoplay = true
        }
        player.src = newUrl || "http://"
        player.currentTime = newTime
        if (autoplay && newUrl !== '') {
            player.play()
        }
        playing.value = autoplay
    }
})

onMounted(() => {
    player = new XGPlayer({
        el: videoRef.value,
        url: url,
        fluid: true,
        startTime: time,
        playnext: {
            urlList: ["http://"]
        },
        screenShot: true, //显示截图按钮
        videoAttributes: {
            crossOrigin: 'anonymous'
        },
        volume: parseFloat(localStorage.getItem('video_player_volume') || '0.6'),
    });
    player.muted = localStorage.getItem('video_player_muted') === 'true'

    player.on(Events.TIME_UPDATE, () => {
        player = player as XGPlayer
        current_time.value = player.currentTime
        current_time_ratio.value = player.currentTime / player.duration
    })
    player.on(Events.PLAYING, () => {
        playing.value = true
    })
    player.on(Events.PAUSE, () => {
        playing.value = false
        if (url !== '') {
            emit('pause')
        }
    })
    player.on(Events.ENDED, () => {
        if (url !== '') {
            emit('done')
        }
    })
    player.on(Events.PLAYNEXT, () => {
        if (url !== '') {
            emit('done')
        }
    })
    player.on(Events.VOLUME_CHANGE, (volume) => {
        player = player as XGPlayer
        localStorage.setItem('video_player_volume', player.volume.toString())
        localStorage.setItem('video_player_muted', player.muted.toString())
    })
})

onUnmounted(() => {
    player?.destroy()
    player = null
})

</script>

<style scoped></style>