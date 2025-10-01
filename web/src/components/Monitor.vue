<template>
    <slot></slot>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, provide } from 'vue'
import { useMessage } from 'naive-ui'
import axios from 'axios';
import type { AxiosResponse } from 'axios'
import type { monitor } from '../schema'

const tvs = ref<monitor.TV[]>([])
const critical_errors = ref<number>(0)
const errors = ref<number>(0)
const message = useMessage()
let timer: any = null
let version: string = ""

function reload() {
    axios.post('/api/monitor', { version: version }).catch(err => {
        message.error("获取状态失败: " + err.message)
    }).then((response) => {
        response = response as AxiosResponse<monitor.Response>
        let data = response.data
        if (data.is_new) {
            version = data.version
            tvs.value = data.tvs
            critical_errors.value = data.critical_errors
            errors.value = data.errors
        }
    })
}

onMounted(() => {
    reload()
    timer = setInterval(() => {
        reload()
    }, 10000)
})

onUnmounted(() => {
    clearInterval(timer)
})

provide('tvs', tvs)
provide('critical_errors', critical_errors)
provide('errors', errors)
provide('update_monitor', reload)

</script>

<style scoped></style>
