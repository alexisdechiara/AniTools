<script setup lang="ts">
import { FEATURE_REGISTRY } from "#shared/config/features"
import RewindAnimeRankingCard from "~/components/rewind/AnimeRankingCard.vue"
import RewindBreakdownCard from "~/components/rewind/BreakdownCard.vue"
import RewindHighlightsCard from "~/components/rewind/HighlightsCard.vue"
import RewindStatusDonutCard from "~/components/rewind/RewindStatusDonutCard.vue"
import {
	buildRewindSummary,
	getRewindYears,
	normalizeRewindYear
} from "~/utils/rewind"
import { formatWatchTime } from "~/utils/formatTime"
import { sortStatistics } from "~/utils/statistics"
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
	year: loadedYear,
	loading: rewindLoading,
	error: rewindError,
	truncated
} = storeToRefs(rewindStore)
const currentYear = new Date().getUTCFullYear()
const genresSort = ref<MetricSort>("count")
const tagsSort = ref<MetricSort>("count")
const routeYear = computed(() => normalizeRewindYear(route.params.year, currentYear))
const selectedYear = ref(routeYear.value ?? currentYear)
const yearItems = getRewindYears(currentYear).map(value => ({
	label: String(value),
	value
}))
const error = computed(() => rewindError.value || entriesError.value)
const summary = computed(() =>
	buildRewindSummary(selectedYear.value, activities.value, getAllAnimes.value)
)
const genreItems = computed(() =>
	sortStatistics(summary.value.genres, genresSort.value, 5)
)
const tagItems = computed(() =>
	sortStatistics(summary.value.tags, tagsSort.value, 5)
)
const hasData = computed(() => summary.value.activityCount > 0)
const incompleteMatches = computed(() =>
	summary.value.matchedAnimeCount < summary.value.animeCount
)
const entriesSettled = computed(() =>
	entriesStore.isInitialized
	|| (!entriesLoading.value && Boolean(entriesError.value))
)
const rewindSettled = computed(() =>
	(!rewindLoading.value && loadedYear.value === selectedYear.value)
	|| (!rewindLoading.value && Boolean(rewindError.value))
)
const { showPageLoader } = useProgressiveLoading(
	computed(() => [entriesSettled.value, rewindSettled.value]),
	{
		allowPartial: false,
		cycleKey: selectedYear
	}
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
			<UContainer class="pb-8 sm:pb-12">
				<UPageHero
					title="Anime Rewind"
					:description="`@${userStore.getUsername}`"
					:ui="{
						container: 'pt-0 pb-6 sm:pt-0 sm:pb-8 lg:pt-0 lg:pb-10',
						headline: 'w-full justify-center'
					}">
					<template #headline>
						<USelect
							v-model="selectedYear"
							:items="yearItems"
							value-key="value"
							variant="ghost"
							size="sm"
							class="w-28"
							:ui="{
								base: 'cursor-pointer rounded-none border-b border-dashed border-primary/50 font-semibold text-primary hover:border-primary hover:bg-primary/10',
								trailingIcon: 'hidden'
							}"
							aria-label="Rewind year" />
					</template>
				</UPageHero>

				<PageLoadingState
					v-if="showPageLoader"
					label="Building your Anime Rewind"
					:description="`Matching your ${selectedYear} activity with your AniList collection.`" />

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

					<div class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-12">
						<ListCard
							v-model:sort="genresSort"
							title="Top genres"
							:list="genreItems"
							class="xl:col-span-4" />
						<ListCard
							v-model:sort="tagsSort"
							title="Top tags"
							:list="tagItems"
							class="xl:col-span-4" />
						<RewindBreakdownCard
							title="Anime by season"
							:items="summary.seasons"
							:limit="4"
							class="xl:col-span-4" />
						<RewindStatusDonutCard
							:items="summary.statuses"
							class="xl:col-span-4" />
						<RewindHighlightsCard
							:selection="summary.selection"
							:longest="summary.longestAnime"
							class="xl:col-span-8" />

						<RewindAnimeRankingCard
							title="Top 3 anime"
							:items="summary.topAnime"
							class="xl:col-span-6" />
						<RewindAnimeRankingCard
							title="Flop 3 anime"
							:items="summary.flopAnime"
							variant="flop"
							empty-label="No scored anime to rank for this year."
							class="xl:col-span-6" />
						<ActivityOverviewCard
							:year="selectedYear"
							:activity-counts="summary.activityCounts"
							show-days
							show-months
							class="lg:col-span-2 xl:col-span-12" />
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
