<script setup lang="ts">
withDefaults(defineProps<{
	title: string
	eyebrow?: string
	description?: string
	/** Keeps the heading for assistive technology on dense tool pages without taking space. */
	visuallyHidden?: boolean
}>(), {
	eyebrow: undefined,
	description: undefined,
	visuallyHidden: false
})
</script>

<template>
	<h1 v-if="visuallyHidden" class="sr-only">
		{{ title }}
	</h1>
	<header v-else class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
		<div class="min-w-0">
			<p v-if="eyebrow" class="text-sm font-medium text-primary">
				{{ eyebrow }}
			</p>
			<h1 class="text-2xl font-semibold tracking-tight text-balance text-highlighted sm:text-3xl">
				{{ title }}
			</h1>
			<p v-if="description" class="mt-1 max-w-[60ch] text-sm text-pretty text-muted sm:text-base">
				{{ description }}
			</p>
		</div>
		<div v-if="$slots.actions" class="flex flex-wrap gap-2">
			<slot name="actions" />
		</div>
	</header>
</template>
