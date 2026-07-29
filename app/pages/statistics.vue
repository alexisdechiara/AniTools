<script setup lang="ts">
import { FEATURE_REGISTRY } from "#shared/config/features"

definePageMeta({
	feature: "statistics-overview",
	auth: FEATURE_REGISTRY["statistics-overview"].access,
	indexable: FEATURE_REGISTRY["statistics-overview"].indexable
})
</script>

<template>
	<StatisticsPageShell
		page-id="statistics"
		title="Overview"
		description="A responsive overview of your complete AniList anime history. Open a breakdown to explore genres, tags or studios in more detail.">
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-12">
			<WatchTimeCard class="xl:col-span-3" />
			<AnimesWatchedCard class="xl:col-span-3" />
			<EpisodesWatchedCard class="xl:col-span-3" />
			<StatusDonutCard
				title="Status"
				class="sm:row-span-2 xl:col-span-3 xl:row-span-2"/>
			<MeanScoreBarCard class="sm:col-span-2 xl:col-span-9" />
			<GenresCard class="xl:col-span-4" />
			<TagsCard class="xl:col-span-4" />
			<StudiosCard class="xl:col-span-4" />
			<HighlightCard class="sm:col-span-2 xl:col-span-8" />
			<CountriesDonutCard class="sm:col-span-1 xl:col-span-4" />
			<WatchYearLineCard class="sm:col-span-2 xl:col-span-6" />
			<ReleaseYearsLineCard class="sm:col-span-2 xl:col-span-6" />
			<FormatsDonutCard class="sm:col-span-2 xl:col-span-4" />
		</div>
	</StatisticsPageShell>
</template>
