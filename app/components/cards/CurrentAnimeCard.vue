<script setup lang="ts">
import { getMediaCover } from "~/utils/media-display"

const entriesStore = useEntriesStore()
const { getAllAnimes } = storeToRefs(entriesStore)

// An empty card must not claim the list is empty when the list itself is missing or partial.
const emptyMessage = computed(() => {
	if (entriesStore.error) return "Your list could not be loaded, so titles in progress cannot be shown."
	if (entriesStore.truncated) return "No title in progress in the part of your list that was loaded."
	return "Nothing on this list is marked as watching or rewatching."
})

const currentAnime = computed(() =>
	getAllAnimes.value
		.filter(entry => entry.status === "CURRENT" || entry.status === "REPEATING")
		.toSorted((left, right) =>
			(right.updatedAt ?? 0) - (left.updatedAt ?? 0)
		)
		.slice(0, 5)
)

const { title: getAnimeTitle } = useMediaTitle()

function getTitle(entry: typeof currentAnime.value[number]): string {
	return getAnimeTitle(entry.media)
}

function getCover(entry: typeof currentAnime.value[number]): string | null {
	return getMediaCover(entry.media, "small")
}

function getProgress(entry: typeof currentAnime.value[number]): string {
	const progress = entry.progress ?? 0
	const episodes = entry.media?.episodes
	return episodes ? `${progress} / ${episodes} episodes` : `${progress} episodes`
}

</script>

<template>
	<MetricsCard title="Anime in progress">
		<div class="flex size-full flex-col justify-start">
			<ul
				v-if="currentAnime.length"
				class="space-y-3">
			<li
				v-for="entry in currentAnime"
				:key="entry.id"
				class="flex min-w-0 items-center gap-3">
				<NuxtImg
					v-if="getCover(entry)"
					:src="getCover(entry) ?? undefined"
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
					<p class="truncate text-sm font-medium text-highlighted" :title="getTitle(entry)">
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
					{{ emptyMessage }}
				</p>
			</div>
		</div>
	</MetricsCard>
</template>
