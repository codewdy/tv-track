<template>
    <n-select v-model:value="result" :options="watch_tag_selection" />
</template>

<script setup lang="ts">
import { computed, inject } from 'vue';
import { NSelect } from 'naive-ui';
import type { Ref } from 'vue'

const tags = inject('tags') as Ref<string[]>
const tag_to_name = inject('tag_to_name') as Ref<{ [id: string]: string; }>

const result = defineModel<string | null>("result", {
    default: null
})

const watch_tag_selection = computed(() => {
    return tags.value.map((tag: string) => ({
        label: tag_to_name.value[tag],
        value: tag,
    }))
})

</script>

<style scoped></style>