<script setup lang="ts">
import type { RewindBreakdown } from "~/utils/rewind"

const props = withDefaults(defineProps<{
	title: string
	items: readonly RewindBreakdown[]
	limit?: number
	emptyLabel?: string
}>(), {
	limit: 6,
	emptyLabel: "No data for this year."
})

const visibleItems = computed(() => props.items.slice(0, props.limit))
const maxCount = computed(() =>
	Math.max(0, ...visibleItems.value.map(item => item.count))
)

function getProgress(count: number): number {
	return maxCount.value > 0 ? Math.round(count / maxCount.value * 100) : 0
}

function formatLabel(value: string): string {
	return value
		.toLocaleLowerCase("en")
		.replaceAll("_", " ")
		.replace(/(^|\s)\p{L}/gu, character => character.toLocaleUpperCase("en"))
}
</script>

<template>
	<MetricsCard :title="title" v-bind="$attrs">
		<ul v-if="visibleItems.length" class="mt-3 space-y-3">
			<li v-for="item in visibleItems" :key="item.name">
				<div class="mb-1.5 flex items-center justify-between gap-3 text-xs">
					<span class="truncate font-medium text-highlighted">
						{{ formatLabel(item.name) }}
					</span>
					<span class="shrink-0 text-muted">
						{{ item.count }} {{ item.count === 1 ? "anime" : "anime" }}
					</span>
				</div>
				<UProgress :model-value="getProgress(item.count)" size="sm" />
			</li>
		</ul>
		<p v-else class="mt-4 text-sm text-muted">
			{{ emptyLabel }}
		</p>
	</MetricsCard>
</template>
