<script setup lang="ts">
import {
	FEATURE_REGISTRY,
	getDefaultRewindYear,
	resolveFeaturePath
} from "#shared/config/features"

const emit = defineEmits<{
	dismiss: []
}>()

const rewindYear = getDefaultRewindYear(new Date())

const links = [
	{
		label: FEATURE_REGISTRY.rewind.label,
		icon: FEATURE_REGISTRY.rewind.icon,
		to: resolveFeaturePath("rewind", { year: rewindYear }),
		description: `Your ${rewindYear} in anime: top titles, genres and watch time.`
	},
	{
		label: FEATURE_REGISTRY.explore.label,
		icon: FEATURE_REGISTRY.explore.icon,
		to: resolveFeaturePath("explore"),
		description: "What to watch next, based on the titles you rated highest."
	},
	{
		label: FEATURE_REGISTRY.tierlist.label,
		icon: FEATURE_REGISTRY.tierlist.icon,
		to: resolveFeaturePath("tierlist"),
		description: "Rank your list into tiers and export it as an image."
	}
]
</script>

<template>
	<section
		aria-labelledby="dashboard-start-here"
		class="rounded-lg bg-white px-4 py-3 ring ring-default sm:px-6 sm:py-4 dark:bg-black">
		<div class="flex items-center justify-between gap-3">
			<h2 id="dashboard-start-here" class="text-sm font-semibold text-highlighted">
				Start here
			</h2>
			<UButton
				label="Dismiss"
				icon="i-lucide-x"
				size="sm"
				color="neutral"
				variant="ghost"
				class="-me-2 pointer-coarse:min-h-11"
				aria-label="Dismiss the Start here suggestions"
				@click="emit('dismiss')" />
		</div>
		<ul class="mt-1 grid gap-x-4 sm:grid-cols-3">
			<li v-for="link in links" :key="link.to" class="min-w-0">
				<NuxtLink
					:to="link.to"
					class="group/start -mx-2 flex min-h-11 items-center gap-3 rounded-md p-2 transition-colors hover:bg-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
					<UIcon :name="link.icon" class="size-5 shrink-0 text-primary" aria-hidden="true" />
					<span class="min-w-0 flex-1">
						<span class="block text-sm font-medium text-highlighted">{{ link.label }}</span>
						<span class="block text-xs text-pretty text-muted">{{ link.description }}</span>
					</span>
					<UIcon
						name="i-lucide-arrow-right"
						class="size-4 shrink-0 text-dimmed transition-transform group-hover/start:translate-x-0.5 motion-reduce:transition-none"
						aria-hidden="true" />
				</NuxtLink>
			</li>
		</ul>
	</section>
</template>
