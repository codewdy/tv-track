<template>
    <n-collapse>
        <n-collapse-item title="设置" name="setting">
            <n-space>
                <WatchTag :tv_id="tv_id" />
                <DeleteButton :tv_id="tv_id" />
            </n-space>
        </n-collapse-item>
    </n-collapse>
</template>

<script setup lang="ts">
import DeleteButton from '@/components/common/DeleteButton.vue'
import WatchTag from '@/components/common/WatchTag.vue'
import { NCollapse, NCollapseItem, NSpace } from 'naive-ui'

const { tv_id } = defineProps<{
    tv_id: number
}>()
</script>