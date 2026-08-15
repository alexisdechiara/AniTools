<script setup lang="ts">
import type { AniListStatisticMetric } from "~~/shared/types/anilist"
import StatisticsBreakdown from "~/components/statistics/StatisticsBreakdown.vue"
import StatisticsPageShell from "~/components/statistics/StatisticsPageShell.vue"
import {
	aggregateEntriesByDimension,
	getStatisticsCompletionYears,
	type StatisticsBreakdownItem,
	type StatisticsDimension
} from "~/utils/statistics-breakdown"

const props = defineProps<{
	pageId: string
	dimension: StatisticsDimension
}>()

const entriesStore = useEntriesStore()
const statisticsStore = useStatisticsStore()
const { getAllAnimes } = storeToRefs(entriesStore)
const { genres, tags, studios } = storeToRefs(statisticsStore)
const selectedPeriod = ref("all")
const selectedMetric = ref<"count" | "meanScore" | "minutesWatched">("count")

const completionYears = computed(() =>
	getStatisticsCompletionYears(getAllAnimes.value)
)
const periodOptions = computed(() => [
	{ label: "All time", value: "all" },
	...completionYears.value.map(year => ({
		label: `Completed in ${year}`,
		value: String(year)
	}))
])
const selectedYear = computed(() => {
	if (selectedPeriod.value === "all") return undefined
	const year = Number(selectedPeriod.value)
	return Number.isInteger(year) ? year : undefined
})

function mapMetric(
	metric: AniListStatisticMetric,
	key: string,
	name: string
): StatisticsBreakdownItem {
	return {
		key,
		name,
		count: metric.count,
		meanScore: metric.meanScore,
		minutesWatched: metric.minutesWatched,
		mediaIds: metric.mediaIds
	}
}

const allTimeItems = computed<StatisticsBreakdownItem[]>(() => {
	if (props.dimension === "genres") {
		return (genres.value ?? [])
			.filter(item => item.genre !== null)
			.map(item => mapMetric(item, item.genre ?? "", item.genre ?? "Unknown genre"))
	}

	if (props.dimension === "tags") {
		return (tags.value ?? [])
			.filter(item => item.tag !== null)
			.map(item => mapMetric(
				item,
				String(item.tag?.id ?? ""),
				item.tag?.name ?? "Unknown tag"
			))
	}

	return (studios.value ?? [])
		.filter(item => item.studio !== null)
		.map(item => mapMetric(
			item,
			String(item.studio?.id ?? ""),
			item.studio?.name ?? "Unknown studio"
		))
})
const items = computed(() =>
	selectedYear.value === undefined
		? allTimeItems.value
		: aggregateEntriesByDimension(
			getAllAnimes.value,
			props.dimension,
			selectedYear.value
		)
)
const previousItems = computed(() =>
	selectedYear.value === undefined
		? []
		: aggregateEntriesByDimension(
			getAllAnimes.value,
			props.dimension,
			selectedYear.value - 1
		)
)
const comparisonLabel = computed(() =>
	selectedYear.value === undefined ? "" : String(selectedYear.value - 1)
)
</script>

<template>
	<StatisticsPageShell
		:page-id="pageId">
		<div class="space-y-4">
			<div class="flex flex-col gap-3 rounded-xl border border-default bg-muted/20 px-4 py-3 sm:flex-row sm:items-center">
				<div class="flex min-w-0 items-center gap-3">
					<span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
						<UIcon name="i-lucide-calendar-range" class="size-4"/>
					</span>
					<div class="min-w-0">
						<p class="text-sm font-medium text-highlighted">
							Period
						</p>
						<p class="truncate text-xs text-muted">
							Compare completed titles with the previous year.
						</p>
					</div>
				</div>
				<USelect
					v-model="selectedPeriod"
					:items="periodOptions"
					aria-label="Statistics period"
					class="w-full sm:ml-auto sm:w-52"/>
			</div>

			<StatisticsBreakdown
				v-model:metric="selectedMetric"
				:dimension="dimension"
				:items="items"
				:previous-items="previousItems"
				:comparison-label="comparisonLabel"/>
		</div>
	</StatisticsPageShell>
</template>
