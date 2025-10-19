<template>
    <n-space vertical>
        <n-input v-model:value="search_keyword" placeholder="搜索" />
        <n-divider />
        <n-collapse :default-expanded-names="tags">
            <n-collapse-item v-for="tag in tags" :key="tag" :title="tag_to_name[tag]" :name="tag">
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
import { NSpace, NCollapse, NCollapseItem, NInput, NDivider } from "naive-ui"
import type { monitor } from '@/schema'
import type { Ref } from 'vue'

const tvs = inject('tvs') as Ref<monitor.TV[]>
const tags = inject('tags') as Ref<string[]>
const tag_to_name = inject('tag_to_name') as Ref<{ [id: string]: string; }>

const search_keyword = ref('')

const filtered_tvs = computed(() => {
    if (search_keyword.value) {
        return tvs.value.filter(tv => tv.name.includes(search_keyword.value))
    }
    return tvs.value
})

</script>

<style scoped></style>