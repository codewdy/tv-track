<template>
    <n-collapse :default-expanded-names="['critical', 'error']">
        <n-collapse-item title="CRITICAL" name="critical">
            <n-space vertical>
                <n-button @click="handleClose(errors.critical_errors.map(error => error.id))">
                    清除所有
                </n-button>
                <ErrorLogUnit v-for="error in errors.critical_errors" :key="error.id" :error="error"
                    @close="(id) => handleClose([id])" />
            </n-space>
        </n-collapse-item>
        <n-collapse-item title="ERROR" name="error">
            <n-space vertical>
                <n-button @click="handleClose(errors.errors.map(error => error.id))">
                    清除所有
                </n-button>
                <ErrorLogUnit v-for="error in errors.errors" :key="error.id" :error="error"
                    @close="(id) => handleClose([id])" />
            </n-space>
        </n-collapse-item>
    </n-collapse>
</template>

<script setup lang="ts">
import axios from 'axios';
import type { AxiosResponse } from 'axios'
import type { get_errors } from '@/schema'
import { ref, onMounted, inject } from 'vue'
import type { Ref } from 'vue'
import { useMessage, NCollapse, NCollapseItem, NSpace, NButton } from 'naive-ui'
import ErrorLogUnit from './ErrorLogUnit.vue'

const critical_errors_num = inject<Ref<number>>('critical_errors') as Ref<number>
const errors_num = inject<Ref<number>>('errors') as Ref<number>


const errors = ref<get_errors.Response>({
    critical_errors: [],
    errors: []
})
const message = useMessage()

function handleClose(ids: number[]) {
    errors.value.critical_errors = errors.value.critical_errors.filter(error => !ids.includes(error.id))
    errors.value.errors = errors.value.errors.filter(error => !ids.includes(error.id))
    critical_errors_num.value = errors.value.critical_errors.length
    errors_num.value = errors.value.errors.length
    axios.post('/api/clear_errors', { ids: ids }).catch(err => {
        message.error("清除错误日志失败: " + err.message)
    })
}

onMounted(() => {
    axios.post('/api/get_errors', {}).catch(err => {
        message.error("获取错误日志失败: " + err.message)
    }).then((response) => {
        response = response as AxiosResponse<get_errors.Response>
        errors.value = response.data
        critical_errors_num.value = errors.value.critical_errors.length
        errors_num.value = errors.value.errors.length
    })
})
</script>

<style scoped></style>