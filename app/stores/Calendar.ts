import { defineStore } from "pinia"
import type { DropdownMenuItem } from "@nuxt/ui"
import {
	getCalendarViewRange,
	type CalendarViewRangeInput
} from "~/utils/calendarRange"

type CalendarView = "day" | "week" | "month"

const DUBBING_LABELS: Readonly<Record<string, string>> = {
	cn: "Chinese",
	en: "English",
	fr: "French",
	jp: "Japanese",
	kr: "Korean"
}

/** Dubbing languages are stored as the country code of their flag icon; this is the readable name. */
export function getDubbingLabel(code: string): string {
	return DUBBING_LABELS[code] ?? code.toUpperCase()
}

/** The list statuses the header "My list" toggle stands for. */
export const MY_LIST_STATUSES = ["CURRENT", "PLANNING"] as const

export const useCalendarStore = defineStore("Calendar", () => {
	const userStore = useUserStore()
	const entriesStore = useEntriesStore()
	const preferences = usePreferencesStore()

	// ========== Refs UI ==========
	const currentView = ref<CalendarView>("week")
	const timeStep = ref(20)

	// ========== Date Range ==========
	const calendarRange = getCalendarRange()

	const dateRange = reactive<{ start: Date, end: Date }>({ start: new Date(calendarRange.start), end: new Date(calendarRange.end) })
	const airingAtGreater = computed(() => Math.floor(dateRange.start.getTime() / 1000))
	const airingAtLesser = computed(() => Math.floor(dateRange.end.getTime() / 1000))

	// ========== Filtres ==========
	const currentFormat = ref<string[]>(["TV", "ONA", "MOVIE"])
	const currentStatus = ref<string[]>([])
	const dubbing = ref<string[]>(["jp", "cn", "en", "fr"])
	// Languages the user explicitly unticked; they stay unticked across date ranges.
	const excludedDubbing = ref<string[]>([])
	// True when the list behind the status filter could not be loaded.
	const listError = ref(false)
	// Only the latest list request may report a failure.
	let listRequest = 0

	// ========== Getters ==========
	const isMonthView = computed(() => currentView.value === "month")
	const isDayView = computed(() => currentView.value === "day")
	const isWeekView = computed(() => currentView.value === "week")
	const hasStatusFilter = computed(() => currentStatus.value.length > 0)
	const isMyListActive = computed(() =>
		currentStatus.value.length === MY_LIST_STATUSES.length
		&& MY_LIST_STATUSES.every(status => currentStatus.value.includes(status))
	)

	// ========== Actions Date Range ==========
	const updateDateRange = (start: Date, end: Date) => {
		dateRange.start = start
		dateRange.end = end
	}

	const setDateRangeFromView = (view: CalendarViewRangeInput) => {
		const range = getCalendarViewRange(view)
		if (range) {
			updateDateRange(range.start, range.end)
		}
	}

	// ========== Actions UI ==========
	const handleWheel = (event: WheelEvent) => {
		if (event.ctrlKey) {
			event.preventDefault()
			if (event.deltaY < 0) {
				timeStep.value = Math.max(5, timeStep.value - 5)
			} else {
				timeStep.value = Math.min(120, timeStep.value + 5)
			}
		}
	}

	// ========== Actions Filtres ==========
	const toggleFormat = (format: string) => {
		const index = currentFormat.value.indexOf(format)
		if (index > -1) {
			currentFormat.value.splice(index, 1)
		} else {
			currentFormat.value.push(format)
		}
	}

	const toggleStatus = (format: string) => {
		const index = currentStatus.value.indexOf(format)
		if (index > -1) {
			currentStatus.value.splice(index, 1)
		} else {
			currentStatus.value.push(format)
		}
		// Editing the selection by hand decides whether "My list" is what gets remembered.
		preferences.setCalendarMyList(isMyListActive.value)
		syncList()
	}

	/**
	 * The list only serves the status filter: load it on first use (no-op once loaded).
	 * Resolves to false, and raises `listError`, when the list could not be loaded.
	 */
	const loadList = async (): Promise<boolean> => {
		const request = ++listRequest
		listError.value = false
		if (!userStore.isAuthenticated) return false

		try {
			await entriesStore.fetchAllAnimes()
			return true
		} catch {
			if (request === listRequest && currentStatus.value.length > 0) listError.value = true
			return false
		}
	}

	const syncList = () => {
		if (currentStatus.value.length > 0) {
			void loadList()
			return
		}
		listRequest += 1
		listError.value = false
	}

	const setStatuses = (statuses: readonly string[]) => {
		currentStatus.value = [...new Set(statuses)]
		syncList()
	}

	/** The header toggle: Watching + Planning replace any selection, off clears every status. */
	const setMyList = (active: boolean) => {
		preferences.setCalendarMyList(active)
		setStatuses(active ? MY_LIST_STATUSES : [])
	}

	/** Refetches the list for the current identity while a status filter is active. */
	const refreshList = () => {
		if (currentStatus.value.length > 0) void loadList()
	}

	const toggleDubbing = (lang: string) => {
		const index = dubbing.value.indexOf(lang)
		if (index > -1) {
			dubbing.value.splice(index, 1)
			if (!excludedDubbing.value.includes(lang)) {
				excludedDubbing.value.push(lang)
			}
		} else {
			dubbing.value.push(lang)
			excludedDubbing.value = excludedDubbing.value.filter(excluded => excluded !== lang)
		}
	}

	const setAvailableDubbingOptions = (availableLanguages: string[]) => {
		const normalizedLanguages = [...new Set(availableLanguages)]
		dubbing.value = normalizedLanguages.filter(lang => !excludedDubbing.value.includes(lang))
	}

	// ========== Dropdown Menu Items ==========
	const getFilterMenuItems = (availableLanguages: string[]): DropdownMenuItem[] => {
		const formatItems: DropdownMenuItem[] = [
			{
				label: "Formats", children: [
					{
						label: "TV",
						type: "checkbox",
						checked: currentFormat.value.includes("TV"),
						onUpdateChecked: (_checked: boolean) => toggleFormat("TV"),
						onSelect: (e: Event) => e.preventDefault()
					},
					{
						label: "ONA",
						type: "checkbox",
						checked: currentFormat.value.includes("ONA"),
						onUpdateChecked: (_checked: boolean) => toggleFormat("ONA"),
						onSelect: (e: Event) => e.preventDefault()
					},
					{
						label: "Movie",
						type: "checkbox",
						checked: currentFormat.value.includes("MOVIE"),
						onUpdateChecked: (_checked: boolean) => toggleFormat("MOVIE"),
						onSelect: (e: Event) => e.preventDefault()
					},
					{
						label: "TV Short",
						type: "checkbox",
						checked: currentFormat.value.includes("TV_SHORT"),
						onUpdateChecked: (_checked: boolean) => toggleFormat("TV_SHORT"),
						onSelect: (e: Event) => e.preventDefault()
					},
					{
						label: "OVA",
						type: "checkbox",
						checked: currentFormat.value.includes("OVA"),
						onUpdateChecked: (_checked: boolean) => toggleFormat("OVA"),
						onSelect: (e: Event) => e.preventDefault()
					},
					{
						label: "Specials",
						type: "checkbox",
						checked: currentFormat.value.includes("SPECIAL"),
						onUpdateChecked: (_checked: boolean) => toggleFormat("SPECIAL"),
						onSelect: (e: Event) => e.preventDefault()
					}
				]
			}

		]

		let statusItems: DropdownMenuItem[] = []
		if (userStore.isAuthenticated) {
			statusItems = [
				{
					label: "Status", children: [
						{
							label: "Watching",
							type: "checkbox",
							checked: currentStatus.value.includes("CURRENT"),
							onUpdateChecked: (_checked: boolean) => toggleStatus("CURRENT"),
							onSelect: (e: Event) => e.preventDefault()
						},
						{
							label: "Planning",
							type: "checkbox",
							checked: currentStatus.value.includes("PLANNING"),
							onUpdateChecked: (_checked: boolean) => toggleStatus("PLANNING"),
							onSelect: (e: Event) => e.preventDefault()
						},
						{
							label: "Paused",
							type: "checkbox",
							checked: currentStatus.value.includes("PAUSED"),
							onUpdateChecked: (_checked: boolean) => toggleStatus("PAUSED"),
							onSelect: (e: Event) => e.preventDefault()
						}
					]
				}
			]
		}

		const dubbingItems: DropdownMenuItem[] = [...new Set(availableLanguages)]
			.sort((left, right) =>
				getDubbingLabel(left).localeCompare(getDubbingLabel(right))
			)
			.map(language => ({
				label: getDubbingLabel(language),
				type: "checkbox" as const,
				checked: dubbing.value.includes(language),
				onUpdateChecked: (_checked: boolean) => toggleDubbing(language),
				onSelect: (e: Event) => e.preventDefault()
			}))

		const dubbingLabel: DropdownMenuItem[] = [
			{
				label: "Dubbing", children: [
					...dubbingItems
				]
			}
		]

		return [...formatItems, ...statusItems, ...dubbingLabel]
	}

	// ========== Reset ==========
	const $reset = () => {
		currentView.value = "week"
		timeStep.value = 20
		currentFormat.value = ["TV", "ONA", "MOVIE"]
		currentStatus.value = []
		dubbing.value = ["jp", "cn", "en", "fr"]
		excludedDubbing.value = []
		listRequest += 1
		listError.value = false
	}

	return {
		// UI refs
		currentView,
		timeStep,

		// Date range
		dateRange,
		airingAtGreater,
		airingAtLesser,

		// Filters
		currentFormat,
		currentStatus,
		dubbing,
		listError,

		// Getters
		isMonthView,
		isDayView,
		isWeekView,
		hasStatusFilter,
		isMyListActive,

		// Actions
		updateDateRange,
		setDateRangeFromView,
		handleWheel,
		toggleFormat,
		toggleStatus,
		setStatuses,
		setMyList,
		refreshList,
		toggleDubbing,
		setAvailableDubbingOptions,
		getFilterMenuItems,
		$reset
	}
})
