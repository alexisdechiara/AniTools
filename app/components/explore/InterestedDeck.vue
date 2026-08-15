<script setup lang="ts">
import type { AniListMediaSummary } from "~~/shared/types/anilist"
import { getExploreRelationBadge, getExploreTitle } from "~/utils/explore"

const props = withDefaults(defineProps<{
	addingAll?: boolean
	addingMediaIds?: readonly number[]
	canAddToPlanning?: boolean
	media?: readonly AniListMediaSummary[]
	undoDisabled?: boolean
}>(), {
	addingAll: false,
	addingMediaIds: () => [],
	canAddToPlanning: false,
	media: () => [],
	undoDisabled: true
})

const emit = defineEmits<{
	addAllToPlanning: []
	addToPlanning: [media: AniListMediaSummary]
	undo: [media: AniListMediaSummary]
	undoLast: []
}>()

const deckMedia = computed(() => [...props.media].reverse())
const addingIds = computed(() => new Set(props.addingMediaIds))

function cover(media: AniListMediaSummary): string | null {
	return media.coverImage?.extraLarge
		?? media.coverImage?.large
		?? media.coverImage?.medium
		?? null
}

function aniListUrl(media: AniListMediaSummary): string {
	return media.siteUrl ?? `https://anilist.co/anime/${media.id}`
}

function relationBadge(media: AniListMediaSummary) {
	return getExploreRelationBadge(media)
}

</script>

<template>
	<aside
		class="overflow-hidden rounded-3xl border border-default bg-default/95 shadow-lg backdrop-blur-xl"
		aria-label="Interested anime">
		<header class="space-y-3 border-b border-default p-4">
			<div class="flex items-center justify-between gap-3">
				<div class="min-w-0">
					<div class="flex items-center gap-2">
						<UIcon name="i-lucide-heart" class="size-4 text-muted" aria-hidden="true" />
						<h2 class="truncate text-sm font-semibold text-highlighted">Interested</h2>
						<UBadge :label="String(media.length)" color="neutral" variant="soft" size="sm" />
					</div>
					<p class="mt-0.5 text-xs text-muted">Your picks from this session</p>
				</div>
				<UButton
					icon="i-lucide-undo-2"
					label="Undo"
					color="error"
					variant="soft"
					size="sm"
					class="rounded-full"
					:disabled="undoDisabled"
					@click="emit('undoLast')" />
			</div>

			<UButton
				icon="i-lucide-list-plus"
				label="Add all to Plan to Watch"
				color="warning"
				variant="soft"
				size="md"
				block
				class="rounded-full"
				:loading="addingAll"
				:disabled="!canAddToPlanning || !media.length || addingAll"
				@click="emit('addAllToPlanning')" />
		</header>

		<div class="max-h-[calc(100svh-12rem)] overflow-y-auto p-3">
			<div
				v-if="!deckMedia.length"
				class="flex min-h-40 flex-col items-center justify-center gap-2 px-5 text-center">
				<div class="flex size-11 items-center justify-center rounded-full bg-elevated">
					<UIcon name="i-lucide-heart" class="size-5 text-muted" aria-hidden="true" />
				</div>
				<p class="text-sm font-medium text-highlighted">No picks yet</p>
				<p class="text-xs leading-relaxed text-muted">Swipe right and your choices will appear here.</p>
			</div>

			<TransitionGroup
				v-else
				name="interested-list"
				tag="div"
				class="space-y-2"
				data-interested-list>
				<article
					v-for="item in deckMedia"
					:key="item.id"
					data-interested-card
					class="group relative isolate flex min-h-20 overflow-hidden rounded-2xl border border-default bg-elevated/60 shadow-sm">
					<a
						:href="aniListUrl(item)"
						target="_blank"
						rel="noopener noreferrer"
						data-interested-image-link
						class="group/image relative w-16 shrink-0 overflow-hidden bg-muted"
						:aria-label="`Open ${getExploreTitle(item)} on AniList`">
						<NuxtImg
							v-if="cover(item)"
							:src="cover(item)!"
							:alt="`${getExploreTitle(item)} cover`"
							width="160"
							height="224"
							loading="lazy"
							class="size-full object-cover transition duration-200 group-hover/image:scale-105" />
						<span v-else class="flex size-full items-center justify-center">
							<UIcon name="i-lucide-image-off" class="size-5 text-muted" aria-hidden="true" />
						</span>
						<span
							data-interested-image-overlay
							class="absolute inset-0 flex items-center justify-center bg-black/55 text-white">
							<UIcon name="i-lucide-external-link" class="size-5" aria-hidden="true" />
						</span>
					</a>

					<div class="flex min-w-0 flex-1 items-center gap-2 p-2.5">
						<div class="min-w-0 flex-1">
							<p class="line-clamp-2 text-sm leading-tight font-semibold text-highlighted">
								{{ getExploreTitle(item) }}
							</p>
							<p class="mt-1 truncate text-[11px] text-muted">
								{{ item.format?.replaceAll("_", " ") || "Anime" }}
								<span v-if="item.seasonYear" aria-hidden="true"> · </span>
								{{ item.seasonYear || "" }}
							</p>
							<UTooltip
								v-if="relationBadge(item)"
								:text="relationBadge(item)!.description">
								<span class="mt-1 inline-flex text-[10px] font-medium text-toned">
									{{ relationBadge(item)!.label }}
								</span>
							</UTooltip>
						</div>

						<div data-list-actions class="flex shrink-0 flex-col items-center gap-1">
							<UTooltip text="Undo interest">
								<UButton
									icon="i-lucide-undo-2"
									aria-label="Undo interest"
									color="error"
									variant="soft"
									size="sm"
									:disabled="addingAll"
									@click="emit('undo', item)" />
							</UTooltip>
							<UTooltip v-if="canAddToPlanning" text="Add to Plan to Watch">
								<UButton
									icon="i-lucide-bookmark-plus"
									aria-label="Add to Plan to Watch"
									color="warning"
									variant="soft"
									size="sm"
									:loading="addingIds.has(item.id)"
									:disabled="addingIds.has(item.id) || addingAll"
									@click="emit('addToPlanning', item)" />
							</UTooltip>
						</div>
					</div>
				</article>
			</TransitionGroup>
		</div>
	</aside>
</template>

<style scoped>
[data-interested-card] {
	transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
}

[data-interested-card]:hover,
[data-interested-card]:focus-within {
	border-color: var(--ui-border-accented);
	transform: translateY(-1px);
	box-shadow: 0 10px 24px color-mix(in srgb, var(--ui-text) 8%, transparent);
}

[data-interested-image-overlay] {
	opacity: 0;
	transition: opacity 160ms ease;
}

[data-interested-image-link]:hover [data-interested-image-overlay],
[data-interested-image-link]:focus-visible [data-interested-image-overlay] {
	opacity: 1;
}

[data-list-actions] {
	opacity: 0.72;
	transition: opacity 160ms ease;
}

[data-interested-card]:hover [data-list-actions],
[data-interested-card]:focus-within [data-list-actions] {
	opacity: 1;
}

.interested-list-enter-active,
.interested-list-leave-active {
	transition: opacity 220ms ease, transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.interested-list-enter-from {
	opacity: 0;
	transform: translateX(1.5rem);
}

.interested-list-leave-to {
	opacity: 0;
	transform: translateX(2rem) scale(0.94);
}

@media (hover: none) {
	[data-list-actions] {
		opacity: 1;
	}
}

@media (prefers-reduced-motion: reduce) {
	[data-interested-card],
	[data-interested-image-overlay],
	[data-list-actions],
	.interested-list-enter-active,
	.interested-list-leave-active {
		transition-duration: 1ms;
	}
}
</style>
