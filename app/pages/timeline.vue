<script setup lang="ts">
import { FEATURE_REGISTRY } from "#shared/config/features"
import type { AniListAnimeActivity } from "~~/shared/types/anilist"
import TimelineActivityCard from "~/components/timeline/ActivityCard.vue"
import TimelineGanttChart from "~/components/timeline/GanttChart.vue"
import {
	groupTimelineAnimeActivitiesByMonth,
	type TimelineMonthGroup
} from "~/utils/timeline"
import { mergeConsecutiveEpisodeActivities } from "~/utils/timeline-runs"

definePageMeta({
	feature: "timeline",
	auth: FEATURE_REGISTRY.timeline.access,
	indexable: FEATURE_REGISTRY.timeline.indexable
})

useSeoMeta({
	title: "AniList timeline",
	description: "Review anime list updates as a monthly activity feed or a Gantt timeline.",
	robots: "noindex, nofollow"
})

const {
	activities,
	pageInfo,
	loading,
	loadingMore,
	initialized,
	error,
	hasMore,
	safetyLimitReached,
	load,
	loadMore
} = useTimeline()

type TimelineLayout = "vertical" | "horizontal"
const layouts: Array<{ label: string, value: TimelineLayout, icon: string }> = [
	{ label: "Activity feed", value: "vertical", icon: "i-lucide-list-tree" },
	{ label: "Gantt", value: "horizontal", icon: "i-lucide-chart-no-axes-gantt" }
]
const layout = ref<TimelineLayout>("vertical")
const loadMoreSentinel = ref<HTMLElement | null>(null)
const monthGroups = computed(() =>
	groupTimelineAnimeActivitiesByMonth(activities.value)
)
// Episodes of one anime watched in a row share a card. Derived once per load, not per render.
const monthFeeds = computed(() => monthGroups.value.map(group => ({
	group,
	runs: mergeConsecutiveEpisodeActivities(group.activities)
})))
const { showPageLoader } = useProgressiveLoading(
	computed(() => [initialized.value]),
	{ allowPartial: false }
)
const { createFormatter } = useTimeDisplay()
// Computed, not built once: the day beside a card follows the zone chosen in Settings.
// Month headings stay grouped by UTC month (see groupTimelineAnimeActivitiesByMonth).
const dayFormatter = computed(() => createFormatter({ day: "2-digit" }))
const weekdayFormatter = computed(() => createFormatter({ weekday: "short" }))

function formatActivityDay(activity: AniListAnimeActivity) {
	return dayFormatter.value.format(new Date(activity.createdAt * 1_000))
}

function formatActivityWeekday(activity: AniListAnimeActivity) {
	return weekdayFormatter.value.format(new Date(activity.createdAt * 1_000))
}

function monthStats(group: TimelineMonthGroup) {
	const { updates, titles, activeDays } = group.stats
	return [
		{ label: updates === 1 ? "update" : "updates", value: updates },
		{ label: "anime", value: titles },
		{ label: activeDays === 1 ? "active day" : "active days", value: activeDays }
	]
}

onMounted(() => {
	void load()
})

useIntersectionObserver(loadMoreSentinel, ([entry]) => {
	if (entry?.isIntersecting && layout.value === "vertical" && hasMore.value) {
		void loadMore()
	}
}, { rootMargin: "320px" })
</script>

<template>
	<UDashboardPanel id="timeline" :ui="{ body: 'pt-3 px-0 sm:pt-4' }">
		<template #body>
			<div class="mx-auto w-full max-w-7xl space-y-6 px-4 sm:px-6">
				<PageHeader
					eyebrow="Activity"
					title="Timeline"
					description="Every AniList update, month by month or laid out as a Gantt chart.">
					<template #actions>
						<UTabs
							v-model="layout"
							:items="layouts"
							:content="false"
							color="neutral"
							size="sm"
							aria-label="Timeline view"
							:ui="{ trigger: 'cursor-pointer' }" />
					</template>
				</PageHeader>

				<UAlert
					v-if="!showPageLoader && error"
					icon="i-lucide-triangle-alert"
					title="Timeline could not be loaded"
					:description="error"
					color="error"
					variant="soft"
					:actions="[{
						label: 'Try again',
						color: 'error',
						variant: 'subtle',
						onClick: () => load(true)
					}]"/>

				<PageLoadingState
					v-if="showPageLoader"
					label="Preparing your timeline"
					description="Loading recent AniList activity and arranging the timeline." />

				<div
					v-else-if="loading"
					class="space-y-3"
					aria-label="Loading timeline"
					aria-busy="true">
					<WidgetLoadingSkeleton
						v-for="index in 5"
						:key="index"
						label="Loading activity"
						variant="timeline" />
				</div>

				<div
					v-else-if="activities.length && layout === 'vertical'"
					class="space-y-10 lg:space-y-12"
					aria-label="Anime update feed">
					<section
						v-for="{ group, runs } in monthFeeds"
						:key="group.key"
						class="space-y-4"
						:data-timeline-month="group.key">
						<header class="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-default pb-3">
							<h2 class="text-2xl font-bold tracking-tight text-highlighted">
								{{ group.month }}
								<span class="ms-1 text-base font-medium text-muted">{{ group.year }}</span>
							</h2>
							<ul class="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-sm text-muted" data-timeline-month-stats>
								<li v-for="stat in monthStats(group)" :key="stat.label">
									<strong class="font-semibold tabular-nums text-highlighted">{{ stat.value }}</strong>
									{{ stat.label }}
								</li>
							</ul>
						</header>

						<!-- Two columns on wide screens: each card carries its own day, so the order stays readable. -->
						<ol class="grid gap-3 xl:grid-cols-2 xl:gap-x-8">
							<li
								v-for="run in runs"
								:key="run.key"
								class="grid min-w-0 grid-cols-[3.5rem_minmax(0,1fr)] gap-3 sm:grid-cols-[4.5rem_minmax(0,1fr)]"
								data-timeline-activity>
								<time
									:datetime="new Date(run.activity.createdAt * 1_000).toISOString()"
									class="relative flex min-h-16 flex-col items-center border-r border-default pr-3 text-center">
									<span class="text-xs font-semibold text-primary">
										{{ formatActivityWeekday(run.activity) }}
									</span>
									<span class="mt-0.5 text-lg font-bold text-highlighted">
										{{ formatActivityDay(run.activity) }}
									</span>
									<span
										class="absolute top-4 right-0 size-1.5 translate-x-1/2 rounded-full bg-primary ring-4 ring-default"
										aria-hidden="true" />
								</time>
								<TimelineActivityCard
									:activity="run.activity"
									:run="run"
									compact
									side="right" />
							</li>
						</ol>
					</section>
				</div>

				<UEmpty
					v-else-if="!activities.length && !error"
					icon="i-lucide-calendar-x-2"
					title="No anime updates yet"
					description="Anime list updates will appear here as soon as AniList records them."/>

				<div v-if="!loading && activities.length && layout === 'vertical'" class="flex flex-col items-center gap-3">
					<div
						v-if="hasMore"
						ref="loadMoreSentinel"
						class="flex min-h-16 items-center justify-center gap-2 text-sm text-muted"
						aria-live="polite">
						<UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" />
						{{ loadingMore ? "Loading older activity…" : "Scroll for older activity" }}
					</div>
					<p v-else-if="!pageInfo.hasNextPage" class="text-sm text-muted">
						You reached the beginning of this activity history.
					</p>
					<UAlert
						v-if="safetyLimitReached"
						icon="i-lucide-shield-alert"
						title="Activity safety limit reached"
						description="AniList's pagination limit was reached after 5,000 activities."
						color="warning"
						variant="soft"
						class="w-full"/>
				</div>

			</div>

			<div
				v-if="!showPageLoader && !loading && activities.length && layout === 'horizontal'"
				class="w-full space-y-3 px-4 sm:px-6">
				<TimelineGanttChart
					:activities="activities"
					:has-more="hasMore"
					:loading-more="loadingMore"
					@request-more="loadMore" />
			</div>
		</template>
	</UDashboardPanel>
</template>
