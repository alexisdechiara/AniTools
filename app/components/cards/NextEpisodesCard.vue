<script lang="ts" setup>
withDefaults(
	defineProps<{
		showViewMore?: boolean;
	}>(),
	{
		showViewMore: true,
	}
);

const { getNextAiringAnimesEpisodes } = storeToRefs(useEntriesStore());
</script>

<template>
	<MetricsCard title="Next airing episodes">
		<div v-if="getNextAiringAnimesEpisodes" class="block space-y-2">
			<template v-for="(episode, index) in getNextAiringAnimesEpisodes" :key="episode!.media?.id">
				<AnimeDetailsPopover :data="episode" :content="{ sideOffset: 32 }"
					v-if="episode?.media?.title && episode?.media?.nextAiringEpisode?.airingAt && index < 4">
					<UUser :name="episode!.media.title.english || episode!.media.title.romaji || ''"
						:description="new Date(episode!.media.nextAiringEpisode.airingAt * 1000).toLocaleString()" :ui="{
							root: 'cursor-pointer transition duration-100 hover:scale-101',
							wrapper:
								'before:bg-primary before:content-[] before:h-full before:w-0.5 before:absolute before:-left-2 before:top-0 before:rounded-full',
						}">
					</UUser>
				</AnimeDetailsPopover>
			</template>
		</div>
		<p v-else class="text-center">Aucun episode à venir</p>
		<UButton v-if="showViewMore" variant="link" size="xs" label="View more" trailing-icon="i-lucide-arrow-right"
			class="w-fit ms-auto mt-auto" to="/calendar" />
	</MetricsCard>
</template>
