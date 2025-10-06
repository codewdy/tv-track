<template>
    <n-space vertical>
        <NH1> {{ tv.name }} </NH1>
        <n-breadcrumb>
            <n-breadcrumb-item :clickable="false">
                {{ tv.name }}
            </n-breadcrumb-item>
            <n-breadcrumb-item :clickable="true" separator="">
                <n-dropdown :options="options" trigger="click" :menu-props="dorpdown_menu" @select="changeEpisode">
                    <div class="trigger">
                        {{ tv.episodes[tv.watch.watched_episode]?.name ?? "" }}
                    </div>
                </n-dropdown>
            </n-breadcrumb-item>
            <n-breadcrumb-item :clickable="false">
            </n-breadcrumb-item>
        </n-breadcrumb>
        <n-collapse>
            <n-collapse-item title="选集" name="select">
                <n-space>
                    <n-tag v-for="(item, index) in tv.episodes" @click="changeEpisode(index)"
                        :checked="index == tv.watch.watched_episode" checkable>
                        {{ to_text(item) }}
                    </n-tag>
                </n-space>
            </n-collapse-item>
        </n-collapse>
    </n-space>
</template>


<script setup lang="ts">
import { computed } from 'vue'
import type { get_tv } from '@/schema';
import type { DropdownOption, DropdownGroupOption } from 'naive-ui'
import { NH1, NTag, NSpace, NCollapse, NCollapseItem, NBreadcrumb, NBreadcrumbItem, NDropdown, NIcon } from 'naive-ui';

const tv = defineModel<get_tv.Response>("tv", { required: true })
const { updateWatched } = defineProps<{
    updateWatched: (ep_id: number, time: number, ratio: number) => void
}>()


const options = computed(() => {
    return tv.value.episodes.map((item, index) => {
        return {
            label: to_text(item),
            key: index
        }
    }) ?? []
})

function changeEpisode(index: number) {
    tv.value.watch.watched_episode = index
    tv.value.watch.watched_episode_time = 0
    tv.value.watch.watched_episode_time_ratio = 0
    updateWatched(index, 0, 0)
}

function to_text(item: get_tv.Episode) {
    const STATUS = {
        "running": " (-)",
        "success": "",
        "failed": " (x)"
    }
    return item.name + STATUS[item.download_status]
}

function dorpdown_menu(option: DropdownOption | undefined, options: (DropdownOption | DropdownGroupOption)[]) {
    return {
        "style": "max-height: 60vh;overflow-y:auto"
    }
}

</script>
