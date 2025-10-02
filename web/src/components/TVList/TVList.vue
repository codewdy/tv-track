<template>
    <n-space vertical>
        <n-input v-model:value="search_keyword" placeholder="搜索" />
        <n-collapse :default-expanded-names="WatchTagKeys">
            <n-collapse-item v-for="tag in WatchTagKeys" :key="tag" :title="WatchTagName[tag]" :name="tag">
                <n-space>
                    <TVCard :tv="tv" v-for="tv in filtered_tvs.filter(t => t.tag === tag)" :key="tv.id" />
                </n-space>
            </n-collapse-item>
        </n-collapse>
    </n-space>
</template>

<script setup lang="ts">
import { ref, inject, computed } from 'vue'
import TVCard from './TVCard.vue'
import { NSpace, NCollapse, NCollapseItem, NInput } from "naive-ui"
import type { monitor } from '@/schema'
import type { Ref } from 'vue'
import { WatchTagName, WatchTagKeys } from '@/constant'

const tvs = inject('tvs') as Ref<monitor.TV[]>

const search_keyword = ref('')

const filtered_tvs = computed(() => {
    if (search_keyword.value) {
        return tvs.value.filter(tv => tv.name.includes(search_keyword.value))
    }
    return tvs.value
})

</script>

<style scoped></style>