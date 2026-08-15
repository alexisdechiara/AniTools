<script setup lang="ts">
import { FEATURE_REGISTRY } from "#shared/config/features"
import StatisticsPageShell from "~/components/statistics/StatisticsPageShell.vue"

definePageMeta({
	feature: "statistics-overview",
	auth: FEATURE_REGISTRY["statistics-overview"].access,
	indexable: FEATURE_REGISTRY["statistics-overview"].indexable
})
</script>

<template>
	<StatisticsPageShell
		v-slot="{ entriesLoading, statisticsLoading }"
		page-id="statistics"
		allow-partial>
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-12">
			<WidgetLoadingGate
				:loading="statisticsLoading"
				label="Loading watch time"
				variant="metric"
				class="xl:col-span-3">
				<WatchTimeCard class="h-full" />
			</WidgetLoadingGate>
			<WidgetLoadingGate
				:loading="statisticsLoading"
				label="Loading anime count"
				variant="metric"
				class="xl:col-span-3">
				<AnimesWatchedCard class="h-full" />
			</WidgetLoadingGate>
			<WidgetLoadingGate
				:loading="statisticsLoading"
				label="Loading episode count"
				variant="metric"
				class="xl:col-span-3">
				<EpisodesWatchedCard class="h-full" />
			</WidgetLoadingGate>
			<WidgetLoadingGate
				:loading="statisticsLoading"
				label="Loading status chart"
				class="sm:row-span-2 xl:col-span-3 xl:row-span-2">
				<StatusDonutCard title="Status" class="h-full" />
			</WidgetLoadingGate>
			<WidgetLoadingGate
				:loading="statisticsLoading"
				label="Loading score distribution"
				class="sm:col-span-2 xl:col-span-9">
				<MeanScoreBarCard class="h-full" />
			</WidgetLoadingGate>
			<WidgetLoadingGate
				:loading="statisticsLoading"
				label="Loading genres"
				variant="list"
				class="xl:col-span-4">
				<GenresCard class="h-full" />
			</WidgetLoadingGate>
			<WidgetLoadingGate
				:loading="statisticsLoading"
				label="Loading tags"
				variant="list"
				class="xl:col-span-4">
				<TagsCard class="h-full" />
			</WidgetLoadingGate>
			<WidgetLoadingGate
				:loading="statisticsLoading"
				label="Loading studios"
				variant="list"
				class="xl:col-span-4">
				<StudiosCard class="h-full" />
			</WidgetLoadingGate>
			<WidgetLoadingGate
				:loading="entriesLoading"
				label="Loading highlights"
				variant="media"
				class="sm:col-span-2 xl:col-span-8">
				<HighlightCard class="h-full" />
			</WidgetLoadingGate>
			<WidgetLoadingGate
				:loading="statisticsLoading"
				label="Loading countries"
				class="sm:col-span-1 xl:col-span-4">
				<CountriesDonutCard class="h-full" />
			</WidgetLoadingGate>
			<WidgetLoadingGate
				:loading="statisticsLoading"
				label="Loading watch years"
				class="sm:col-span-2 xl:col-span-6">
				<WatchYearLineCard class="h-full" />
			</WidgetLoadingGate>
			<WidgetLoadingGate
				:loading="statisticsLoading"
				label="Loading release years"
				class="sm:col-span-2 xl:col-span-6">
				<ReleaseYearsLineCard class="h-full" />
			</WidgetLoadingGate>
			<WidgetLoadingGate
				:loading="statisticsLoading"
				label="Loading formats"
				class="sm:col-span-2 xl:col-span-4">
				<FormatsDonutCard class="h-full" />
			</WidgetLoadingGate>
		</div>
	</StatisticsPageShell>
</template>
