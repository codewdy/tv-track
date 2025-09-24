<template>
    <div style="max-width: 800px;">
        <p> 添加TV </p>
        <n-divider title-placement="left">
            输入名字
        </n-divider>
        <TVName v-model:result="name" :key="key" />
        <n-divider title-placement="left">
            选择TV源
        </n-divider>
        <SearchSource v-model:result="source" :key="key" />
        <n-button type="primary" @click="addTV" :disabled="!name || !source">完成</n-button>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { NDivider, NButton, useMessage } from 'naive-ui'
import TVName from './TVName.vue'
import SearchSource from './SearchSource.vue'
import type { db } from '@/schema'
import axios from 'axios'

const message = useMessage()

const name = ref<string | null>(null)
const source = ref<db.Source | null>(null)
const key = ref<number>(1)

function addTV() {
    if (!name.value || !source.value) {
        return
    }
    axios.post('/api/add_tv', {
        name: name.value,
        source: source.value,
    }).catch(err => {
        message.error("添加失败: " + err.message)
    }).then(res => {
        message.success("添加成功")
        name.value = null
        source.value = null
        key.value++
    })

}
</script>

<style scoped></style>