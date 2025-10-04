<template>
    <n-space>
        <n-card>
            <template #cover>
                <a :href="'/tv-view/' + tv.id">
                    <img :src="tv.icon_url" class="card-cover">
                </a>
            </template>
            <n-h2 class="card-name">
                <a :href="'/tv-view/' + tv.id">{{ tv.name }}</a>
            </n-h2>

            <p class="card-watch"> 观看： {{ watched_episode(tv.watch, watched_ratio) }} / {{ tv.total_episodes }}</p>
            <n-space>
                <WatchTag :tv_id="tv.id" />
                <DeleteButton :tv_id="tv.id" />
            </n-space>
        </n-card>
    </n-space>
</template>

<script setup lang="ts">
import { inject } from 'vue'
import { NH2, NCard, NButton, NSpace } from 'naive-ui'
import { watched_episode } from '@/utils'
import type { monitor } from '@/schema'
import type { Ref } from 'vue'
import WatchTag from '@/components/common/WatchTag.vue'
import DeleteButton from '@/components/common/DeleteButton.vue'

const { tv } = defineProps<{
    tv: monitor.TV,
}>()
const watched_ratio = inject<Ref<number>>('watched_ratio') as Ref<number>

</script>


<style scoped>
.n-card {
    max-width: 200px;
}

.card-name {
    margin: 10px 0px 0px 0px;
}

.card-fullname {
    margin: 0px 0px 0px 0px;
}

.card-watch {
    margin: 0px 0px 10px 0px;
}

.card-cover {
    width: 100%;
    aspect-ratio: 3 / 4;
    object-fit: cover;
}
</style>
