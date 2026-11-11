<script setup lang="ts">
import { FEATURE_REGISTRY } from "#shared/config/features"
import StatisticsPageShell from "~/components/statistics/StatisticsPageShell.vue"

definePageMeta({
	feature: "statistics-overview",
	auth: FEATURE_REGISTRY["statistics-overview"].access,
	indexable: FEATURE_REGISTRY["statistics-overview"].indexable
})

// The chart cards pull in unovis, which Node cannot import as ES modules during
// server rendering. They are loaded lazily and only in the browser; each one
// falls back to the skeleton of its loading gate so the layout does not move.
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
				<ClientOnly>
					<LazyStatusDonutCard title="Status" class="h-full" />
					<template #fallback>
						<WidgetLoadingSkeleton label="Loading status chart" />
					</template>
				</ClientOnly>
			</WidgetLoadingGate>
			<WidgetLoadingGate
				:loading="statisticsLoading"
				label="Loading score distribution"
				class="sm:col-span-2 xl:col-span-9">
				<ClientOnly>
					<LazyMeanScoreBarCard class="h-full" />
					<template #fallback>
						<WidgetLoadingSkeleton label="Loading score distribution" />
					</template>
				</ClientOnly>
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
				<ClientOnly>
					<LazyCountriesDonutCard class="h-full" />
					<template #fallback>
						<WidgetLoadingSkeleton label="Loading countries" />
					</template>
				</ClientOnly>
			</WidgetLoadingGate>
			<WidgetLoadingGate
				:loading="statisticsLoading"
				label="Loading watch years"
				class="sm:col-span-2 xl:col-span-6">
				<ClientOnly>
					<LazyWatchYearLineCard class="h-full" />
					<template #fallback>
						<WidgetLoadingSkeleton label="Loading watch years" />
					</template>
				</ClientOnly>
			</WidgetLoadingGate>
			<WidgetLoadingGate
				:loading="statisticsLoading"
				label="Loading release years"
				class="sm:col-span-2 xl:col-span-6">
				<ClientOnly>
					<LazyReleaseYearsLineCard class="h-full" />
					<template #fallback>
						<WidgetLoadingSkeleton label="Loading release years" />
					</template>
				</ClientOnly>
			</WidgetLoadingGate>
			<WidgetLoadingGate
				:loading="statisticsLoading"
				label="Loading formats"
				class="sm:col-span-2 xl:col-span-4">
				<ClientOnly>
					<LazyFormatsDonutCard class="h-full" />
					<template #fallback>
						<WidgetLoadingSkeleton label="Loading formats" />
					</template>
				</ClientOnly>
			</WidgetLoadingGate>
		</div>
	</StatisticsPageShell>
</template>
