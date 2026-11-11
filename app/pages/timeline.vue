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
	return [
		{ label: "Updates", value: group.stats.updates },
		{ label: "Anime", value: group.stats.titles },
		{ label: "Active days", value: group.stats.activeDays }
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
					class="space-y-14 lg:space-y-20"
					aria-label="Anime update feed">
					<section
						v-for="{ group, runs } in monthFeeds"
						:key="group.key"
						class="grid gap-6 lg:grid-cols-[11rem_minmax(0,1fr)] lg:gap-10"
						:data-timeline-month="group.key">
						<aside class="self-start text-center lg:sticky lg:top-6 lg:text-center">
							<p class="text-3xl font-bold tracking-tight text-highlighted">
								{{ group.month }}
							</p>
							<p class="mt-1 text-sm font-medium text-muted">
								{{ group.year }}
							</p>
							<div class="mt-5 grid grid-cols-3 gap-2 lg:grid-cols-1 lg:gap-3">
								<UPageCard
									v-for="stat in monthStats(group)"
									:key="stat.label"
									:ui="{ container: 'gap-y-1 p-3', root: 'bg-elevated/60' }"
									class="text-center lg:text-left">
									<p class="text-[0.68rem] font-medium tracking-wide text-toned uppercase">
										{{ stat.label }}
									</p>
									<p class="text-2xl font-semibold text-ellipsis text-highlighted">
										{{ stat.value }}
									</p>
								</UPageCard>
							</div>
						</aside>

						<ol class="space-y-3">
							<li
								v-for="run in runs"
								:key="run.key"
								class="grid min-w-0 grid-cols-[3.5rem_minmax(0,1fr)] gap-3 sm:grid-cols-[4.5rem_minmax(0,1fr)]"
								data-timeline-activity>
								<time
									:datetime="new Date(run.activity.createdAt * 1_000).toISOString()"
									class="relative flex min-h-16 flex-col items-center border-r border-default pr-3 text-center">
									<span class="text-[0.65rem] font-semibold tracking-wide text-primary uppercase">
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

				<p v-if="layout === 'vertical'" class="text-center text-xs text-dimmed">
					Public responses use a short HTTP cache. Signed-in activity is never persisted and is cached only in this browser tab for five minutes.
				</p>
			</div>

			<div
				v-if="!showPageLoader && !loading && activities.length && layout === 'horizontal'"
				class="w-full space-y-3 px-4 sm:px-6">
				<TimelineGanttChart
					:activities="activities"
					:has-more="hasMore"
					:loading-more="loadingMore"
					@request-more="loadMore" />
				<p class="text-center text-xs text-dimmed">
					Public responses use a short HTTP cache. Signed-in activity is never persisted and is cached only in this browser tab for five minutes.
				</p>
			</div>
		</template>
	</UDashboardPanel>
</template>
