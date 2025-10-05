<template>
    <div style="max-width: 800px;">
        <p> 添加TV </p>
        <n-divider title-placement="left">
            选择TV源
        </n-divider>
        <SearchSource v-model:result="source" />
        <n-divider title-placement="left">
            信息
        </n-divider>
        <n-space vertical>
            <TVName v-model:name="raw_name" v-model:result="name" :key="key" />
            <n-space>
                <p>选择标签:</p>
                <WatchTag v-model:result="watch_tag" :key="key" style="width: 100px;" />
            </n-space>
            <n-checkbox v-model:checked="tracking">
                跟踪更新
            </n-checkbox>
        </n-space>
        <n-divider title-placement="left">
            确认
        </n-divider>
        <n-button type="primary" @click="addTV" :disabled="!name || !source || !watch_tag">完成</n-button>
    </div>
</template>

<script setup lang="ts">
import { ref, watch, inject } from 'vue'
import { NDivider, NButton, useMessage, NSpace, NCheckbox } from 'naive-ui'
import TVName from './TVName.vue'
import SearchSource from './SearchSource.vue'
import WatchTag from './WatchTag.vue'
import type { db } from '@/schema'
import axios from 'axios'

const message = useMessage()
const update_monitor = inject('update_monitor') as () => void

const raw_name = ref<string>("")
const name = ref<string | null>(null)
const source = ref<db.Source | null>(null)
const tracking = ref<boolean>(false)
const watch_tag = ref<string | null>(null)
const key = ref<number>(1)

watch(source, (newSource: db.Source | null) => {
    if (newSource) {
        raw_name.value = newSource.title
    }
})

function addTV() {
    if (!name.value || !source.value || !watch_tag.value) {
        return
    }
    source.value.tracking = tracking.value
    axios.post('/api/add_tv', {
        name: name.value,
        source: source.value,
        tag: watch_tag.value,
    }).catch(err => {
        message.error("添加失败: " + err.message)
    }).then(res => {
        message.success("添加成功")
        raw_name.value = ""
        name.value = null
        tracking.value = false
        watch_tag.value = null
        key.value++
        update_monitor()
    })

}
</script>

<style scoped></style>