<template>
	<UDashboardPanel id="calendar" class="relative h-[calc(100dvh-3.5rem)] min-w-0 lg:h-dvh">
		<div class="sr-only" aria-live="polite">
			{{ calendarStatusMessage }}
		</div>

		<!--
			The grid is laid out in the visitor's time zone (day columns, event positions, today), which
			the server cannot know: rendering it there produced hydration mismatches for every visitor
			outside the server's zone. Only the grid is client-only; the loader below covers it until
			vue-cal reports ready, exactly as it did over the server-rendered grid.
		-->
		<ClientOnly>
		<vue-cal ref="vueCalRef" v-model:view="store.currentView" :time-step="store.timeStep" time-at-cursor week-numbers
			aria-label="Anime release calendar" :twelve-hour="twelveHourClock"
			:views="['day', 'week', 'month']" :events="filteredCalendarEvents" @wheel="store.handleWheel"
			:time-cell-height="store.currentView === 'day' ? 96 : store.currentView === 'week' ? 64 : 48"
			@ready="onCalendarReady" @view-change="onViewChange">
			<template #header="{ view, availableViews }">
				<div class="flex min-h-16 flex-wrap items-center gap-2 bg-default p-3 sm:flex-nowrap sm:px-6">
					<div class="flex min-w-0 flex-1 items-center gap-1 sm:gap-2">
						<h1 class="me-auto inline-flex min-w-0 flex-wrap items-baseline gap-x-1 text-lg font-light text-muted sm:me-4 sm:gap-x-2 sm:text-2xl">
							<strong class="font-bold capitalize text-default">
								{{ view.start.format('MMMM') }}
							</strong>
							{{ view.start.format('YYYY') }}
							<UTooltip v-if="store.isWeekView" :text="`Week ${view.start.getWeek()}`">
								<span class="ms-1 text-sm font-medium text-primary">
									<span aria-hidden="true">W {{ view.start.getWeek() }}</span>
									<span class="sr-only">Week {{ view.start.getWeek() }}</span>
								</span>
							</UTooltip>
							<span v-else-if="store.isDayView" class="ms-1 text-sm font-medium text-primary">
								<span class="sm:hidden">{{ formatDayLabel(view.start, 'short') }}</span>
								<span class="hidden sm:inline">{{ formatDayLabel(view.start, 'long') }}</span>
							</span>
						</h1>
						<UButton label="Today" size="xs" color="neutral" variant="soft" @click="view.goToToday()"
							class="cursor-pointer" :class="TOUCH_TARGET" />
						<div class="flex items-center gap-1 sm:gap-2">
							<UButton icon="i-lucide-chevron-left" size="xs" variant="ghost" color="neutral" class="cursor-pointer"
								:class="TOUCH_TARGET_SQUARE"
								aria-label="Previous period"
								@click="view.previous()" />
							<UButton icon="i-lucide-chevron-right" size="xs" variant="ghost" color="neutral" class="cursor-pointer"
								:class="TOUCH_TARGET_SQUARE"
								aria-label="Next period"
								@click="view.next()" />
						</div>
						<p v-if="myListSummary" aria-hidden="true" class="ms-2 hidden truncate text-xs text-muted xl:block">
							{{ myListSummary }}
						</p>
					</div>
					<div class="flex w-full min-w-0 items-center justify-end gap-2 overflow-x-auto sm:w-auto sm:overflow-visible">
						<UInput ref="inputRef" v-model="searchQuery" icon="i-lucide-search" placeholder="Search..." variant="soft"
							size="sm" color="neutral" aria-label="Search calendar events" name="calendar-search"
							@blur="closeSearch" @keyup.esc="clearSearch"
							class="shrink-0"
							:ui="searchButtonToggle
								? { base: `w-48 sm:w-64 transition-[width,color] placeholder:text-muted duration-300 ease-in-out bg-elevated ${TOUCH_TARGET}`, leading: 'ps-1' }
								: { base: `w-8 px-0 transition-[width,color] placeholder:text-transparent duration-300 ease-in-out bg-elevated ${TOUCH_TARGET_SQUARE}`, leading: 'inset-0 justify-center ps-0' }">
							<template #leading>
								<UButton icon="i-lucide-search" aria-label="Open calendar search" @click="openSearch" size="xs" variant="link" color="neutral" :class="searchButtonToggle
									? 'cursor-default text-muted'
									: 'size-full cursor-pointer justify-center text-default'" />
							</template>
						</UInput>
						<UPopover v-if="!hasIdentity" v-model:open="myListHelpOpen" :content="{ align: 'end', sideOffset: 8 }">
							<UButton label="My list" icon="i-lucide-bookmark" size="sm" color="neutral" variant="soft"
								aria-pressed="false" class="shrink-0 cursor-pointer rounded-full" :class="TOUCH_TARGET" />
							<template #content>
								<div class="flex w-72 max-w-[calc(100vw-2rem)] flex-col items-start gap-2 p-4">
									<p class="text-sm font-semibold text-highlighted">
										Show only your anime
									</p>
									<p class="text-xs text-muted">
										My list keeps the titles on your Watching and Planning lists. It needs an AniList sign-in or a public profile name.
									</p>
									<UButton label="Sign in" size="sm" color="primary" class="rounded-full" :to="loginTarget" />
								</div>
							</template>
						</UPopover>
						<UButton v-else label="My list"
							:icon="listLoading ? 'i-lucide-loader-circle' : 'i-lucide-bookmark'" size="sm"
							:color="myListOn ? 'primary' : 'neutral'"
							:variant="myListOn && !listLoading ? 'solid' : 'soft'"
							:aria-pressed="myListOn" :aria-busy="myListOn && listLoading ? true : undefined"
							:ui="{ leadingIcon: listLoading ? 'animate-spin' : '' }"
							class="shrink-0 cursor-pointer rounded-full" :class="TOUCH_TARGET" @click="toggleMyList" />
						<UChip :show="hasStatusFilter" color="primary" size="md" inset class="shrink-0">
							<UDropdownMenu :items="items" size="sm" :ui="{ item: 'cursor-pointer' }">
								<UButton icon="i-lucide-list-filter" size="sm" color="neutral" variant="soft"
									:aria-label="hasStatusFilter ? 'Filter calendar events, filters active' : 'Filter calendar events'"
									class="h-fit cursor-pointer" :class="TOUCH_TARGET_SQUARE" />
							</UDropdownMenu>
						</UChip>
						<UTabs v-model="store.currentView" size="xs" class="w-fit" color="neutral"
							aria-label="Calendar view"
							:ui="{ root: 'gap-0 shrink-0', trigger: `cursor-pointer ${TOUCH_TARGET}` }"
							:items="Object.keys(availableViews).map((viewKey: string) => ({ label: String(viewKey).charAt(0).toUpperCase() + String(viewKey).slice(1), value: viewKey }))" />
					</div>
				</div>
			</template>
			<template #weekday-heading="{ date }">
				<UButton size="sm" :color="date.isToday() ? 'primary' : 'neutral'" :variant="date.isToday() ? 'solid' : 'soft'"
					class="rounded-full uppercase m-2"
					:aria-current="date.isToday() ? 'date' : undefined"
					:class="store.isMonthView ? 'max-sm:mx-0.5 max-sm:px-1.5' : 'cursor-pointer'"
					@click="!store.isMonthView ? vueCalRef?.view.switch('day', date) : ''">
					<template v-if="store.isMonthView">
						<span class="sm:hidden">{{ weekdayFormatters.short.format(date) }}</span>
						<span class="hidden sm:inline">{{ date.format("dddd") }}</span>
					</template>
					<template v-else>
						{{ date.format("dddd") }}
					</template>
					<strong v-if="!store.isMonthView" class="font-bold">{{ date.format('DD') }}</strong>
				</UButton>
			</template>
			<template #event="{ event }">
				<AnimeDetailsPopover :data="event" :content="{ sideOffset: 32 }">
					<button
						type="button"
						:aria-label="getEventAriaLabel(event)"
						:title="event.title"
						class="calendar-event-card relative flex size-full cursor-pointer flex-col justify-center gap-0.5 overflow-hidden rounded-lg border-l-4 border-(--anime-theme-color) bg-(--anime-theme-color)/25 px-1.5 py-1 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
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
						<span v-if="shouldShowPeriod(event, store.timeStep)"
							class="shrink-0 truncate font-normal text-default"
							:class="[isCancelled(event) && 'opacity-25', getPeriodTextClass(event, store.timeStep)]">{{
								shouldShowEpisodeWithPeriod(event, store.timeStep)
		? `${getEpisodeLabel(event.episode, shouldUseLongEpisodeLabel(event))} | ${formatEventPeriod(event.start, event.end)}`
		: shouldShowEpisodeOnly(event, store.timeStep)
			? getEpisodeLabel(event.episode, shouldUseLongEpisodeLabel(event))
				: formatEventPeriod(event.start, event.end)
							}}</span>
						<div v-if="shouldShowBadges(event, store.timeStep)" class="flex shrink-0 items-center gap-2"
							:class="isCancelled(event) && 'opacity-25'">
							<template v-if="event.streaming.length">
								<UBadge v-for="platform in event.streaming" :key="platform" :label="platform"
									:size="getBadgeSize(event, store.timeStep)" variant="subtle"
									class="ring-(--anime-theme-color)/25 bg-(--anime-theme-color)/25 text-default"
									:class="getBadgeSize(event, store.timeStep) === 'sm' && BADGE_FLOOR"
									:style="{ '--anime-theme-color': event.media?.coverImage?.color || 'var(--ui-color-primary-500)' }" />
							</template>
							<UBadge v-else-if="event.media?.format" :label="event.media?.format"
								:size="getBadgeSize(event, store.timeStep)" variant="subtle"
								class="ring-(--anime-theme-color)/25 bg-(--anime-theme-color)/25 text-default"
								:class="getBadgeSize(event, store.timeStep) === 'sm' && BADGE_FLOOR"
								:style="{ '--anime-theme-color': event.media?.coverImage?.color || 'var(--ui-color-primary-500)' }" />
							<span v-if="event.languages.length" class="inline-flex items-center gap-1"
								:title="getEventAudioLabel(event)">
								<Icon v-for="language in event.languages" :key="language" :name="`circle-flags:${language}`"
									class="size-3" aria-hidden="true" />
							</span>
						</div>
					</button>
				</AnimeDetailsPopover>
			</template>
			<template v-if="store.isMonthView" #cell="{ cell }">
				<button type="button" :aria-label="getMonthCellName(cell.start)"
					:aria-current="cell.start.isToday() ? 'date' : undefined"
					class="calendar-month-cell relative flex size-full cursor-pointer flex-col gap-1 p-1 text-left transition-colors hover:bg-elevated/70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary sm:p-2"
					@click="vueCalRef?.view?.switch('week', cell.start)">
					<span class="flex items-center justify-between gap-1">
						<span v-if="getDaySummary(cell.start)?.onListEpisodes"
							class="inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums text-primary"
							data-calendar-day-on-list>
							<UIcon name="i-lucide-bookmark-check" class="size-3.5 shrink-0" />
							<span class="hidden sm:inline">{{ getDaySummary(cell.start)?.onListEpisodes }}</span>
						</span>
						<span class="ms-auto inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs tabular-nums"
							:class="cell.start.isToday()
								? 'bg-primary font-bold text-inverted'
								: 'calendar-month-date font-medium text-default'">
							{{ cell.start.format('D') }}
						</span>
					</span>
					<span v-if="getDaySummary(cell.start)" class="mt-auto flex min-w-0 flex-col gap-1">
						<span class="text-sm font-semibold tabular-nums text-highlighted sm:text-base" data-calendar-day-count>
							{{ getDaySummary(cell.start)?.episodes }}
							<span class="hidden text-xs font-normal text-muted lg:inline">
								{{ getDaySummary(cell.start)?.episodes === 1 ? 'episode' : 'episodes' }}
							</span>
						</span>
						<span class="hidden items-center gap-1 sm:flex">
							<span v-for="title in getDaySummary(cell.start)?.titles" :key="title.mediaId"
								class="size-2.5 shrink-0 rounded-full ring-1 ring-default"
								:class="title.onList && 'outline-2 outline-offset-1 outline-primary'"
								:style="{ backgroundColor: title.color || 'var(--ui-color-primary-400)' }" />
							<span v-if="getDaySummary(cell.start)?.moreTitles" class="text-[11px] leading-none text-muted">
								+{{ getDaySummary(cell.start)?.moreTitles }}
							</span>
						</span>
					</span>
				</button>
			</template>
		</vue-cal>
			<template #fallback>
				<h1 class="sr-only">
					Anime calendar
				</h1>
			</template>
		</ClientOnly>

		<Transition name="calendar-ready">
			<div
				v-if="showCalendarLoader"
				class="absolute inset-0 z-60 flex bg-default"
				aria-label="Loading calendar">
				<PageLoadingState
					class="min-h-full rounded-none"
					label="Preparing your calendar"
					description="Loading releases and waiting for the calendar layout to settle." />
			</div>
		</Transition>

		<div
			v-if="showEmptyState || showTruncatedWarning"
			class="pointer-events-none absolute bottom-4 right-4 z-40 flex max-w-xs flex-col gap-2">
			<UAlert
				v-if="showTruncatedWarning"
				color="warning"
				variant="subtle"
				icon="i-lucide-triangle-alert"
				description="Your list was only partly loaded. Some titles may be missing." />
			<div
				v-if="showEmptyState"
				class="rounded-lg border border-default bg-default/95 px-4 py-3 text-sm text-muted shadow-sm"
				role="status">
				{{ emptyStateMessage }}
			</div>
		</div>
	</UDashboardPanel>
</template>

<script lang="ts" setup>
import { VueCal, addDatePrototypes, type VueCalView } from "vue-cal"
import "vue-cal/style"
import { FEATURE_REGISTRY } from "#shared/config/features"
import { useAiringSchedules } from "~/composables/useAiringSchedules"
import { MY_LIST_STATUSES, useCalendarStore } from "~/stores/Calendar"
import type {
	CalendarApiResponse,
	CalendarEvent
} from "~/types/calendar"
import { getEventAudioLabel } from "~/utils/calendar-audio"
import {
	buildCalendarEventsFromResponse,
	filterCalendarEventsByListStatus
} from "~/utils/calendar-events"
import {
	getCalendarDayKey,
	getMonthCellLabel,
	summariseCalendarDays
} from "~/utils/calendar-month"

// Header controls stay compact with a mouse and grow to a 44px target on touch or a phone.
const TOUCH_TARGET = "max-sm:min-h-11 pointer-coarse:min-h-11"
const TOUCH_TARGET_SQUARE = `${TOUCH_TARGET} max-sm:min-w-11 pointer-coarse:min-w-11 justify-center`
// Nuxt UI's small badge is 10px: chips keep an 11px floor.
const BADGE_FLOOR = "px-1.5 py-0.5 text-[11px]/4"

definePageMeta({
	feature: "calendar",
	auth: FEATURE_REGISTRY.calendar.access,
	indexable: FEATURE_REGISTRY.calendar.indexable
})

const store = useCalendarStore()
const userStore = useUserStore()
const entriesStore = useEntriesStore()
const preferences = usePreferencesStore()
const route = useRoute()
const {
	getAllAnimes: animeEntries,
	isInitialized: entriesInitialized,
	truncated: entriesTruncated
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
const calendarReady = ref(false)
const searchButtonToggle = ref(false)
const searchQuery = ref("")
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
	// No `watch`: the reactive query already refetches, and the store replaces the range in one
	// assignment, so a view switch makes exactly one request.
	default: () => ({
		media: {},
		airings: [],
		simuldubs: [],
		warnings: []
	})
})
const { showPageLoader: showCalendarLoader } = useProgressiveLoading(
	computed(() => [calendarStatus.value !== "pending"]),
	{
		allowPartial: false,
		layoutReady: calendarReady
	}
)

const toast = useToast()
const LIST_ERROR_TOAST_ID = "calendar-list-error"

const {
	display: timeDisplay,
	ready: timeDisplayReady,
	formatClockTime
} = useTimeDisplay()

// This page is server-rendered, and the server knows neither the visitor's zone nor the
// choices kept in localStorage. Until the page is mounted the labels and the grid keep the
// 24-hour local clock they always had, so the server HTML and the first client render match.
const twelveHourClock = computed(() =>
	timeDisplayReady.value && timeDisplay.value.hourCycle === "h12"
)

function formatLocalClock(date: Date): string {
	const pad = (value: number) => String(value).padStart(2, "0")
	return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** Only the printed times follow the chosen zone; vue-cal lays the grid out in the browser's. */
function formatEventPeriod(start: Date, end: Date): string {
	const format = timeDisplayReady.value ? formatClockTime : formatLocalClock
	return `${format(start)} - ${format(end)}`
}

function isCancelled(event: { status?: string }) {
	return event.status === "cancelled"
}

function isUnconfirmed(event: { status?: string }) {
	return event.status === "unconfirmed"
}

watch(calendarError, (caughtError) => {
	if (caughtError) {
		// A 4xx means this request itself was refused, which retrying the same period won't fix.
		const rejected = (caughtError.statusCode ?? 0) >= 400 && (caughtError.statusCode ?? 0) < 500
			&& caughtError.statusCode !== 429
		toast.add({
			id: "calendar-load-error",
			title: "Calendar could not be loaded",
			description: rejected
				? "This period can't be loaded. Switch to Week view or move to another month."
				: "AniList broadcasts and simuldub events are temporarily unavailable. Try again in a moment.",
			icon: "i-lucide-circle-alert",
			color: "error",
			duration: 0,
			actions: [{
				label: "Try again",
				color: "error",
				variant: "soft",
				onClick: () => refreshCalendarData()
			}]
		})
	} else {
		toast.remove("calendar-load-error")
	}
}, { immediate: true })

const allCalendarEvents = computed(() => buildCalendarEventsFromResponse(calendarData.value))

const availableLanguages = computed(() =>
	[...new Set(allCalendarEvents.value.flatMap(event => event.languages))]
)

watch(availableLanguages, (languages) => {
	store.setAvailableDubbingOptions(languages)
}, { immediate: true })

const items = computed(() => store.getFilterMenuItems(availableLanguages.value))

const statusByMediaId = computed(() => new Map(
	animeEntries.value.flatMap(entry =>
		entry.media && entry.status ? [[entry.media.id, entry.status] as const] : []
	)
))

// ========== My list and the status filter ==========
// The list belongs to an identity (OAuth session or public profile): a guest has no status filter.
const identity = computed(() =>
	userStore.isAuthenticated && userStore.getUsername
		? `${userStore.authMode ?? "anonymous"}:${userStore.getUsername}`
		: null
)
const hasIdentity = computed(() => identity.value !== null)
const activeStatuses = computed(() => hasIdentity.value ? store.currentStatus : [])
const hasStatusFilter = computed(() => activeStatuses.value.length > 0)
const myListOn = computed(() => hasIdentity.value && store.isMyListActive)
const listLoading = computed(() => hasStatusFilter.value && !entriesInitialized.value)
const myListHelpOpen = ref(false)
const loginTarget = computed(() => ({ path: "/login", query: { redirect: route.fullPath } }))

function toggleMyList() {
	store.setMyList(!store.isMyListActive)
}

const listFilteredEvents = computed(() => {
	if (!hasStatusFilter.value) return allCalendarEvents.value
	// No events until the list is ready: showing everything first would flash, then snap.
	if (listLoading.value) return []
	return filterCalendarEventsByListStatus(
		allCalendarEvents.value,
		statusByMediaId.value,
		activeStatuses.value
	)
})

const filteredCalendarEvents = computed(() => {
	const search = searchQuery.value.trim().toLocaleLowerCase()

	return listFilteredEvents.value.filter((event) => {
		const format = event.media.format
		const formatMatch = !format || store.currentFormat.includes(format)
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
		return formatMatch && languageMatch && searchMatch
	})
})

const hasCalendarWarning = computed(() => calendarData.value.warnings.length > 0)

function syncCalendarWarningToast(hasWarning: boolean) {
	if (hasWarning) {
		toast.add({
			id: "calendar-simuldub-warning",
			title: "Some simuldub details are unavailable",
			description: "AniList broadcasts are still displayed in the calendar.",
			icon: "i-lucide-triangle-alert",
			color: "warning"
		})
		return
	}

	toast.remove("calendar-simuldub-warning")
}
const showEmptyState = computed(() =>
	calendarStatus.value !== "pending"
	&& !calendarError.value
	&& !listLoading.value
	&& filteredCalendarEvents.value.length === 0
)
const emptyStateMessage = computed(() => myListOn.value
	? "None of the titles on your Watching or Planning list air in this period."
	: "No events match the current search and filters."
)
const showTruncatedWarning = computed(() =>
	hasStatusFilter.value && !listLoading.value && entriesTruncated.value
)

function countEvents(count: number) {
	return `${count} ${count === 1 ? "event" : "events"}`
}

const myListSummary = computed(() => {
	if (calendarStatus.value === "pending" || calendarError.value) return ""
	if (listLoading.value) return "Loading your list"
	if (!myListOn.value) return ""
	return `${countEvents(filteredCalendarEvents.value.length)} from your list this ${store.currentView}`
})
const calendarStatusMessage = computed(() => {
	if (calendarStatus.value === "pending") return "Loading calendar events."
	if (calendarError.value) return "The calendar could not be loaded."
	if (listLoading.value) return "Loading your list"
	if (myListOn.value) return `My list on, ${countEvents(filteredCalendarEvents.value.length)}`
	if (hasCalendarWarning.value) {
		return `Loaded ${filteredCalendarEvents.value.length} events without simuldub details.`
	}
	return `Loaded ${filteredCalendarEvents.value.length} calendar events.`
})

// vue-cal's own short weekday token needs a locale pack this page does not load.
const weekdayFormatters = {
	short: new Intl.DateTimeFormat("en", { weekday: "short" }),
	long: new Intl.DateTimeFormat("en", { weekday: "long" })
}

/** "Wed 11" on a phone, "Wednesday 11" from the sm breakpoint: the day shown by the Day view. */
function formatDayLabel(day: Date, style: keyof typeof weekdayFormatters) {
	return weekdayFormatters[style].format(day) + " " + day.getDate()
}

// ========== Month view ==========
// The list is only read when the Entries store already holds it: the month view never asks for it.
const onListMediaIds = computed(() => {
	if (!hasIdentity.value || !entriesInitialized.value) return undefined
	const tracked = new Set<string>(MY_LIST_STATUSES)
	return new Set(
		[...statusByMediaId.value].flatMap(([mediaId, status]) => tracked.has(status) ? [mediaId] : [])
	)
})

const daySummaries = computed(() => store.isMonthView
	? summariseCalendarDays(filteredCalendarEvents.value, { onListMediaIds: onListMediaIds.value })
	: new Map<string, never>()
)

function getDaySummary(day: Date) {
	return daySummaries.value.get(getCalendarDayKey(day))
}

function getMonthCellName(day: Date & { format: (pattern: string) => string, isToday: () => boolean }) {
	return getMonthCellLabel(day.format("MMMM D"), getDaySummary(day), { today: day.isToday() })
}

function getEventAriaLabel(event: CalendarEvent) {
	const details = [
		event.title,
		event.episode ? `episode ${event.episode}` : null,
		event.status === "cancelled" ? "cancelled" : null,
		event.status === "unconfirmed" ? "unconfirmed" : null,
		getEventAudioLabel(event) || null
	].filter((value): value is string => Boolean(value))

	return details.join(", ")
}

const onCalendarReady = () => {
	// The first range was computed where the page was rendered. A server in another time zone
	// loads a week shifted by its offset: align it with the week this browser displays. Equal
	// ranges are ignored by the store, so the usual case makes no second request.
	const view = vueCalRef.value?.view
	if (view) store.setDateRangeFromView(view)
	requestAnimationFrame(() => {
		vueCalRef.value?.view?.scrollToCurrentTime()
		calendarReady.value = true
	})
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
	watch(hasCalendarWarning, syncCalendarWarningToast, { immediate: true })
	if (window.matchMedia("(max-width: 639px)").matches && store.currentView === "week") {
		store.currentView = "day"
	}

	// Runs on mount and whenever the identity changes. The remembered choice lives in the browser,
	// so it is only applied here, never during server rendering.
	watch(identity, (currentIdentity) => {
		if (!currentIdentity) {
			// A guest has no list: drop the filter instead of showing it active with nothing behind it.
			if (store.currentStatus.length > 0) store.setStatuses([])
			return
		}
		myListHelpOpen.value = false
		if (store.currentStatus.length > 0) {
			// The list only serves the status filter: (re)load it for this identity.
			store.refreshList()
		} else if (preferences.calendarMyList) {
			store.setStatuses(MY_LIST_STATUSES)
		}
	}, { immediate: true })

	watch(() => store.listError, (failed) => {
		if (!failed) return
		const failedStatuses = [...store.currentStatus]
		const wasMyList = store.isMyListActive
		// Never leave a filter ticked that silently shows everything.
		store.setStatuses([])
		toast.add({
			id: LIST_ERROR_TOAST_ID,
			title: "Your list could not be loaded",
			description: wasMyList ? "My list was turned off." : "The status filter was turned off.",
			icon: "i-lucide-circle-alert",
			color: "error",
			duration: 0,
			actions: [{
				label: "Try again",
				color: "error",
				variant: "soft",
				onClick: () => store.setStatuses(failedStatuses)
			}]
		})
	}, { immediate: true })

	watch(() => store.currentStatus.length, (count) => {
		if (count > 0) toast.remove(LIST_ERROR_TOAST_ID)
	})

	scheduleScrollToCurrentTime()
})

onBeforeUnmount(() => {
	if (scrollTimer) clearTimeout(scrollTimer)
	toast.remove("calendar-load-error")
	toast.remove("calendar-simuldub-warning")
	toast.remove(LIST_ERROR_TOAST_ID)
})
</script>

<style>
.vuecal.vuecal--default-theme {
	--vuecal-primary-color: transparent !important;
	--vuecal-event-border-color: transparent !important;
	/* The mobile navbar (3.5rem, see layouts/default.vue) sits above the calendar below lg. */
	--vuecal-height: calc(100dvh - 3.5rem) !important;
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
		color: var(--ui-text-muted);
	}

	/* vue-cal prints the hour labels at 50% opacity (40% for the first one). */
	.vuecal__time-cell label {
		opacity: 1 !important;
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
		/* vue-cal splits a column evenly between overlapping events: keep a 24px target. */
		min-width: 1.5rem;
	}

	.vuecal__event:hover,
	.vuecal__event:focus-within {
		z-index: 5;
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

@media (min-width: 64rem) {
	.vuecal.vuecal--default-theme {
		--vuecal-height: 100dvh !important;
	}
}

/* Days of the neighbouring months: quieter, still readable. */
.vuecal--month-view .vuecal__cell--out-of-range {
	background-color: var(--ui-bg-muted);
}

.vuecal__cell--out-of-range .calendar-month-date {
	color: var(--ui-text-muted);
}

.vuecal__cell--today {
	background-color: color-mix(in oklab, var(--ui-primary) 6%, transparent) !important;
}

.vuecal__week-number {
	width: 3rem !important;

	small {
		color: var(--text-color-muted) !important;
		background-color: transparent !important;

		&:before {
			content: "W";
			content: "W" / "Week ";
		}
	}
}

.calendar-event-title {
	--event-width-font-bonus: 0;
	--event-title-line-height: 1.25;
	--event-title-min-size: 0.6875rem;
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

.calendar-ready-enter-active,
.calendar-ready-leave-active {
	transition: opacity 240ms ease;
}

.calendar-ready-enter-from,
.calendar-ready-leave-to {
	opacity: 0;
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
