import { defineStore } from "pinia"
import { getTime } from "date-fns"
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

export const useCalendarStore = defineStore("Calendar", () => {
	const userStore = useUserStore()
	const entriesStore = useEntriesStore()

	// ========== Refs UI ==========
	const currentView = ref<CalendarView>("week")
	const timeStep = ref(20)

	// ========== Date Range ==========
	const calendarRange = getCalendarRange()

	const dateRange = reactive<{ start: Date, end: Date }>({ start: new Date(calendarRange.start), end: new Date(calendarRange.end) })
	const airingAtGreater = computed(() => Math.floor(getTime(dateRange.start) / 1000))
	const airingAtLesser = computed(() => Math.floor(getTime(dateRange.end) / 1000))

	// ========== Filtres ==========
	const currentFormat = ref<string[]>(["TV", "ONA", "MOVIE"])
	const currentStatus = ref<string[]>([])
	const dubbing = ref<string[]>(["jp", "cn", "en", "fr"])

	// ========== Getters ==========
	const isMonthView = computed(() => currentView.value === "month")
	const isDayView = computed(() => currentView.value === "day")
	const isWeekView = computed(() => currentView.value === "week")

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
	}

	const toggleDubbing = (lang: string) => {
		const index = dubbing.value.indexOf(lang)
		if (index > -1) {
			dubbing.value.splice(index, 1)
		} else {
			dubbing.value.push(lang)
		}
	}

	const setAvailableDubbingOptions = (availableLanguages: string[]) => {
		const normalizedLanguages = [...new Set(availableLanguages)]
		dubbing.value = dubbing.value.filter(lang => normalizedLanguages.includes(lang))
		normalizedLanguages.forEach((lang) => {
			if (!dubbing.value.includes(lang)) {
				dubbing.value.push(lang)
			}
		})
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
		if (userStore.isAuthenticated && entriesStore.isInitialized) {
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
				(DUBBING_LABELS[left] ?? left).localeCompare(DUBBING_LABELS[right] ?? right)
			)
			.map(language => ({
				label: DUBBING_LABELS[language] ?? language.toUpperCase(),
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

		// Getters
		isMonthView,
		isDayView,
		isWeekView,

		// Actions
		updateDateRange,
		setDateRangeFromView,
		handleWheel,
		toggleFormat,
		toggleDubbing,
		setAvailableDubbingOptions,
		getFilterMenuItems,
		$reset
	}
})
