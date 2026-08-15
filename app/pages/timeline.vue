<script setup lang="ts">
import { FEATURE_REGISTRY } from "#shared/config/features"
import type { AniListAnimeActivity } from "~~/shared/types/anilist"
import TimelineActivityCard from "~/components/timeline/ActivityCard.vue"
import TimelineGanttChart from "~/components/timeline/GanttChart.vue"
import {
	groupTimelineAnimeActivitiesByMonth,
	type TimelineMonthGroup
} from "~/utils/timeline"

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
const { showPageLoader } = useProgressiveLoading(
	computed(() => [initialized.value]),
	{ allowPartial: false }
)
const dayFormatter = new Intl.DateTimeFormat(undefined, {
	day: "2-digit"
})
const weekdayFormatter = new Intl.DateTimeFormat(undefined, {
	weekday: "short"
})
const timeFormatter = new Intl.DateTimeFormat(undefined, {
	hour: "2-digit",
	minute: "2-digit"
})

function formatActivityDay(activity: AniListAnimeActivity) {
	return dayFormatter.format(new Date(activity.createdAt * 1_000))
}

function formatActivityWeekday(activity: AniListAnimeActivity) {
	return weekdayFormatter.format(new Date(activity.createdAt * 1_000))
}

function formatActivityTime(activity: AniListAnimeActivity) {
	return timeFormatter.format(new Date(activity.createdAt * 1_000))
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
	<UDashboardPanel id="timeline" :ui="{ body: 'pt-3 sm:pt-4' }">
		<template #body>
			<div class="mx-auto w-full max-w-7xl space-y-6">
				<header class="flex justify-end" aria-label="Timeline controls">
					<UTabs
						v-model="layout"
						:items="layouts"
						:content="false"
						color="neutral"
						size="sm"
						aria-label="Timeline view"
						:ui="{ trigger: 'cursor-pointer' }" />
				</header>

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
						v-for="group in monthGroups"
						:key="group.key"
						class="grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10"
						:data-timeline-month="group.key">
						<aside class="self-start lg:sticky lg:top-6">
							<p class="text-3xl font-bold tracking-tight text-highlighted">
								{{ group.month }}
							</p>
							<p class="mt-1 text-sm font-medium text-muted">
								{{ group.year }}
							</p>
							<dl class="mt-5 grid grid-cols-3 gap-2 lg:grid-cols-1">
								<div
									v-for="stat in monthStats(group)"
									:key="stat.label"
									class="rounded-lg border border-default bg-elevated/60 px-3 py-2.5">
									<dt class="text-[0.68rem] font-medium tracking-wide text-muted uppercase">
										{{ stat.label }}
									</dt>
									<dd class="mt-1 text-lg font-semibold text-highlighted">
										{{ stat.value }}
									</dd>
								</div>
							</dl>
						</aside>

						<ol class="space-y-5">
							<li
								v-for="activity in group.activities"
								:key="activity.id"
								class="grid min-w-0 grid-cols-[4.5rem_minmax(0,1fr)] gap-3 sm:grid-cols-[6rem_minmax(0,1fr)] sm:gap-5"
								data-timeline-activity>
								<time
									:datetime="new Date(activity.createdAt * 1_000).toISOString()"
									class="relative flex min-h-24 flex-col items-center border-r border-default pr-3 text-center sm:pr-5">
									<span class="text-xs font-semibold tracking-wide text-primary uppercase">
										{{ formatActivityWeekday(activity) }}
									</span>
									<span class="mt-1 text-2xl font-bold text-highlighted">
										{{ formatActivityDay(activity) }}
									</span>
									<span class="mt-1 text-xs text-dimmed">
										{{ formatActivityTime(activity) }}
									</span>
									<span
										class="absolute top-5 right-0 size-2 translate-x-1/2 rounded-full bg-primary ring-4 ring-default"
										aria-hidden="true" />
								</time>
								<TimelineActivityCard
									:activity="activity"
									:show-timestamp="false"
									side="right" />
							</li>
						</ol>
					</section>
				</div>

				<TimelineGanttChart
					v-else-if="activities.length"
					:activities="activities"
					:has-more="hasMore"
					:loading-more="loadingMore"
					@request-more="loadMore" />

				<UEmpty
					v-else-if="!error"
					icon="i-lucide-calendar-x-2"
					title="No anime updates yet"
					description="Anime list updates will appear here as soon as AniList records them."/>

				<div v-if="!loading && activities.length" class="flex flex-col items-center gap-3">
					<div
						v-if="layout === 'vertical' && hasMore"
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

				<p class="text-center text-xs text-dimmed">
					Public responses use a short HTTP cache. Signed-in activity is never persisted and is cached only in this browser tab for five minutes.
				</p>
			</div>
		</template>
	</UDashboardPanel>
</template>
