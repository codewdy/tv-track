<template>
    <n-spin :spinning="searching">
        <n-space vertical>
            <n-input v-model:value="keyword" placeholder="搜索关键字" />
            <n-button @click="search">搜索</n-button>
            <n-select v-model:value="selected_index" :options="options" />
            <n-layout has-sider v-show="selected">
                <n-layout-sider>
                    <n-image :src="selected?.cover_url" width="200px" preview-disabled>
                        <template #placeholder>
                            <div
                                style="width: 200px; height: 300px; display: flex; align-items: center; justify-content: center; background-color: #0001;">
                                loading
                            </div>
                        </template>
                    </n-image>
                </n-layout-sider>
                <n-layout-content>
                    <n-space vertical>
                        <a :href="selected?.url" target="_blank">{{ selected?.name }}</a>
                        <n-space>
                            <n-tag v-for="item in selected?.episodes || []" :key="item.name">
                                <a :href="item.url" target="_blank">{{ item.name }}</a>
                            </n-tag>
                        </n-space>
                    </n-space>
                </n-layout-content>
            </n-layout>
        </n-space>
    </n-spin>
</template>

<script setup lang="ts">
import { NInput, NButton, NImage, NSpace, NLayout, NLayoutSider, NLayoutContent, NSelect, NSpin, NTag, useMessage } from 'naive-ui'
import { ref, defineModel, computed, watch } from 'vue'
import axios from 'axios'
import type { AxiosResponse } from 'axios'
import type { db, search_tv } from '@/schema'

const keyword = ref<string>('')
const message = useMessage()
const search_result = ref<db.Source[]>([])
const selected_index = ref<number | null>(null)
const selected = ref<db.Source | null>(null)
const searching = ref<boolean>(false)
const result = defineModel<db.Source | null>("result", {
    default: null
})

watch([search_result, selected_index], ([newSearchResult, newIndex]) => {
    if (newIndex !== null && newIndex < newSearchResult.length) {
        selected.value = newSearchResult[newIndex]
    } else {
        selected.value = null
    }
})

watch([selected, searching], ([newSelected, newSearching]) => {
    if (newSelected && !newSearching) {
        result.value = newSelected
    } else {
        result.value = null
    }
})

const options = computed(() => {
    return search_result.value.map((source, index) => {
        return {
            label: source.name,
            value: index
        }
    })
})

function search() {
    if (keyword.value.length === 0) {
        return
    }
    searching.value = true
    axios.post('/api/search_tv', {
        keyword: keyword.value
    }).catch(err => {
        message.error("搜索失败: " + err.message)
        searching.value = false
    }).then(res => {
        selected_index.value = null
        res = res as AxiosResponse<search_tv.Response>
        search_result.value = res.data.source
        searching.value = false
    })
}
</script>

<style scoped></style>