<template>
    <pre>{{ result }}</pre>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import axios, { type AxiosResponse } from 'axios'
import { useMessage } from 'naive-ui'
import type { get_system_monitor } from '@/schema'

const message = useMessage()

const { monitor_key } = defineProps<{ monitor_key: string }>()

const result = ref<string>('')
let cancelled: boolean = false

function fetch_result() {
    if (cancelled) {
        return
    }
    axios.post('/api/get_system_monitor', { key: monitor_key }).catch(err => {
        message.error("获取系统监控失败: " + err.message)
    }).then((response) => {
        response = response as AxiosResponse<get_system_monitor.Response>
        let data = response.data
        result.value = data.result
        if (data.interval > 0) {
            setTimeout(fetch_result, data.interval * 1000)
        }
    })
}

onMounted(() => {
    fetch_result()
})

onUnmounted(() => {
    cancelled = true
})

</script>
