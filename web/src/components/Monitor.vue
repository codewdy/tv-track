<template>
    <slot></slot>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, provide } from 'vue'
import { useMessage } from 'naive-ui'
import axios from 'axios';
import type { AxiosResponse } from 'axios'
import type { monitor, get_config } from '../schema'

const tvs = ref<monitor.TV[]>([])
const critical_errors = ref<number>(0)
const errors = ref<number>(0)
const watched_ratio = ref<number>(0)
const tags = ref<string[]>([])
const tag_to_name = ref<{ [id: string]: string; }>({})

const message = useMessage()
let timer: any = null
let version: string = ""

function update_tv(tv_id: number, updater: (tv: monitor.TV) => void) {
    let tv = tvs.value.find((tv) => tv.id === tv_id)
    if (tv) {
        updater(tv)
        tvs.value = [tv, ...tvs.value.filter(t => t.id != tv_id)]
    }
}

function remove_tv(tv_id: number) {
    tvs.value = tvs.value.filter(t => t.id != tv_id)
}

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

function load_config() {
    axios.post('/api/get_config', {}).catch(err => {
        message.error("获取配置失败: " + err.message)
    }).then((response) => {
        response = response as AxiosResponse<get_config.Response>
        let data = response.data
        watched_ratio.value = data.watched_ratio
        tags.value = data.tags.map((t: get_config.TagConfig) => t.tag)
        tag_to_name.value = data.tags.reduce((acc: { [id: string]: string; }, cur: get_config.TagConfig) => {
            acc[cur.tag] = cur.name
            return acc
        }, {})
    })
}

onMounted(() => {
    load_config()
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
provide('watched_ratio', watched_ratio)
provide('tags', tags)
provide('tag_to_name', tag_to_name)
provide('update_tv', update_tv)
provide('remove_tv', remove_tv)

</script>

<style scoped></style>
