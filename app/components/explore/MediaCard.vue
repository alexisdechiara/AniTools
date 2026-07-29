<script setup lang="ts">
import type { AniListMediaSummary } from "~~/shared/types/anilist"
import { getExploreTitle } from "~/utils/explore"

const props = defineProps<{
	media: AniListMediaSummary
}>()

const title = computed(() => getExploreTitle(props.media))
const cover = computed(() =>
	props.media.coverImage?.large
	?? props.media.coverImage?.medium
	?? props.media.coverImage?.extraLarge
)
const score = computed(() => props.media.averageScore ?? props.media.meanScore)
const aniListUrl = computed(() => `https://anilist.co/anime/${props.media.id}`)
</script>

<template>
	<article class="group overflow-hidden rounded-xl border border-default bg-elevated">
		<NuxtLink
			:to="aniListUrl"
			external
			target="_blank"
			rel="noopener noreferrer"
			class="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
			:aria-label="`Open ${title} on AniList`">
			<div class="relative aspect-[3/4] overflow-hidden bg-muted">
				<NuxtImg
					v-if="cover"
					:src="cover"
					:alt="`${title} cover`"
					width="320"
					height="426"
					loading="lazy"
					class="size-full object-cover transition duration-300 group-hover:scale-105"/>
				<div
					v-else
					class="flex size-full items-center justify-center text-muted"
					aria-hidden="true">
					<UIcon name="i-lucide-image-off" class="size-10" />
				</div>
				<UBadge
					v-if="score"
					:label="`${score}%`"
					color="neutral"
					variant="solid"
					class="absolute top-2 right-2"/>
			</div>
			<div class="space-y-2 p-3">
				<h3 class="line-clamp-2 min-h-10 text-sm font-semibold text-highlighted">
					{{ title }}
				</h3>
				<div class="flex flex-wrap gap-1">
					<UBadge
						v-if="media.format"
						:label="media.format.replaceAll('_', ' ')"
						color="primary"
						variant="soft"
						size="sm"/>
					<UBadge
						v-for="genre in media.genres.slice(0, 2)"
						:key="genre"
						:label="genre"
						color="neutral"
						variant="soft"
						size="sm"/>
				</div>
			</div>
		</NuxtLink>
	</article>
</template>
