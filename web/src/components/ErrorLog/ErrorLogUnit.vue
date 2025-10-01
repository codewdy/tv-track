<template>
    <n-card :title="error.title + ' - ' + error.timestamp" closable @close="handleClose">
        <n-ellipsis expand-trigger="click" line-clamp="2">
            <pre>{{ error.error }}</pre>
        </n-ellipsis>
    </n-card>
</template>

<script setup lang="ts">
import { NCard, NEllipsis } from 'naive-ui'
import type { get_errors } from '@/schema'

const { error: error } = defineProps<{ error: get_errors.Error }>()

const emit = defineEmits<{
    (e: 'close', id: number): void
}>()

const handleClose = () => {
    emit('close', error.id)
}
</script>

<style scoped></style>