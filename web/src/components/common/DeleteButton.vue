<template>
    <n-button type="error" @click="deleteTV">删除</n-button>
</template>

<script setup lang="ts">
import { inject, computed } from 'vue'
import { NButton, useMessage, useDialog } from 'naive-ui'
import type { monitor } from '@/schema'
import type { Ref } from 'vue'
import axios from 'axios'

const { tv_id } = defineProps<{
    tv_id: number,
}>()
const tvs = inject('tvs') as Ref<monitor.TV[]>
const message = useMessage()
const dialog = useDialog()
const remove_tv = inject('remove_tv') as (tv_id: number) => void

const tv = computed(() => tvs.value.find(tv => tv.id === tv_id)!)

function deleteTV() {
    dialog.create({
        title: '删除确认',
        content: '是否确认删除: ' + tv.value.name,
        positiveText: '删除',
        negativeText: '算了',
        draggable: true,
        onPositiveClick: () => {
            remove_tv(tv_id)
            axios.post('/api/remove_tv', {
                id: tv_id
            }).catch(err => {
                message.error("删除失败: " + err.message)
            })
        },
        onNegativeClick: () => {
        }
    })
}
</script>


<style scoped></style>
