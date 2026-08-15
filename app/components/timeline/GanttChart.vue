<script setup lang="ts">
import {
	ScrollAreaCorner,
	ScrollAreaRoot,
	ScrollAreaScrollbar,
	ScrollAreaThumb,
	ScrollAreaViewport
} from "reka-ui"
import {
	Timeline,
	type TimelineBaseUnits
} from "vue-timeline-chart"
import "vue-timeline-chart/style.css"
import type { AniListActivity } from "~~/shared/types/anilist"
import {
	buildTimelineGanttChartData,
	type TimelineGanttRow,
	type TimelineGanttSection,
	TIMELINE_GANTT_STACKING
} from "~/utils/timeline"

const props = defineProps<{
	activities: AniListActivity[]
	hasMore?: boolean
	loadingMore?: boolean
}>()

const emit = defineEmits<{
	requestMore: []
}>()

const chartData = computed(() => buildTimelineGanttChartData(props.activities))
const DAY_MS = 24 * 60 * 60 * 1_000
const latestActivityMs = computed(() => Math.max(
	...props.activities.map(activity => activity.createdAt * 1_000)
))
const oldestActivityMs = computed(() => Math.min(
	...props.activities.map(activity => activity.createdAt * 1_000)
))
const viewportMin = computed(() => -latestActivityMs.value - DAY_MS)
const viewportMax = computed(() => Math.max(
	viewportMin.value + DAY_MS,
	-oldestActivityMs.value + DAY_MS
))
const maximumDuration = computed(() => viewportMax.value - viewportMin.value)
const initialDuration = computed(() => Math.min(maximumDuration.value, 30 * DAY_MS))
const minimumDuration = computed(() => Math.min(maximumDuration.value, 7 * DAY_MS))
const visibleDuration = ref(30 * DAY_MS)
const zoomDensity = computed(() => {
	const visibleDays = Math.max(1, visibleDuration.value / DAY_MS)
	if (visibleDays <= 30) return 1
	return Math.max(0.52, 1 - Math.log2(visibleDays / 30) * 0.14)
})
const chartStyle = computed(() => ({
	"--group-items-height": `${(3 * zoomDensity.value).toFixed(2)}rem`,
	"--item-stack-height": `${(3 * zoomDensity.value).toFixed(2)}rem`,
	"--item-stack-gap": `${(0.5 * zoomDensity.value).toFixed(2)}rem`,
	"--item-point-size": `${(2.75 * zoomDensity.value).toFixed(2)}rem`,
	"--group-padding-top": `${(0.5 * zoomDensity.value).toFixed(2)}rem`,
	"--group-padding-bottom": `${(0.5 * zoomDensity.value).toFixed(2)}rem`
}))
const stacking = computed(() => ({
	...TIMELINE_GANTT_STACKING,
	collisionWidth: Math.max(
		92,
		Math.round((TIMELINE_GANTT_STACKING.collisionWidth ?? 196) * zoomDensity.value)
	)
}))
const chartItems = computed(() => chartData.value.items.map((item) => {
	if (item.variant !== "movie-stack") return item
	const visibleMovies = Math.min(item.rows.length, 6)
	const baseSize = Math.min(9, 2.75 + Math.max(0, visibleMovies - 1) * 1.05)
	return {
		...item,
		cssVariables: {
			...item.cssVariables,
			"--item-point-size": `${Math.max(2.5, baseSize * zoomDensity.value).toFixed(2)}rem`
		}
	}
}))
const timestampFormatters: Partial<Record<TimelineBaseUnits, Intl.DateTimeFormat>> = {
	years: new Intl.DateTimeFormat(undefined, { year: "numeric" }),
	months: new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" }),
	weeks: new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" }),
	days: new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" }),
	hours: new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" })
}
function renderTimestampLabel(
	timestamp: number,
	scale: { unit: string, step: number }
): string {
	const formatter = timestampFormatters[scale.unit as TimelineBaseUnits]
	return (formatter ?? timestampFormatters.days)!.format(new Date(-timestamp))
}

function handleViewportChange(nextViewport: { start: number, end: number }): void {
	visibleDuration.value = Math.max(DAY_MS, nextViewport.end - nextViewport.start)
	if (!props.hasMore || props.loadingMore) return
	const threshold = Math.max(DAY_MS, maximumDuration.value * 0.08)
	if (nextViewport.end >= viewportMax.value - threshold) emit("requestMore")
}

function groupIcon(section: TimelineGanttSection): string {
	if (section === "movies") return "i-lucide-film"
	if (section === "series") return "i-lucide-tv"
	if (section === "text") return "i-lucide-file-text"
	return "i-lucide-message-square-text"
}

function detailData(row: TimelineGanttRow) {
	return { media: row.media, score: null }
}

function episodeActivities(row: TimelineGanttRow) {
	return row.activities.filter(activity =>
		activity.kind === "anime" && Boolean(activity.progress?.trim())
	)
}

function episodeLabel(activity: AniListActivity): string {
	if (activity.kind !== "anime" || !activity.progress?.trim()) return "Anime update"
	return `Episode ${activity.progress.trim()}`
}

function episodeMarkerStyle(activity: AniListActivity, row: TimelineGanttRow) {
	const duration = row.endedAt - row.startedAt
	const rawPosition = duration > 0
		? (row.endedAt - activity.createdAt) / duration * 100
		: 50
	return {
		left: `${Math.min(95, Math.max(5, rawPosition)).toFixed(2)}%`
	}
}

watch(initialDuration, duration => {
	visibleDuration.value = duration
}, { immediate: true })
</script>

<template>
	<section
		class="min-w-0"
		aria-label="Gantt activity timeline">
		<header class="mb-2 flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
			<p class="flex items-center gap-1.5 font-medium text-highlighted">
				<UIcon name="i-lucide-arrow-right" class="size-4 text-primary" />
				Newest on the left · older activity to the right
			</p>
			<p class="flex items-center gap-1.5">
				<UIcon name="i-lucide-move-horizontal" class="size-4" />
				Scroll to explore · pinch or wheel to zoom
			</p>
		</header>

		<ScrollAreaRoot
			type="auto"
			class="relative h-[clamp(26rem,70vh,48rem)] overflow-hidden border-y border-default bg-default"
			data-timeline-period-scroll-area>
			<ScrollAreaViewport
				class="size-full focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
				aria-label="Scrollable timeline period">
				<div class="min-w-320 py-3 pr-5 pb-5">
					<Timeline
						class="min-h-96"
						data-gantt-timeline-chart
						:style="chartStyle"
						:groups="chartData.groups"
						:items="chartItems"
						:viewport-min="viewportMin"
						:viewport-max="viewportMax"
						:initial-viewport-start="viewportMin"
						:initial-viewport-end="viewportMin + initialDuration"
						:min-viewport-duration="minimumDuration"
						:max-viewport-duration="maximumDuration"
						:render-timestamp-label="renderTimestampLabel"
						:stacking="stacking"
						:momentum="{ enabled: true, timeConstant: 180 }"
						:week-starts-on="1"
						:fixed-labels="true"
						@change-viewport="handleViewportChange">
						<template #group-label="{ group }">
							<div class="flex h-full min-h-12 items-center gap-2 px-3 py-2">
								<span class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
									<UIcon :name="groupIcon(group.section)" class="size-4" />
								</span>
								<span class="min-w-0">
									<span class="block truncate text-xs font-semibold text-highlighted">
										{{ group.label }}
									</span>
									<span class="block text-[10px] text-muted">
										{{ group.count }} {{ group.count === 1 ? "item" : "items" }}
									</span>
								</span>
							</div>
						</template>

						<template #item="{ item }">
							<div
								v-if="item.variant === 'movie-stack'"
								class="absolute inset-0 flex items-center justify-center"
								data-movie-stack>
								<AnimeDetailsPopover
									v-for="(row, index) in item.rows.slice(0, 6)"
									:key="row.key"
									:data="detailData(row)"
									:draggable="false"
									mode="click"
									:content="{ side: 'top', sideOffset: 10 }">
									<button
										type="button"
										class="relative size-10 shrink-0 overflow-hidden rounded-full border-2 border-default bg-muted shadow-md transition hover:z-20 hover:-translate-y-0.5 focus-visible:z-20 focus-visible:outline-2 focus-visible:outline-primary"
										:class="index ? '-ml-4' : ''"
										:style="{ zIndex: item.rows.length - index }"
										:aria-label="`Open details for ${row.label}`"
										:title="row.label">
										<NuxtImg
											v-if="row.cover"
											:src="row.cover"
											:alt="row.label"
											width="80"
											height="80"
											loading="lazy"
											class="size-full object-cover" />
										<UIcon v-else name="i-lucide-film" class="size-4 text-muted" />
									</button>
								</AnimeDetailsPopover>
								<span
									v-if="item.rows.length > 6"
									class="relative z-30 -ml-4 flex size-10 items-center justify-center rounded-full border-2 border-default bg-elevated text-[10px] font-semibold text-highlighted shadow-md">
									+{{ item.rows.length - 6 }}
								</span>
							</div>

							<AnimeDetailsPopover
								v-else-if="item.row.media"
								:data="detailData(item.row)"
								:draggable="false"
								mode="click"
								:content="{ side: 'top', sideOffset: 10 }">
								<button
									v-if="item.type === 'range'"
									type="button"
									class="absolute inset-0 flex items-center gap-2 overflow-hidden rounded-[inherit] px-1.5 text-left text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
									:aria-label="`Open details for ${item.row.label}`"
									:title="item.title">
									<NuxtImg
										v-if="item.row.cover"
										:src="item.row.cover"
										:alt="item.row.label"
										width="40"
										height="56"
										loading="lazy"
										class="h-9 w-7 shrink-0 rounded-sm object-cover" />
									<span class="min-w-0 leading-tight">
										<span class="block truncate text-[11px] font-semibold">{{ item.row.label }}</span>
										<span class="block truncate text-[9px] text-white/80">{{ item.row.description }}</span>
									</span>
									<span
										v-for="activity in episodeActivities(item.row)"
										:key="activity.id"
										class="pointer-events-none absolute top-1/2 size-3 -translate-1/2 rotate-45 rounded-[2px] border border-black/25 bg-white shadow-sm"
										:style="episodeMarkerStyle(activity, item.row)"
										:title="episodeLabel(activity)" />
								</button>
								<button
									v-else
									type="button"
									class="absolute inset-[18%] flex rotate-45 items-center justify-center rounded-[3px] border border-black/20 text-white shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
									:style="{ backgroundColor: item.row.color || 'var(--ui-primary)' }"
									:aria-label="`Open details for ${item.row.label}, ${episodeLabel(item.row.activities.at(-1)!)}`"
									:title="item.title">
									<span class="-rotate-45 text-[8px] font-bold">
										{{ item.row.activities.at(-1)?.kind === 'anime' ? item.row.activities.at(-1)?.progress : '' }}
									</span>
								</button>
							</AnimeDetailsPopover>

							<UTooltip v-else :text="item.title">
								<div class="absolute inset-0 flex items-center justify-center rounded-full bg-primary text-white">
									<UIcon :name="groupIcon(item.row.section)" class="size-4" />
								</div>
							</UTooltip>
						</template>
					</Timeline>
				</div>
			</ScrollAreaViewport>

			<ScrollAreaScrollbar
				orientation="vertical"
				class="z-40 flex h-full w-2.5 touch-none border-l border-default/60 bg-elevated/80 p-0.5 select-none">
				<ScrollAreaThumb class="relative flex-1 rounded-full bg-accented" />
			</ScrollAreaScrollbar>
			<ScrollAreaScrollbar
				orientation="horizontal"
				class="z-40 flex h-2.5 touch-none border-t border-default/60 bg-elevated/80 p-0.5 select-none">
				<ScrollAreaThumb class="relative flex-1 rounded-full bg-accented" />
			</ScrollAreaScrollbar>
			<ScrollAreaCorner class="bg-elevated" />
		</ScrollAreaRoot>
		<div v-if="loadingMore" class="flex items-center justify-center gap-2 py-3 text-xs text-muted">
			<UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" />
			Loading older activity…
		</div>
	</section>
</template>

<style scoped>
:deep([data-gantt-timeline-chart]) {
	--font-family: var(--ui-font-sans);
	--timestamp-padding-block: 0.65rem;
	--timestamp-padding-inline: 0.75rem;
	--timestamps-background: color-mix(in srgb, var(--ui-bg-elevated) 94%, transparent);
	--timestamps-color: var(--ui-text-muted);
	--gridline-border-left: 1px dashed var(--ui-border);
	--label-width: 12rem;
	--label-color: var(--ui-text-highlighted);
	--label-line-height: 1.1rem;
	--group-items-height: 3rem;
	--item-stack-height: 3rem;
	--item-stack-gap: 0.5rem;
	--item-point-size: 2.75rem;
	--item-range-border-radius: 0.65rem;
	color: var(--ui-text);
	background: var(--ui-bg);
}

:deep([data-gantt-timeline-chart] .timestamps) {
	position: sticky;
	top: 0;
	z-index: 30;
	border-bottom: 1px solid var(--ui-border);
	backdrop-filter: blur(12px);
}

:deep([data-gantt-timeline-chart] .group-label.fixed) {
	border-right: 1px solid var(--ui-border);
	box-shadow: 0.75rem 0 1.5rem color-mix(in srgb, var(--ui-bg) 70%, transparent);
}

:deep([data-gantt-timeline-chart] .item) {
	z-index: 10;
	opacity: 0.92;
	box-shadow: 0 4px 14px color-mix(in srgb, var(--item-background) 28%, transparent);
	transition: opacity 150ms ease, filter 150ms ease, box-shadow 150ms ease;
}

:deep([data-gantt-timeline-chart] .item:hover),
:deep([data-gantt-timeline-chart] .item:focus-within) {
	z-index: 20;
	opacity: 1;
	filter: saturate(1.15) brightness(1.05);
	box-shadow: 0 8px 20px color-mix(in srgb, var(--item-background) 38%, transparent);
}
</style>
