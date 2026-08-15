<script setup lang="ts">
import type { RewindAnimeMetric } from "~/utils/rewind"

withDefaults(defineProps<{
	title: string
	items: readonly RewindAnimeMetric[]
	emptyLabel?: string
	variant?: "top" | "flop"
}>(), {
	emptyLabel: "No scored anime for this year.",
	variant: "top"
})

function getTitle(item: RewindAnimeMetric): string {
	return item.entry.media?.title?.userPreferred
		|| item.entry.media?.title?.english
		|| item.entry.media?.title?.romaji
		|| `Anime #${item.entry.media?.id ?? item.entry.id}`
}

function getCover(item: RewindAnimeMetric): string | undefined {
	return item.entry.media?.coverImage?.extraLarge
		|| item.entry.media?.coverImage?.large
		|| item.entry.media?.coverImage?.medium
		|| undefined
}

function podiumOrder(rank: number): number {
	if (rank === 1) return 2
	if (rank === 2) return 1
	return 3
}
</script>

<template>
	<MetricsCard :title="title" v-bind="$attrs">
		<ol
			v-if="items.length"
			class="mt-3 flex min-h-80 items-end justify-center gap-2 sm:gap-4">
			<li
				v-for="(item, index) in items"
				:key="item.entry.id"
				class="flex max-w-40 min-w-0 flex-1 flex-col items-center justify-end"
				:style="{ order: podiumOrder(index + 1) }">
				<AnimeDetailsPopover
					v-if="item.entry.media?.title && item.entry.media.coverImage"
					:data="item.entry"
					mode="hover"
					:open-delay="100"
					:close-delay="100"
					:draggable="false"
					:content="{ sideOffset: 16 }">
					<button
						type="button"
						class="group/poster relative mb-3 cursor-pointer overflow-hidden rounded-lg shadow-lg ring-1 ring-default transition duration-200 hover:-translate-y-1 hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
						:class="index === 0 ? 'w-24 sm:w-28' : 'w-20 sm:w-24'"
						:aria-label="`Show details for ${getTitle(item)}`">
						<NuxtImg
							:src="getCover(item)"
							:alt="getTitle(item)"
							class="aspect-2/3 w-full object-cover" />
						<div class="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/90 to-transparent px-2 pt-8 pb-2 text-left">
							<p class="line-clamp-2 text-xs font-semibold text-white">
								{{ getTitle(item) }}
							</p>
						</div>
					</button>
				</AnimeDetailsPopover>
				<div
					v-else
					class="mb-3 flex aspect-2/3 w-20 items-center justify-center rounded-lg bg-elevated sm:w-24">
					<UIcon name="i-lucide-image-off" class="size-6 text-muted" />
				</div>

				<div
					class="flex w-full flex-col items-center justify-start rounded-t-xl border border-b-0 px-2 pt-3 text-center"
					:class="[
						index === 0 ? 'h-28 border-amber-400/50 bg-amber-400/15' : '',
						index === 1 ? 'h-20 border-slate-400/50 bg-slate-400/15' : '',
						index === 2 ? 'h-14 border-orange-700/50 bg-orange-700/15' : '',
						variant === 'flop' ? 'saturate-75' : ''
					]">
					<span class="text-3xl leading-none font-black text-highlighted">
						{{ index + 1 }}
					</span>
					<span class="mt-1 text-xs font-semibold text-muted">
						{{ item.entry.score || "—" }}/100
					</span>
				</div>
			</li>
		</ol>
		<p v-else class="mt-4 text-sm text-muted">
			{{ emptyLabel }}
		</p>
	</MetricsCard>
</template>
