<script setup lang="ts">
import { FEATURE_REGISTRY } from "#shared/config/features"
import type { AniListActivityKind } from "~~/shared/types/anilist"
import {
	getTimelineGroupLabel,
	type TimelineView
} from "~/utils/timeline"

definePageMeta({
	feature: "timeline",
	auth: FEATURE_REGISTRY.timeline.access,
	indexable: FEATURE_REGISTRY.timeline.indexable
})

useSeoMeta({
	title: "AniList timeline",
	description: "Review recent AniList activity by week or month.",
	robots: "noindex, nofollow"
})

const {
	view,
	kind,
	groups,
	pageInfo,
	loading,
	loadingMore,
	error,
	safetyLimitReached,
	load,
	loadMore,
	setView,
	setKind
} = useTimeline()

const views: Array<{ label: string, value: TimelineView }> = [
	{ label: "Last weeks", value: "weeks" },
	{ label: "Last months", value: "months" }
]
const kinds: Array<{ label: string, value: AniListActivityKind }> = [
	{ label: "Anime updates", value: "anime" },
	{ label: "Text posts", value: "text" },
	{ label: "All activity", value: "all" }
]

function changeKind(event: Event) {
	const value = (event.target as HTMLSelectElement).value
	const selected = kinds.find(item => item.value === value)
	if (selected) void setKind(selected.value)
}

onMounted(() => {
	void load()
})
</script>

<template>
	<UDashboardPanel id="timeline">
		<template #body>
			<div class="mx-auto w-full max-w-5xl space-y-6">
				<header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<p class="text-sm font-medium text-primary">Recent activity</p>
						<h1 class="text-3xl font-semibold tracking-tight text-highlighted sm:text-4xl">
							Timeline
						</h1>
						<p class="mt-2 max-w-2xl text-muted">
							A paginated view of AniList activity, grouped into calendar weeks or months.
						</p>
					</div>
					<UButton
						icon="i-lucide-refresh-cw"
						label="Refresh"
						color="neutral"
						variant="soft"
						:loading="loading"
						@click="load(true)"/>
				</header>

				<section
					class="flex flex-col gap-3 rounded-xl border border-default bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between"
					aria-label="Timeline controls">
					<div class="inline-flex rounded-lg bg-elevated p-1" role="group" aria-label="Timeline period">
						<button
							v-for="option in views"
							:key="option.value"
							type="button"
							class="rounded-md px-3 py-2 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-primary"
							:class="view === option.value
								? 'bg-primary text-inverted'
								: 'text-muted hover:text-highlighted'"
							:aria-pressed="view === option.value"
							@click="setView(option.value)">
							{{ option.label }}
						</button>
					</div>
					<label class="flex items-center gap-2 text-sm">
						<span class="font-medium text-toned">Activity type</span>
						<select
							:value="kind"
							class="h-10 rounded-md border border-default bg-default px-3 text-highlighted focus-visible:outline-2 focus-visible:outline-primary"
							@change="changeKind">
							<option v-for="option in kinds" :key="option.value" :value="option.value">
								{{ option.label }}
							</option>
						</select>
					</label>
				</section>

				<UAlert
					v-if="error"
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

				<div
					v-if="loading"
					class="space-y-3"
					aria-label="Loading timeline"
					aria-busy="true">
					<USkeleton v-for="index in 5" :key="index" class="h-28 rounded-xl" />
				</div>

				<div v-else-if="groups.length" class="space-y-8">
					<section
						v-for="group in groups"
						:key="group.key"
						class="space-y-3"
						:aria-labelledby="`${group.key}-title`">
						<div class="sticky top-0 z-10 flex items-center gap-3 bg-default/90 py-2 backdrop-blur">
							<h2
								:id="`${group.key}-title`"
								class="text-lg font-semibold text-highlighted capitalize">
								{{ getTimelineGroupLabel(group, view) }}
							</h2>
							<UBadge
								:label="String(group.activities.length)"
								color="neutral"
								variant="soft"/>
							<USeparator class="flex-1" />
						</div>
						<div class="space-y-3">
							<TimelineActivityCard
								v-for="activity in group.activities"
								:key="activity.id"
								:activity="activity"/>
						</div>
					</section>
				</div>

				<UEmpty
					v-else-if="!error"
					icon="i-lucide-calendar-x-2"
					title="No activity in this period"
					description="Try another activity type or switch between the weekly and monthly views."/>

				<div v-if="!loading && groups.length" class="flex flex-col items-center gap-3">
					<UButton
						v-if="pageInfo.hasNextPage && !safetyLimitReached"
						icon="i-lucide-chevrons-down"
						label="Load more activity"
						color="neutral"
						variant="soft"
						:loading="loadingMore"
						@click="loadMore"/>
					<p v-else-if="!pageInfo.hasNextPage" class="text-sm text-muted">
						You reached the end of this period.
					</p>
					<UAlert
						v-if="safetyLimitReached"
						icon="i-lucide-shield-alert"
						title="Activity safety limit reached"
						description="AniTools loaded 8 pages for this view. Narrow the activity type to continue without issuing an unbounded number of AniList requests."
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
