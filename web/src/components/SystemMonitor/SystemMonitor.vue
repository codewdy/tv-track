<template>
    <SystemMonitorUnit :monitor_key="monitor_key" :key="monitor_key" />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router'
import SystemMonitorUnit from './SystemMonitorUnit.vue'

const route = useRoute()

const monitor_key = computed(() => route.params.monitor_key as string)
</script>