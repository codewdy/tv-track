<template>
    <n-dropdown trigger="click" :options="options" @select="updateTag">
        <n-button>{{ tag_to_name[tv.tag] || tv.tag }}</n-button>
    </n-dropdown>
</template>

<script setup lang="ts">
import { ref, inject, computed } from 'vue'
import { NDropdown, NButton, useMessage } from 'naive-ui'
import type { monitor, db } from '@/schema'
import type { Ref } from 'vue'
import axios from 'axios'

const { tv_id } = defineProps<{
    tv_id: number,
}>()
const update_tv = inject('update_tv') as (tv_id: number, updater: (tv: monitor.TV) => void) => void
const tvs = inject('tvs') as Ref<monitor.TV[]>
const tags = inject('tags') as Ref<string[]>
const tag_to_name = inject('tag_to_name') as Ref<{ [id: string]: string; }>
const message = useMessage()

const options = tags.value.map(tag => ({
    label: tag_to_name.value[tag],
    key: tag
}));

const tv = computed(() => tvs.value.find(tv => tv.id === tv_id)!)

function updateTag(tag: string) {
    if (tv.value.tag === tag) {
        return
    }
    axios.post('/api/set_tag', {
        id: tv_id,
        tag: tag
    }).catch(err => {
        message.error("设置标签失败: " + err.message)
    })
    update_tv(tv_id, (tv) => {
        tv.tag = tag
    })
}
</script>


<style scoped></style>
