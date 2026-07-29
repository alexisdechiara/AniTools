<script setup lang="ts">
import type { RewindAnimeMetric } from "~/utils/rewind"
import { formatWatchTime } from "~/utils/formatTime"

withDefaults(defineProps<{
	title: string
	items: readonly RewindAnimeMetric[]
	emptyLabel?: string
}>(), {
	emptyLabel: "No scored anime for this year."
})

function getTitle(item: RewindAnimeMetric): string {
	return item.entry.media?.title?.userPreferred
		|| item.entry.media?.title?.english
		|| item.entry.media?.title?.romaji
		|| `Anime #${item.entry.media?.id ?? item.entry.id}`
}

function getCover(item: RewindAnimeMetric): string | undefined {
	return item.entry.media?.coverImage?.large
		|| item.entry.media?.coverImage?.medium
		|| undefined
}
</script>

<template>
	<MetricsCard :title="title" v-bind="$attrs">
		<ol v-if="items.length" class="mt-2 space-y-3">
			<li
				v-for="(item, index) in items"
				:key="item.entry.id"
				class="flex items-center gap-3">
				<span
					class="flex size-7 shrink-0 items-center justify-center rounded-full bg-elevated text-xs font-semibold text-muted">
					{{ index + 1 }}
				</span>
				<NuxtImg
					v-if="getCover(item)"
					:src="getCover(item)"
					:alt="getTitle(item)"
					class="h-14 w-10 shrink-0 rounded-sm object-cover" />
				<div
					v-else
					class="flex h-14 w-10 shrink-0 items-center justify-center rounded-sm bg-elevated">
					<Icon name="i-lucide-image-off" class="size-4 text-muted" />
				</div>
				<div class="min-w-0 flex-1">
					<NuxtLink
						v-if="item.entry.media?.siteUrl"
						:to="item.entry.media.siteUrl"
						target="_blank"
						rel="noopener noreferrer"
						class="line-clamp-2 text-sm font-medium text-highlighted hover:text-primary">
						{{ getTitle(item) }}
					</NuxtLink>
					<p v-else class="line-clamp-2 text-sm font-medium text-highlighted">
						{{ getTitle(item) }}
					</p>
					<p class="mt-1 text-xs text-muted">
						{{ item.entry.score || "—" }}/100 ·
						{{ item.episodes }} ep ·
						{{ formatWatchTime(item.minutesWatched) }}
					</p>
				</div>
			</li>
		</ol>
		<p v-else class="mt-4 text-sm text-muted">
			{{ emptyLabel }}
		</p>
	</MetricsCard>
</template>
