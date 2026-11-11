<script setup lang="ts">
import { FEATURE_REGISTRY } from "#shared/config/features"
import RewindAnimeRankingCard from "~/components/rewind/AnimeRankingCard.vue"
import RewindBreakdownCard from "~/components/rewind/BreakdownCard.vue"
import RewindHighlightsCard from "~/components/rewind/HighlightsCard.vue"
import RewindStatusDonutCard from "~/components/rewind/RewindStatusDonutCard.vue"
import { formatNumber } from "~/utils/format"
import { formatWatchTime } from "~/utils/formatTime"
import { getMediaCover } from "~/utils/media-display"
import {
	buildRewindSummary,
	getRewindYears,
	normalizeRewindYear
} from "~/utils/rewind"
import {
	buildRewindHeadline,
	buildRewindSupportingLine,
	getPreviousRewindYear,
	getRewindTruncationNote,
	getRewindUnmatchedNote
} from "~/utils/rewind-display"
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

const { title: getAnimeTitle } = useMediaTitle()
const topAnime = computed(() => summary.value.topAnime[0] ?? null)
const topAnimeTitle = computed(() => {
	const entry = topAnime.value?.entry
	return entry ? getAnimeTitle(entry.media ?? { id: entry.id }) : null
})
// The hero cover is at most 208 CSS px wide: AniList's biggest cover keeps it sharp at 2x.
const topAnimeCover = computed(() => getMediaCover(topAnime.value?.entry.media, "large"))
const headline = computed(() => buildRewindHeadline({
	year: selectedYear.value,
	minutesWatched: summary.value.minutesWatched,
	animeCount: summary.value.animeCount,
	episodesWatched: summary.value.episodesWatched,
	activityCount: summary.value.activityCount
}))
const supportingLine = computed(() => buildRewindSupportingLine({
	topTitle: topAnimeTitle.value,
	topGenre: summary.value.genres[0]?.name
}))
const truncationNote = getRewindTruncationNote()
const unmatchedNote = computed(() =>
	getRewindUnmatchedNote(summary.value.animeCount, summary.value.matchedAnimeCount)
)
const previousYear = computed(() => getPreviousRewindYear(selectedYear.value))
const stats = computed(() => [
	{ id: "watch-time", label: "Watch time", value: formatWatchTime(summary.value.minutesWatched) },
	{ id: "anime", label: "Anime watched", value: formatNumber(summary.value.animeCount) },
	{ id: "episodes", label: "Episodes watched", value: formatNumber(summary.value.episodesWatched) }
])

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
	// The stores record failures in `error`, which this page renders.
	await Promise.allSettled([
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
				<header class="flex flex-col gap-1">
					<div class="flex flex-wrap items-center gap-x-4 gap-y-2">
						<h1 class="text-3xl font-bold tracking-tight text-highlighted sm:text-4xl">
							Anime Rewind
						</h1>
						<USelect
							v-model="selectedYear"
							:items="yearItems"
							value-key="value"
							variant="soft"
							color="primary"
							size="xl"
							class="w-36 sm:w-40"
							:ui="{
								base: 'cursor-pointer rounded-full text-2xl font-bold text-primary tabular-nums sm:text-3xl',
								trailingIcon: 'text-primary'
							}"
							aria-label="Rewind year" />
					</div>
					<p class="text-sm text-muted">
						@{{ userStore.getUsername }}
					</p>
				</header>

				<PageLoadingState
					v-if="showPageLoader"
					class="mt-6"
					label="Building your Anime Rewind"
					:description="`Matching your ${selectedYear} activity with your AniList collection.`" />

				<UAlert
					v-else-if="error"
					class="mt-6"
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
					class="mt-6"
					icon="i-lucide-calendar-x-2"
					title="No AniList activity for this year"
					description="Try another year. Rewind uses anime list activity recorded by AniList."
					variant="outline"
					:actions="previousYear ? [{
						label: `See ${previousYear}`,
						icon: 'i-lucide-arrow-left',
						color: 'neutral',
						variant: 'soft',
						to: `/rewind/${previousYear}`
					}] : []" />

				<template v-else>
					<section
						class="mt-6 overflow-hidden rounded-2xl bg-white ring ring-default dark:bg-black"
						aria-label="Your year in one sentence"
						data-rewind-hero>
						<div
							class="grid items-center gap-8 p-6 sm:p-10"
							:class="topAnimeCover ? 'md:grid-cols-[minmax(0,1fr)_auto]' : ''">
							<div class="min-w-0">
								<p
									class="max-w-[22ch] text-3xl leading-tight font-bold tracking-tight text-balance text-highlighted sm:text-5xl"
									data-rewind-headline>
									<span
										v-for="(part, index) in headline"
										:key="index"
										:class="part.emphasis ? 'text-primary tabular-nums' : ''">{{ part.text }}</span>
								</p>
								<p
									v-if="supportingLine"
									class="mt-4 max-w-[60ch] text-base text-pretty text-muted sm:text-lg">
									{{ supportingLine }}
								</p>
							</div>
							<figure
								v-if="topAnimeCover"
								class="mx-auto w-40 rotate-3 sm:w-52 md:me-4">
								<NuxtImg
									:src="topAnimeCover"
									:alt="`${topAnimeTitle} cover, your highest-rated title of ${selectedYear}`"
									width="208"
									height="312"
									fit="cover"
									format="webp"
									loading="eager"
									class="aspect-2/3 w-full rounded-xl object-cover shadow-xl ring-1 ring-default" />
							</figure>
						</div>
					</section>

					<ul
						v-if="truncated || unmatchedNote"
						class="mt-3 space-y-1 text-sm text-muted"
						data-rewind-notes>
						<li v-if="truncated" class="flex items-start gap-2">
							<UIcon name="i-lucide-info" class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
							<span>{{ truncationNote }}</span>
						</li>
						<li v-if="unmatchedNote" class="flex items-start gap-2">
							<UIcon name="i-lucide-info" class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
							<span>{{ unmatchedNote }}</span>
						</li>
					</ul>

					<section class="mt-12" aria-labelledby="rewind-numbers">
						<h2 id="rewind-numbers" class="mb-4 text-xl font-semibold tracking-tight text-highlighted">
							The year in numbers
						</h2>
						<dl class="grid divide-y divide-default rounded-xl bg-white ring ring-default sm:grid-cols-3 sm:divide-x sm:divide-y-0 dark:bg-black">
							<div
								v-for="stat in stats"
								:key="stat.id"
								class="flex flex-col gap-1 p-5 sm:p-6"
								:data-rewind-stat="stat.id">
								<dt class="text-xs font-medium text-toned">
									{{ stat.label }}
								</dt>
								<dd class="text-2xl font-semibold text-highlighted tabular-nums sm:text-3xl">
									{{ stat.value }}
								</dd>
							</div>
						</dl>
						<ActivityOverviewCard
							:year="selectedYear"
							:activity-counts="summary.activityCounts"
							show-days
							show-months
							class="mt-4" />
					</section>

					<section class="mt-12" aria-labelledby="rewind-top">
						<h2 id="rewind-top" class="mb-4 text-xl font-semibold tracking-tight text-highlighted">
							Your top anime
						</h2>
						<RewindAnimeRankingCard
							:items="summary.topAnime"
							size="lg"
							tie-note="Tied titles share a rank. Equal scores are ordered by watch time this year, then by title." />
					</section>

					<section class="mt-12" aria-labelledby="rewind-genres">
						<h2 id="rewind-genres" class="mb-4 text-xl font-semibold tracking-tight text-highlighted">
							Genres and tags
						</h2>
						<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
							<ListCard
								v-model:sort="genresSort"
								title="Top genres"
								score-scale="raw"
								:list="genreItems" />
							<ListCard
								v-model:sort="tagsSort"
								title="Top tags"
								score-scale="raw"
								:list="tagItems" />
						</div>
					</section>

					<section class="mt-12" aria-labelledby="rewind-seasons">
						<h2 id="rewind-seasons" class="mb-4 text-xl font-semibold tracking-tight text-highlighted">
							Seasons and list status
						</h2>
						<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
							<RewindBreakdownCard
								title="Anime by release season"
								:items="summary.seasons"
								:limit="4" />
							<RewindStatusDonutCard :items="summary.statuses" />
						</div>
					</section>

					<div class="mt-12 grid grid-cols-1 gap-x-4 gap-y-12 lg:grid-cols-2">
						<section class="flex flex-col" aria-labelledby="rewind-highlights">
							<h2 id="rewind-highlights" class="mb-4 text-xl font-semibold tracking-tight text-highlighted">
								Highlights
							</h2>
							<RewindHighlightsCard
								:selection="summary.selection"
								:selection-label="`Highest rated in ${selectedYear}`"
								:longest="summary.longestAnime"
								class="flex-1" />
						</section>

						<section aria-labelledby="rewind-lowest">
							<h2 id="rewind-lowest" class="mb-4 text-xl font-semibold tracking-tight text-highlighted">
								Lowest rated
							</h2>
							<RewindAnimeRankingCard
								:items="summary.flopAnime"
								variant="flop"
								empty-label="No scored anime to rank for this year."
								tie-note="Tied titles share a rank. Equal scores are ordered by watch time this year, then by title." />
						</section>
					</div>

					<details class="group mt-12 rounded-xl bg-white ring ring-default dark:bg-black" data-rewind-method>
						<summary class="flex min-h-11 list-none items-center justify-between gap-3 rounded-xl px-5 py-3 text-sm font-medium text-highlighted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
							How this is calculated
							<UIcon
								name="i-lucide-chevron-down"
								class="size-4 shrink-0 text-muted transition-transform group-open:rotate-180"
								aria-hidden="true" />
						</summary>
						<div class="max-w-[70ch] space-y-2 px-5 pb-5 text-sm text-pretty text-muted">
							<p>
								This Rewind is built from {{ formatNumber(summary.activityCount) }}
								{{ summary.activityCount === 1 ? "list update" : "list updates" }}
								AniList recorded for you in {{ selectedYear }} (UTC), so it only covers what you logged on AniList during the year.
							</p>
							<p>
								Episode totals are reconstructed from the progress ranges of those updates, and watch time multiplies them by each anime's average episode length: both are estimates.
							</p>
							<p>
								Scores, genres and list statuses reflect your list as it is today, not as it was at the time.
							</p>
							<p v-if="truncated">
								{{ truncationNote }}
							</p>
							<p v-if="unmatchedNote">
								{{ unmatchedNote }}
							</p>
						</div>
					</details>

					<footer class="mt-8 flex flex-wrap items-center gap-x-4 gap-y-3">
						<UButton
							to="/create"
							label="Share this Rewind"
							icon="i-lucide-share-2"
							size="xl"
							class="rounded-full" />
						<UButton
							v-if="previousYear"
							:to="`/rewind/${previousYear}`"
							:label="`See your ${previousYear} Rewind`"
							trailing-icon="i-lucide-arrow-right"
							color="neutral"
							variant="link"
							size="lg" />
					</footer>
				</template>
			</UContainer>
		</template>
	</UDashboardPanel>
</template>
