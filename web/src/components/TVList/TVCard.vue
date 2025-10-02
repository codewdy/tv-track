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
                <n-dropdown trigger="hover" :options="options" @select="updateTag">
                    <n-button>{{ WatchTagName[tv.tag] }}</n-button>
                </n-dropdown>
                <n-button type="error" @click="deleteTV">删除</n-button>
            </n-space>
        </n-card>
    </n-space>
</template>

<script setup lang="ts">
import { ref, inject } from 'vue'
import { NH2, NCard, NDropdown, NButton, NSpace, useMessage, useDialog } from 'naive-ui'
import { WatchTagName, WatchTagKeys } from '@/constant'
import { watched_episode } from '@/utils'
import type { monitor, db } from '@/schema'
import type { Ref } from 'vue'
import axios from 'axios'

const message = useMessage()
const dialog = useDialog()
const update_tv = inject('update_tv') as (tv_id: number, updater: (tv: monitor.TV) => void) => void
const remove_tv = inject('remove_tv') as (tv_id: number) => void
const { tv } = defineProps<{
    tv: monitor.TV,
}>()
const watched_ratio = inject<Ref<number>>('watched_ratio') as Ref<number>

const options = WatchTagKeys.map(status => ({
    label: WatchTagName[status],
    key: status
}));

function updateTag(tag: string) {
    if (tv.tag === tag) {
        return
    }
    axios.post('/api/set_tag', {
        id: tv.id,
        tag: tag as db.WatchTag
    }).catch(err => {
        message.error("设置标签失败: " + err.message)
    })
    update_tv(tv.id, (tv) => {
        tv.tag = tag as db.WatchTag
    })
}

function deleteTV() {
    dialog.create({
        title: '删除确认',
        content: '是否确认删除: ' + tv.name,
        positiveText: '删除',
        negativeText: '算了',
        draggable: true,
        onPositiveClick: () => {
            remove_tv(tv.id)
            axios.post('/api/remove_tv', {
                id: tv.id
            }).catch(err => {
                message.error("删除失败: " + err.message)
            })
        },
        onNegativeClick: () => {
        }
    })
}

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
