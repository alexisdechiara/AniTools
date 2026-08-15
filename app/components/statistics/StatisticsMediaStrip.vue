<script setup lang="ts">
const props = withDefaults(defineProps<{
	mediaIds: readonly number[]
	limit?: number
}>(), {
	limit: 8
})

const entriesStore = useEntriesStore()

const media = computed(() =>
	entriesStore
		.getAnimesByMediaIds([...props.mediaIds], props.limit)
		.flatMap((entry) => {
			if (!entry.media) return []

			return [{
				id: entry.media.id,
				title: entry.media.title?.userPreferred
					?? entry.media.title?.english
					?? entry.media.title?.romaji
					?? `Anime #${entry.media.id}`,
				cover: entry.media.coverImage?.large
					?? entry.media.coverImage?.medium
					?? null,
				url: entry.media.siteUrl ?? `https://anilist.co/anime/${entry.media.id}`,
				color: entry.media.coverImage?.color ?? undefined
			}]
		})
)
</script>

<template>
	<div
		v-if="media.length"
		class="flex gap-2 overflow-x-auto border-t border-default px-4 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-5"
		aria-label="Anime represented in this statistic">
		<NuxtLink
			v-for="anime in media"
			:key="anime.id"
			:to="anime.url"
			external
			target="_blank"
			rel="noopener noreferrer"
			class="group relative aspect-[2/3] w-16 shrink-0 overflow-hidden rounded-lg bg-muted shadow-sm ring-1 ring-default transition hover:-translate-y-0.5 hover:ring-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:w-[4.5rem]"
			:aria-label="`Open ${anime.title} on AniList`"
			:style="anime.color ? { backgroundColor: anime.color } : undefined">
			<NuxtImg
				v-if="anime.cover"
				:src="anime.cover"
				:alt="anime.title"
				width="144"
				height="216"
				loading="lazy"
				class="size-full object-cover transition duration-200 group-hover:scale-105"/>
			<span
				v-else
				class="flex size-full items-center justify-center"
				aria-hidden="true">
				<UIcon name="i-lucide-image-off" class="size-5 text-muted"/>
			</span>
		</NuxtLink>
	</div>
</template>
