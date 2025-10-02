<template>
    <n-space vertical>
        <n-input v-model:value="name" placeholder="请输入名字" :status="error ? 'error' : undefined" />
        <n-text type="error" v-if="error">{{ error }}</n-text>
    </n-space>
</template>

<script setup lang="ts">
import { NInput, NText, NSpace } from 'naive-ui'
import { computed, ref, defineModel, watch, inject } from 'vue'
import type { monitor } from '@/schema'
import type { Ref } from 'vue'

const tvs = inject('tvs') as Ref<monitor.TV[]>
const name = ref<string>('')

const error = computed(() => {
    return validateName(name.value)
})

const result = defineModel<string | null>("result", {
    default: null
})

watch(name, (newName: string) => {
    const error = validateName(newName)
    if (error) {
        result.value = null
    } else {
        result.value = newName
    }
})

function validateName(name: string): string {
    if (name.length === 0) {
        return '请输入名字'
    }
    // TODO: Check name not in db
    if (tvs.value.some((tv) => tv.name === name)) {
        return '名字已存在'
    }
    return ''
}

</script>

<style scoped></style>