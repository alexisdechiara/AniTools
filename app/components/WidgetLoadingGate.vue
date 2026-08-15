<script setup lang="ts">
defineOptions({ inheritAttrs: false })

withDefaults(defineProps<{
	label?: string
	loading: boolean
	variant?: "chart" | "list" | "media" | "metric" | "poster" | "timeline"
}>(), {
	label: "Loading widget",
	variant: "chart"
})
</script>

<template>
	<div
		v-bind="$attrs"
		class="min-w-0"
		:aria-busy="loading || undefined">
		<Transition name="widget-ready" mode="out-in">
			<WidgetLoadingSkeleton
				v-if="loading"
				key="loading"
				:label="label"
				:variant="variant" />
			<div v-else key="content" class="h-full">
				<slot />
			</div>
		</Transition>
	</div>
</template>

<style scoped>
.widget-ready-enter-active,
.widget-ready-leave-active {
	transition: opacity 180ms ease, transform 180ms ease;
}

.widget-ready-enter-from,
.widget-ready-leave-to {
	opacity: 0;
	transform: translateY(4px);
}

@media (prefers-reduced-motion: reduce) {
	.widget-ready-enter-active,
	.widget-ready-leave-active {
		transition: none;
	}
}
</style>
