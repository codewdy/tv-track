<template>
    <n-select v-model:value="result" :options="watch_tag_selection" />
</template>

<script setup lang="ts">
import { db } from '@/schema'
import { WatchTagName } from '@/constant'
import { computed, ref } from 'vue';
import { NSelect } from 'naive-ui';

const result = defineModel<string | null>("result", {
    default: db.WatchTag.Wanted
})

const watch_tag_selection = computed(() => {
    return Object.entries(WatchTagName).map(([key, value]) => ({
        label: value,
        value: key,
    }))
})

</script>

<style scoped></style>