<script setup lang="ts">
import { FEATURE_REGISTRY } from "#shared/config/features"
import {
	buildRewindSummary,
	getRewindYears,
	normalizeRewindYear
} from "~/utils/rewind"
import { formatWatchTime } from "~/utils/formatTime"
import type { MetricSort } from "~/stores/Statistics"

definePageMeta({
	feature: "rewind",
	auth: FEATURE_REGISTRY.rewind.access,
	indexable: FEATURE_REGISTRY.rewind.indexable
})

const route = useRoute()
const entriesStore = useEntriesStore()
const rewindStore = useRewindStore()
const userStore = useUserStore()
const {
	getAllAnimes,
	loading: entriesLoading,
	error: entriesError
} = storeToRefs(entriesStore)
const {
	activities,
	loading: rewindLoading,
	error: rewindError,
	truncated
} = storeToRefs(rewindStore)
const currentYear = new Date().getUTCFullYear()
const genresSort = ref<MetricSort>("count")
const routeYear = computed(() => normalizeRewindYear(route.params.year, currentYear))
const selectedYear = ref(routeYear.value ?? currentYear)
const yearItems = getRewindYears(currentYear).map(value => ({
	label: String(value),
	value
}))
const loading = computed(() => entriesLoading.value || rewindLoading.value)
const error = computed(() => rewindError.value || entriesError.value)
const summary = computed(() =>
	buildRewindSummary(selectedYear.value, activities.value, getAllAnimes.value)
)
const hasData = computed(() => summary.value.activityCount > 0)
const incompleteMatches = computed(() =>
	summary.value.matchedAnimeCount < summary.value.animeCount
)

async function load(force = false) {
	await Promise.all([
		entriesStore.fetchAllAnimes(force),
		rewindStore.fetchYear(selectedYear.value, force)
	])
}

async function retry() {
	await load(true)
}

watch(selectedYear, async (value) => {
	if (value !== routeYear.value) {
		await navigateTo(`/rewind/${value}`)
	}
})

watch(routeYear, (value) => {
	if (value === null) {
		void navigateTo(`/rewind/${currentYear}`, { replace: true })
		return
	}

	selectedYear.value = value
	void load()
})

onMounted(() => {
	if (routeYear.value === null) {
		void navigateTo(`/rewind/${currentYear}`, { replace: true })
		return
	}
	void load()
})

useSeoMeta({
	title: () => `Anime Rewind ${selectedYear.value}`,
	description: () =>
		`AniList viewing activity, rankings and highlights for ${selectedYear.value}.`,
	robots: "noindex, nofollow"
})
</script>

<template>
	<UDashboardPanel :id="`rewind-${selectedYear}`">
		<template #body>
			<UContainer class="py-8 sm:py-12">
				<header class="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
					<div>
						<p class="mb-2 text-sm font-semibold text-primary">
							{{ selectedYear }}
						</p>
						<h1 class="text-3xl font-bold tracking-tight text-highlighted sm:text-4xl">
							Anime Rewind
						</h1>
						<p class="mt-2 text-sm text-muted">
							Annual AniList recap for @{{ userStore.getUsername }}
						</p>
					</div>
					<UFormField label="Year" class="w-full sm:w-36">
						<USelect
							v-model="selectedYear"
							:items="yearItems"
							value-key="value"
							class="w-full"
							aria-label="Rewind year" />
					</UFormField>
				</header>

				<div
					v-if="loading && !hasData"
					class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
					aria-label="Loading Rewind">
					<USkeleton v-for="index in 8" :key="index" class="h-40 rounded-xl" />
				</div>

				<UAlert
					v-else-if="error"
					color="error"
					variant="soft"
					icon="i-lucide-circle-alert"
					title="Unable to load this Rewind"
					:description="error"
					:actions="[{
						label: 'Retry',
						color: 'error',
						variant: 'soft',
						onClick: retry
					}]" />

				<UEmpty
					v-else-if="!hasData"
					icon="i-lucide-calendar-x-2"
					title="No AniList activity for this year"
					description="Try another year. Rewind uses anime list activity recorded by AniList."
					variant="outline" />

				<template v-else>
					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
						<MetricsCard
							title="Watch time"
							:value="formatWatchTime(summary.minutesWatched)" />
						<MetricsCard
							title="Anime watched"
							:value="summary.animeCount" />
						<MetricsCard
							title="Episodes watched"
							:value="summary.episodesWatched" />
						<MetricsCard
							title="List updates"
							:value="summary.activityCount" />
					</div>

					<div class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
						<ListCard
							v-model:sort="genresSort"
							title="Top genres"
							:list="summary.genres.slice(0, 3)"
							class="xl:col-span-1" />
						<RewindBreakdownCard
							title="Anime by season"
							:items="summary.seasons"
							:limit="4"
							class="xl:col-span-1" />
						<RewindBreakdownCard
							title="Current list status"
							:items="summary.statuses"
							:limit="6"
							class="lg:col-span-2 xl:col-span-2" />

						<RewindAnimeRankingCard
							title="Top 3 anime"
							:items="summary.topAnime"
							class="xl:col-span-2" />
						<RewindAnimeRankingCard
							title="Flop 3 anime"
							:items="summary.flopAnime"
							empty-label="No scored anime to rank for this year."
							class="xl:col-span-2" />

						<RewindHighlightsCard
							:selection="summary.selection"
							:longest="summary.longestAnime"
							class="lg:col-span-2 xl:col-span-4" />
						<ActivityOverviewCard
							:year="selectedYear"
							:activity-counts="summary.activityCounts"
							show-days
							show-months
							class="lg:col-span-2 xl:col-span-4" />
					</div>

					<UAlert
						v-if="truncated || incompleteMatches"
						class="mt-4"
						color="warning"
						variant="soft"
						icon="i-lucide-triangle-alert"
						title="Partial annual recap"
						:description="truncated
							? 'AniList returned more than 1,000 list updates for this year. The recap is limited to the newest 1,000 updates to protect the API rate limit.'
							: 'Some anime from the activity feed are no longer present in the current AniList list, so genre and watch-time details cannot be reconstructed for them.'" />

					<UAlert
						class="mt-4"
						color="neutral"
						variant="subtle"
						icon="i-lucide-info"
						title="How this recap is calculated"
						description="Episode totals are reconstructed from AniList list-update ranges. Scores and list statuses reflect the current list, while the activity calendar is bounded to the selected UTC year." />
				</template>
			</UContainer>
		</template>
	</UDashboardPanel>
</template>
