<template>
  <UPageCard :title="title" :ui="{title: 'text-xs capitalize text-toned font-medium', container: 'gap-y-2' }">
		<div class="flex h-fit items-center">
		<span class="text-2xl font-semibold text-highlighted text-ellipsis">
			{{ value }}
		</span>
		<div v-if="change" class="ms-auto text-xs font-normal inline-flex items-center gap-x-1.5 h-fit" :class="change > 0 ? 'text-success-600' : 'text-error-600'">
			<div class="inline-flex gap-x-0.5">
				{{ change > 0 ? "+" : "-" }}
				<span>{{ Math.abs(change).toFixed(2) }}</span>
				{{ changeUnit }}
			</div>
			<Icon v-if="showChangeIcon" :name="change > 0 ? 'i-lucide-trending-up' : 'i-lucide-trending-down'" />
		</div>
		</div>
		<slot />
	</UPageCard>
</template>

<script lang="ts" setup>

const props = withDefaults(defineProps<{
	title?: string
	value?: string | number
	change?: number
	changeUnit?: string | "%"
	showChangeIcon?: boolean
}>(),{
	changeUnit: "%",
	showChangeIcon: true,
})

</script>
