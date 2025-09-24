<template>
    <n-space vertical>
        <n-input v-model:value="name" placeholder="请输入名字" />
        <n-text type="error" v-if="error">{{ error }}</n-text>
    </n-space>
</template>

<script setup lang="ts">
import { NInput, NText, NSpace } from 'naive-ui'
import { computed, ref, defineModel, watch } from 'vue'

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
    if (name === "123") {
        return '名字不能为123'
    }
    return ''
}

</script>

<style scoped></style>