<template>
    <n-space vertical>
        <n-button v-for="operation in system_operations" :key="operation.key" @click="run(operation.key)"
            type="primary">{{ operation.name }}</n-button>
    </n-space>
</template>

<script setup lang="ts">
import { ref, inject, onMounted } from 'vue'
import { NButton, NSpace, useMessage } from "naive-ui"
import type { get_system_operation } from '@/schema'
import axios, { type AxiosResponse } from 'axios'

const message = useMessage()

const system_operations = ref<get_system_operation.Unit[]>([])

onMounted(() => {
    load()
})

function load() {
    axios.post('/api/get_system_operation', {}).catch(err => {
        message.error("获取系统操作失败: " + err.message)
    }).then((response) => {
        response = response as AxiosResponse<get_system_operation.Response>
        let data = response.data
        system_operations.value = data.result
    })
}

function run(key: string) {
    axios.post('/api/run_system_operation', { key: key }).catch(err => {
        message.error("运行系统操作失败: " + err.message)
    }).then((response) => {
        response = response as AxiosResponse<get_system_operation.Response>
        let data = response.data
        message.success("运行系统操作成功: " + key)
    })
}

</script>