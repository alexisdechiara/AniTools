<script setup lang="ts">
const { getAllAnimes } = storeToRefs(useEntriesStore())

const currentAnime = computed(() =>
	getAllAnimes.value
		.filter(entry => entry.status === "CURRENT" || entry.status === "REPEATING")
		.toSorted((left, right) =>
			(right.updatedAt ?? 0) - (left.updatedAt ?? 0)
		)
		.slice(0, 5)
)

function getTitle(entry: typeof currentAnime.value[number]): string {
	return entry.media?.title?.userPreferred
		?? entry.media?.title?.english
		?? entry.media?.title?.romaji
		?? "Untitled anime"
}

function getProgress(entry: typeof currentAnime.value[number]): string {
	const progress = entry.progress ?? 0
	const episodes = entry.media?.episodes
	return episodes ? `${progress} / ${episodes} episodes` : `${progress} episodes`
}
</script>

<template>
	<MetricsCard title="Anime in progress">
		<ul
			v-if="currentAnime.length"
			class="space-y-3">
			<li
				v-for="entry in currentAnime"
				:key="entry.id"
				class="flex min-w-0 items-center gap-3">
				<NuxtImg
					v-if="entry.media?.coverImage?.medium"
					:src="entry.media.coverImage.medium"
					:alt="`${getTitle(entry)} cover`"
					class="size-11 shrink-0 rounded-md object-cover"
					width="44"
					height="44"/>
				<div
					v-else
					class="flex size-11 shrink-0 items-center justify-center rounded-md bg-elevated"
					aria-hidden="true">
					<UIcon
						name="i-lucide-image-off"
						class="size-5 text-muted"/>
				</div>
				<div class="min-w-0 flex-1">
					<p class="truncate text-sm font-medium text-highlighted">
						{{ getTitle(entry) }}
					</p>
					<p class="text-xs text-muted">
						{{ getProgress(entry) }}
					</p>
				</div>
				<UBadge
					v-if="entry.status === 'REPEATING'"
					label="Rewatching"
					color="neutral"
					variant="soft"
					size="sm"/>
			</li>
		</ul>
		<div
			v-else
			class="flex min-h-40 flex-col items-center justify-center gap-2 text-center">
			<UIcon
				name="i-lucide-circle-pause"
				class="size-7 text-muted"/>
			<p class="text-sm text-muted">
				No anime is currently marked as watching.
			</p>
		</div>
	</MetricsCard>
</template>
