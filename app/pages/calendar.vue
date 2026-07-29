<template>
	<UDashboardPanel id="calendar" class="relative h-dvh min-w-0">
		<div class="sr-only" aria-live="polite">
			{{ calendarStatusMessage }}
		</div>

		<div
			v-if="calendarError"
			class="absolute inset-x-3 top-20 z-50 flex flex-wrap items-center gap-3 rounded-lg border border-error/30 bg-error/10 p-3 text-sm shadow-sm backdrop-blur sm:inset-x-auto sm:right-6 sm:max-w-md"
			role="alert">
			<Icon name="lucide:circle-alert" class="size-5 shrink-0 text-error" aria-hidden="true" />
			<p class="min-w-0 flex-1">The calendar could not be loaded.</p>
			<UButton
				label="Try again"
				size="xs"
				color="error"
				variant="soft"
				@click="refreshCalendar" />
		</div>
		<div
			v-else-if="hasCalendarWarning && !warningDismissed"
			class="absolute inset-x-3 top-20 z-50 flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm shadow-sm backdrop-blur sm:inset-x-auto sm:right-6 sm:max-w-md"
			role="status">
			<Icon name="lucide:triangle-alert" class="size-5 shrink-0 text-warning" aria-hidden="true" />
			<p class="flex-1">Some simuldub details are temporarily unavailable. AniList broadcasts are still shown.</p>
			<UButton
				icon="i-lucide-x"
				size="xs"
				color="neutral"
				variant="ghost"
				aria-label="Dismiss calendar warning"
				@click="warningDismissed = true" />
		</div>

		<vue-cal ref="vueCalRef" v-model:view="store.currentView" :time-step="store.timeStep" time-at-cursor week-numbers
			aria-label="Anime release calendar"
			:views="['day', 'week', 'month']" :events="filteredCalendarEvents" @wheel="store.handleWheel"
			:time-cell-height="store.currentView === 'day' ? 96 : store.currentView === 'week' ? 64 : 48"
			@ready="onCalendarReady" @view-change="onViewChange">
			<template #header="{ view, availableViews }">
				<div class="flex min-h-16 flex-wrap items-center gap-2 bg-default p-3 sm:flex-nowrap sm:px-6">
					<div class="flex min-w-0 flex-1 items-center gap-1 sm:gap-2">
						<h1 class="me-auto inline-flex min-w-0 items-baseline gap-1 text-lg font-light text-dimmed sm:me-4 sm:gap-2 sm:text-2xl">
							<strong class="font-bold capitalize text-default">
								{{ view.now.format('MMMM') }}
							</strong>
							{{ view.now.format('YYYY') }}
							<span class="ms-1 hidden items-center text-sm -tracking-widest text-primary sm:flex">
								{{ store.isWeekView ? `W ${view.now.getWeek()}` : store.isDayView ? view.now.format(`DD{S}`) : '' }}
							</span>
						</h1>
						<UButton label="Today" size="xs" color="neutral" variant="soft" @click="view.goToToday()"
							class="cursor-pointer" />
						<div class="flex items-center gap-1 sm:gap-2">
							<UButton icon="i-lucide-chevron-left" size="xs" variant="ghost" color="neutral" class="cursor-pointer"
								aria-label="Previous period"
								@click="view.previous()" />
							<UButton icon="i-lucide-chevron-right" size="xs" variant="ghost" color="neutral" class="cursor-pointer"
								aria-label="Next period"
								@click="view.next()" />
						</div>
					</div>
					<div class="flex w-full min-w-0 items-center justify-end gap-2 overflow-x-auto sm:w-auto sm:overflow-visible">
						<UInput ref="inputRef" v-model="searchQuery" icon="i-lucide-search" placeholder="Search..." variant="soft"
							size="sm" color="neutral" aria-label="Search calendar events" name="calendar-search"
							@blur="closeSearch" @keyup.esc="clearSearch"
							:ui="searchButtonToggle
								? { base: 'w-48 sm:w-64 transition-all placeholder:text-dimmed duration-300 ease-in-out bg-elevated', leading: 'ps-1' }
								: { base: 'w-8 px-0 transition-all placeholder:text-transparent duration-300 ease-in-out bg-elevated', leading: 'ps-1' }">
							<template #leading>
								<UButton icon="i-lucide-search" aria-label="Open calendar search" @click="openSearch" size="xs" variant="link" color="neutral" :class="searchButtonToggle
									? 'cursor-default text-muted'
									: 'cursor-pointer text-default'" />
							</template>
						</UInput>
						<UDropdownMenu :items="items" size="sm" :ui="{ item: 'cursor-pointer' }">
							<UButton icon="i-lucide-list-filter" size="sm" color="neutral" variant="soft"
								aria-label="Filter calendar events" class="h-fit cursor-pointer" />
						</UDropdownMenu>
						<UTabs v-model="store.currentView" size="xs" class="w-fit" color="neutral"
							aria-label="Calendar view"
							:ui="{ root: 'gap-0', trigger: 'cursor-pointer' }"
							:items="Object.keys(availableViews).map((viewKey: string) => ({ label: String(viewKey).charAt(0).toUpperCase() + String(viewKey).slice(1), value: viewKey }))" />
					</div>
				</div>
			</template>
			<template #weekday-heading="{ date }">
				<UButton size="sm" color="neutral" variant="soft" class="rounded-full uppercase m-2"
					:class="!store.isMonthView && 'cursor-pointer'"
					@click="!store.isMonthView ? vueCalRef?.view.switch('day', date) : ''">
					{{ date.format("dddd") }}
					<strong v-if="!store.isMonthView" class="font-bold">{{ date.format('DD') }}</strong>
				</UButton>
			</template>
			<template #event="{ event }">
				<AnimeDetailsPopover :data="event" :content="{ sideOffset: 32 }">
					<button
						type="button"
						:aria-label="getEventAriaLabel(event)"
						class="calendar-event-card relative flex size-full cursor-pointer flex-col justify-center gap-0.5 rounded-lg border-l-4 border-(--anime-theme-color) bg-(--anime-theme-color)/25 px-1.5 py-1 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
						:class="[
							isCancelled(event)
								? 'brightness-90 border-(--anime-theme-color)/10! bg-(--anime-theme-color)/5! hover:bg-(--anime-theme-color)/8!'
								: 'hover:bg-(--anime-theme-color)/50',
							isUnconfirmed(event) ? 'opacity-50' : ''
						]" :ref="(el) => setEventCardRef(event, el as Element)" :style="getEventStyleVars(event, store.timeStep)">
						<UTooltip v-if="isCancelled(event)" text="Cancelled" :delay-duration="0" :content="{ sideOffset: 16 }">
							<Icon name="lucide:circle-x" class="size-[calc(100%-1rem)] bg-error absolute inset-2 z-50 opacity-50" />
						</UTooltip>
						<UTooltip v-if="isUnconfirmed(event)" text="Unconfirmed" :delay-duration="0" :content="{ sideOffset: 8 }">
							<div class="size-full absolute inset-0" />
						</UTooltip>
						<span class="font-medium text-default calendar-event-title" :class="isCancelled(event) && 'opacity-25'">{{
							event.title }}</span>
						<span v-if="shouldShowPeriod(event, store.timeStep) || shouldShowEpisode(event)"
							class="text-muted font-light"
							:class="[isCancelled(event) && 'opacity-25', getPeriodTextClass(event, store.timeStep)]">{{
								shouldShowEpisodeWithPeriod(event, store.timeStep)
		? `${getEpisodeLabel(event.episode, shouldUseLongEpisodeLabel(event))} | ${event.start.format('HH:mm')} -
							${event.end.format('HH:mm')}`
		: shouldShowEpisodeOnly(event, store.timeStep)
			? getEpisodeLabel(event.episode, shouldUseLongEpisodeLabel(event))
			: `${event.start.format('HH:mm')} - ${event.end.format('HH:mm')}`
							}}</span>
						<div v-if="shouldShowBadges(event, store.timeStep)" class="flex items-center gap-2"
							:class="isCancelled(event) && 'opacity-25'">
							<template v-if="event.streaming">
								<UBadge v-for="platform in event.streaming" :key="platform" :label="platform"
									:size="getBadgeSize(event, store.timeStep)" variant="subtle"
									class="ring-(--anime-theme-color)/25 bg-(--anime-theme-color)/25 text-(--anime-theme-color)"
									:style="{ '--anime-theme-color': event.media?.coverImage?.color || 'var(--ui-color-primary-500)' }" />
							</template>
							<UBadge v-else-if="event.media?.format" :label="event.media?.format"
								:size="getBadgeSize(event, store.timeStep)" variant="subtle"
								class="ring-(--anime-theme-color)/25 bg-(--anime-theme-color)/25 text-(--anime-theme-color)"
								:style="{ '--anime-theme-color': event.media?.coverImage?.color || 'var(--ui-color-primary-500)' }" />
							<template v-if="event.languages">
								<Icon v-for="language in event.languages" :key="language" :name="`circle-flags:${language}`"
									class="size-3" aria-hidden="true" />
							</template>
						</div>
					</button>
				</AnimeDetailsPopover>
			</template>
			<template v-if="store.isMonthView" #cell="{ cell }">
				<button type="button" :aria-label="`Open week of ${cell.start.format('MMMM DD')}`"
					class="relative flex size-full cursor-pointer flex-col items-end p-2 hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
					@click="vueCalRef?.view?.switch('week', cell.start)">
					<UBadge variant="soft" color="neutral" class="rounded-full size-fit">
						{{ cell.start.format("DD") }}
					</UBadge>
				</button>
			</template>
		</vue-cal>

		<div
			v-if="showEmptyState"
			class="pointer-events-none absolute bottom-4 right-4 z-40 max-w-xs rounded-lg border border-default bg-default/95 px-4 py-3 text-sm text-muted shadow-sm"
			role="status">
			No events match the current search and filters.
		</div>
	</UDashboardPanel>
</template>

<script lang="ts" setup>
import { VueCal, addDatePrototypes, type VueCalView } from "vue-cal"
import "vue-cal/style"
import { FEATURE_REGISTRY } from "#shared/config/features"
import { useAiringSchedules } from "~/composables/useAiringSchedules"
import { useCalendarStore } from "~/stores/Calendar"
import type {
	CalendarApiResponse,
	CalendarEvent,
	CalendarMedia
} from "~/types/calendar"
import { buildCalendarEvents } from "~/utils/calendar-events"

definePageMeta({
	feature: "calendar",
	auth: FEATURE_REGISTRY.calendar.access,
	indexable: FEATURE_REGISTRY.calendar.indexable
})

const store = useCalendarStore()
const userStore = useUserStore()
const entriesStore = useEntriesStore()
const {
	getAllAnimes: animeEntries,
	isInitialized: entriesInitialized
} = storeToRefs(entriesStore)
const seo = {
	title: "Anime Calendar",
	description: "Track upcoming anime episodes and simuldubs in a live calendar."
}

useSeoMeta({
	title: seo.title,
	description: seo.description,
	ogTitle: seo.title,
	ogDescription: seo.description
})

addDatePrototypes()

const vueCalRef = ref<{ view: VueCalView } | null>(null)
const searchButtonToggle = ref(false)
const searchQuery = ref("")
const warningDismissed = ref(false)
const inputRef = ref<{ $el?: HTMLElement } | null>(null)

function openSearch() {
	searchButtonToggle.value = true
	nextTick(() => {
		const input = inputRef.value?.$el?.querySelector("input")
		if (input) {
			input.focus()
		}
	})
}

function closeSearch() {
	if (searchQuery.value === "") {
		searchButtonToggle.value = false
	}
}

function clearSearch() {
	searchQuery.value = ""
	searchButtonToggle.value = false
}

const {
	setEventCardRef,
	shouldShowBadges,
	shouldShowPeriod,
	shouldShowEpisode,
	shouldShowEpisodeWithPeriod,
	shouldShowEpisodeOnly,
	shouldUseLongEpisodeLabel,
	getEpisodeLabel,
	getPeriodTextClass,
	getBadgeSize,
	getEventStyleVars
} = useAiringSchedules()

const { airingAtGreater, airingAtLesser, dateRange } = storeToRefs(store)
const rangeStart = computed(() => dateRange.value.start.toISOString())
const rangeEnd = computed(() => dateRange.value.end.toISOString())

const {
	data: calendarData,
	error: calendarError,
	refresh: refreshCalendarData,
	status: calendarStatus
} = await useFetch<CalendarApiResponse>("/api/calendar", {
	query: computed(() => ({
		airingAtGreater: airingAtGreater.value,
		airingAtLesser: airingAtLesser.value,
		rangeStart: rangeStart.value,
		rangeEnd: rangeEnd.value
	})),
	watch: [airingAtGreater, airingAtLesser, rangeStart, rangeEnd],
	default: () => ({
		airingSchedules: [],
		simuldubs: [],
		missingMedia: [],
		warnings: []
	})
})

const airingSchedules = computed(() => calendarData.value.airingSchedules)
const simuldubs = computed(() => calendarData.value.simuldubs)

const missingSimuldubMediaById = computed(() => {
	const map = new Map<number, CalendarMedia>()
	calendarData.value.missingMedia.forEach((media) => {
		map.set(media.id, media)
	})
	return map
})

const toast = useToast()
const isLoadingCalendar = computed(() => calendarStatus.value === "pending")
const delayedPending = refDebounced(isLoadingCalendar, 500)

function isCancelled(event: { status?: string }) {
	return event.status === "cancelled"
}

function isUnconfirmed(event: { status?: string }) {
	return event.status === "unconfirmed"
}

watch(delayedPending, (pending) => {
	if (pending) {
		toast.add({
			id: "loading-calendar-data",
			title: "Loading airing schedules and simuldubs",
			icon: "i-lucide-loader-circle",
			close: false,
			progress: false,
			ui: {
				icon: "animate-spin"
			}
		})
	} else {
		toast.remove("loading-calendar-data")
	}
})

const allCalendarEvents = computed(() =>
	buildCalendarEvents(
		airingSchedules.value,
		simuldubs.value,
		missingSimuldubMediaById.value
	)
)

const availableLanguages = computed(() =>
	[...new Set(allCalendarEvents.value.flatMap(event => event.languages))]
)

watch(availableLanguages, (languages) => {
	store.setAvailableDubbingOptions(languages)
}, { immediate: true })

const items = computed(() => store.getFilterMenuItems(availableLanguages.value))

const filteredCalendarEvents = computed(() => {
	const search = searchQuery.value.trim().toLocaleLowerCase()

	return allCalendarEvents.value.filter((event) => {
		const format = event.media.format
		const formatMatch = !format || store.currentFormat.includes(format)
		let statusMatch = true
		if (store.currentStatus.length > 0 && entriesInitialized.value) {
			const listEntry = animeEntries.value.find(entry => entry.media?.id === event.media.id)
			statusMatch = Boolean(listEntry?.status && store.currentStatus.includes(listEntry.status))
		}
		const languageMatch = event.languages.length === 0
			|| event.languages.some(language => store.dubbing.includes(language))
		const searchableTitles = [
			event.title,
			event.media.title?.english,
			event.media.title?.romaji,
			event.media.title?.native
		]
			.filter((title): title is string => Boolean(title))
			.map(title => title.toLocaleLowerCase())
		const searchMatch = !search || searchableTitles.some(title => title.includes(search))
		return formatMatch && statusMatch && languageMatch && searchMatch
	})
})

const hasCalendarWarning = computed(() => calendarData.value.warnings.length > 0)
const showEmptyState = computed(() =>
	calendarStatus.value !== "pending"
	&& !calendarError.value
	&& filteredCalendarEvents.value.length === 0
)
const calendarStatusMessage = computed(() => {
	if (calendarStatus.value === "pending") return "Loading calendar events."
	if (calendarError.value) return "The calendar could not be loaded."
	if (hasCalendarWarning.value) {
		return `Loaded ${filteredCalendarEvents.value.length} events without simuldub details.`
	}
	return `Loaded ${filteredCalendarEvents.value.length} calendar events.`
})

function getEventAriaLabel(event: CalendarEvent) {
	const details = [
		event.title,
		event.episode ? `episode ${event.episode}` : null,
		event.status === "cancelled" ? "cancelled" : null,
		event.status === "unconfirmed" ? "unconfirmed" : null
	].filter((value): value is string => Boolean(value))

	return details.join(", ")
}

async function refreshCalendar() {
	await refreshCalendarData()
}

const onCalendarReady = () => {
	vueCalRef.value?.view?.scrollToCurrentTime()
}

let scrollTimer: ReturnType<typeof setTimeout> | undefined

const scheduleScrollToCurrentTime = () => {
	if (scrollTimer) clearTimeout(scrollTimer)
	scrollTimer = setTimeout(() => {
		vueCalRef.value?.view?.scrollToCurrentTime()
	}, 500)
}

const onViewChange = (view: VueCalView) => {
	store.setDateRangeFromView(view)
	scheduleScrollToCurrentTime()
}

onMounted(() => {
	if (window.matchMedia("(max-width: 639px)").matches && store.currentView === "week") {
		store.currentView = "day"
	}

	if (userStore.isAuthenticated && !entriesInitialized.value) {
		void entriesStore.fetchAllAnimes().catch(() => undefined)
	}

	scheduleScrollToCurrentTime()
})

onBeforeUnmount(() => {
	if (scrollTimer) clearTimeout(scrollTimer)
	toast.remove("loading-calendar-data")
})
</script>

<style>
.vuecal.vuecal--default-theme {
	--vuecal-primary-color: transparent !important;
	--vuecal-event-border-color: transparent !important;
	--vuecal-height: 100dvh !important;
	--vuecal-weekday-bar-size: 3rem !important;
	--vuecal-schedules-bar-size: 0rem !important;
	--vuecal-min-cell-size: 1rem !important;

	--vuecal-border-color: var(--ui-border);
	--vuecal-header-color: transparent;
	--vuecal-event-color: transparent;
	--vuecal-event-border-color: none;
	--vuecal-base-color: var(--text-color-default);

	.vuecal__weekdays-headings {
		background-color: var(--ui-bg-muted) !important;
	}

	.vuecal__weekday {
		background-color: transparent;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.vuecal__time-column {
		border-right: none;
		background-color: transparent;
	}

	.vuecal__time-cell {
		color: var(--text-color-highlighted);
	}

	.vuecal__cell {
		position: relative;
		box-shadow: none;
		border-right: 1px solid var(--vuecal-border-color);
		border-bottom: 1px solid var(--vuecal-border-color);
	}

	.vuecal__cell:last-child {
		border-right: none;
	}

	.vuecal__event {
		min-height: 2rem;
	}

	.vuecal__event-details {
		padding: 0 !important;
		background-color: var(--ui-bg) !important;
		border-radius: var(--radius-lg) !important;
		width: 100% !important;
		height: 100% !important;
		margin: 0 0.125rem !important;
	}

	.vuecal__scrollable-wrap {
		background-color: var(--ui-bg-muted);
		border-top-left-radius: var(--radius-lg);
		border-left: 1px solid var(--border-color-muted);
		border-top: 1px solid var(--border-color-muted);
		overflow: hidden !important;
	}

	.vuecal__scrollable {
		overflow-x: auto !important;
		overflow-y: auto !important;
	}

	.vuecal__body {
		position: relative;
		background-color: var(--ui-bg);
		border-top-left-radius: var(--radius-2xl);
	}
}

@media (max-width: 639px) {
	.vuecal--week-view {
		--vuecal-min-cell-size: 7rem !important;
	}
}

.vuecal__cell--today {
	background-color: color-mix(in srgb, var(--ui-bg-muted) 25%, transparent) !important;
}

.vuecal__week-number {
	width: 3rem !important;

	small {
		color: var(--text-color-muted) !important;
		background-color: transparent !important;

		&:before {
			content: "W";
		}
	}
}

.calendar-event-title {
	--event-width-font-bonus: 0;
	--event-title-line-height: 1.18;
	--event-title-min-size: 0.625rem;
	--event-title-max-size: 1rem;

	display: block;
	display: -webkit-box;
	-webkit-box-orient: vertical;
	line-clamp: var(--event-title-lines, 2);
	-webkit-line-clamp: var(--event-title-lines, 2);
	overflow: ellipsis;
	font-size: clamp(var(--event-title-min-size),
			calc(0.58rem + (var(--event-font-scale, 1) * 0.12rem) + (var(--event-width-font-bonus) * 1rem)),
			var(--event-title-max-size));
	line-height: var(--event-title-line-height);
	overflow: clip;
	white-space: normal;
	word-break: break-word;
	overflow-wrap: anywhere;
}

.calendar-event-card {
	container-type: inline-size;
	container-name: event-card;
}

@container event-card (max-width: 90px) {
	.calendar-event-title {
		--event-width-font-bonus: -0.06;
	}
}

@container event-card (min-width: 91px) and (max-width: 130px) {
	.calendar-event-title {
		--event-width-font-bonus: -0.02;
	}
}

@container event-card (min-width: 170px) {
	.calendar-event-title {
		--event-width-font-bonus: 0.03;
	}
}
</style>
