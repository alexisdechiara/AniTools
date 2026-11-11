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
const { title: getAnimeTitle } = useMediaTitle();
const { formatAiringTime: formatLocalAiringTime } = useTimeDisplay();
</script>

<template>
	<MetricsCard title="Next airing episodes">
		<div
			v-if="getNextAiringAnimesEpisodes.length"
			class="block space-y-2">
			<template
				v-for="(episode, index) in getNextAiringAnimesEpisodes"
				:key="episode.media?.id ?? episode.id">
				<AnimeDetailsPopover
v-if="episode.media?.title && episode.media.nextAiringEpisode?.airingAt && index < 4"
:data="episode"
					:content="{ sideOffset: 32 }">
					<UUser
:name="getAnimeTitle(episode.media)"
						:description="formatLocalAiringTime(new Date(episode.media.nextAiringEpisode.airingAt * 1000))"
:ui="{
							root: 'cursor-pointer transition duration-100 hover:scale-101',
							wrapper:
								'before:bg-primary before:content-[] before:h-full before:w-0.5 before:absolute before:-left-2 before:top-0 before:rounded-full',
						}"/>
				</AnimeDetailsPopover>
			</template>
		</div>
		<p
			v-else
			class="py-8 text-center text-sm text-muted">
			No upcoming episode was found for your list.
		</p>
		<UButton
v-if="showViewMore"
variant="link"
size="xs"
label="View more"
trailing-icon="i-lucide-arrow-right"
			class="ms-auto mt-auto w-fit"
to="/calendar" />
	</MetricsCard>
</template>
