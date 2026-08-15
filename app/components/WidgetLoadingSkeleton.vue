<script setup lang="ts">
type WidgetSkeletonVariant = "chart" | "list" | "media" | "metric" | "poster" | "timeline"

const props = withDefaults(defineProps<{
	label?: string
	variant?: WidgetSkeletonVariant
}>(), {
	label: "Loading widget",
	variant: "chart"
})

const minimumHeightClass = computed(() => {
	if (props.variant === "metric") return "min-h-28"
	if (props.variant === "poster") return "min-h-64"
	if (props.variant === "media") return "min-h-64"
	if (props.variant === "timeline") return "min-h-28"
	return "min-h-40"
})
</script>

<template>
	<div
		class="relative size-full overflow-hidden rounded-xl border border-default bg-elevated p-4"
		data-widget-skeleton
		:class="minimumHeightClass"
		role="status"
		aria-live="polite"
		aria-busy="true">
		<span class="sr-only">{{ label }}</span>
		<div class="flex items-center justify-between gap-4" aria-hidden="true">
			<span data-skeleton-block class="h-3 w-24 rounded-full" />
			<span data-skeleton-block class="size-6 rounded-md" />
		</div>

		<div v-if="variant === 'metric'" class="mt-5 space-y-3" aria-hidden="true">
			<span data-skeleton-block class="block h-8 w-28 rounded-lg" />
			<span data-skeleton-block class="block h-2 w-20 rounded-full opacity-70" />
		</div>

		<div v-else-if="variant === 'list'" class="mt-5 space-y-3" aria-hidden="true">
			<div v-for="index in 4" :key="index" class="flex items-center gap-3">
				<span data-skeleton-block class="size-8 shrink-0 rounded-lg" />
				<span data-skeleton-block class="h-3 rounded-full" :class="index % 2 ? 'w-2/3' : 'w-4/5'" />
			</div>
		</div>

		<div v-else-if="variant === 'poster'" class="mt-4 space-y-3" aria-hidden="true">
			<span data-skeleton-block class="block aspect-[3/4] w-full rounded-lg" />
			<span data-skeleton-block class="block h-3 w-4/5 rounded-full" />
			<span data-skeleton-block class="block h-3 w-1/2 rounded-full opacity-75" />
		</div>

		<div v-else-if="variant === 'media'" class="mt-5 flex gap-4" aria-hidden="true">
			<span data-skeleton-block class="aspect-[3/4] w-24 shrink-0 rounded-lg" />
			<div class="flex-1 space-y-3 pt-2">
				<span data-skeleton-block class="block h-4 w-4/5 rounded-full" />
				<span data-skeleton-block class="block h-3 w-3/5 rounded-full opacity-80" />
				<span data-skeleton-block class="mt-7 block h-8 w-24 rounded-lg" />
			</div>
		</div>

		<div v-else-if="variant === 'timeline'" class="mt-5 flex gap-3" aria-hidden="true">
			<span data-skeleton-block class="size-12 shrink-0 rounded-lg" />
			<div class="flex-1 space-y-3">
				<span data-skeleton-block class="block h-3 w-3/4 rounded-full" />
				<span data-skeleton-block class="block h-3 w-1/2 rounded-full opacity-75" />
			</div>
		</div>

		<div v-else class="mt-6 flex h-24 items-end gap-2" aria-hidden="true">
			<span
				v-for="index in 8"
				:key="index"
				data-skeleton-block
				class="flex-1 rounded-t-md"
				:style="{ height: `${28 + ((index * 17) % 68)}%` }" />
		</div>
		<span data-widget-shimmer class="pointer-events-none absolute inset-0" aria-hidden="true" />
	</div>
</template>

<style scoped>
[data-skeleton-block] {
	display: block;
	background: color-mix(in srgb, var(--ui-bg-accented) 78%, transparent);
	animation: skeleton-pulse 1.5s ease-in-out infinite;
}

[data-widget-shimmer] {
	background: linear-gradient(
		105deg,
		transparent 30%,
		color-mix(in srgb, var(--ui-bg) 56%, transparent) 46%,
		transparent 62%
	);
	transform: translateX(-115%);
	animation: skeleton-shimmer 1.65s ease-in-out infinite;
}

@keyframes skeleton-pulse {
	50% { opacity: 0.42; }
}

@keyframes skeleton-shimmer {
	100% { transform: translateX(115%); }
}

@media (prefers-reduced-motion: reduce) {
	[data-skeleton-block],
	[data-widget-shimmer] {
		animation: none;
	}
}
</style>
