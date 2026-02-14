import { defineStore } from "pinia"
import { getTime } from "date-fns"
import type { DropdownMenuItem } from "@nuxt/ui"

export const useCalendarStore = defineStore("Calendar", () => {
	// ========== Refs UI ==========
	const currentView = ref("week")
	const timeStep = ref(20)

	// ========== Date Range ==========
	const calendarRange = getCalendarRange()

	const dateRange = reactive<{ start: Date, end: Date }>({ start: new Date(calendarRange.start), end: new Date(calendarRange.end) })
	const airingAtGreater = computed(() => Math.floor(getTime(dateRange.start) / 1000))
	const airingAtLesser = computed(() => Math.floor(getTime(dateRange.end) / 1000))

	// ========== Filtres ==========
	const currentFormat = ref<string[]>(["TV", "ONA", "MOVIE"])
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

	const setDateRangeFromView = (view: { extendedStart: Date, extendedEnd: Date }) => {
		updateDateRange(view.extendedStart, view.extendedEnd)
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

	const toggleDubbing = (lang: string) => {
		const index = dubbing.value.indexOf(lang)
		if (index > -1) {
			dubbing.value.splice(index, 1)
		} else {
			dubbing.value.push(lang)
		}
	}

	const setAvailableDubbingOptions = (availableLanguages: string[]) => {
		// Garde uniquement les langues disponibles dans les événements actuels
		dubbing.value = dubbing.value.filter(lang => availableLanguages.includes(lang))
		// Ajoute les langues par défaut si elles sont disponibles mais pas encore sélectionnées
		const defaultLanguages = ["jp", "cn", "en", "fr"]
		defaultLanguages.forEach((lang) => {
			if (availableLanguages.includes(lang) && !dubbing.value.includes(lang)) {
				dubbing.value.push(lang)
			}
		})
	}

	// ========== Dropdown Menu Items ==========
	const getFilterMenuItems = (availableLanguages: string[]): DropdownMenuItem[] => {
		const formatItems: DropdownMenuItem[] = [
			{ label: "Formats", type: "label" },
			{ type: "separator" },
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

		const dubbingLabel: DropdownMenuItem[] = [
			{ label: "Dubbing", type: "label" },
			{ type: "separator" }
		]

		const dubbingItems: DropdownMenuItem[] = [
			{
				label: "Japanese",
				type: "checkbox",
				disabled: !availableLanguages.includes("jp"),
				checked: dubbing.value.includes("jp"),
				onUpdateChecked: (_checked: boolean) => toggleDubbing("jp"),
				onSelect: (e: Event) => e.preventDefault()
			},
			{
				label: "Chinese",
				type: "checkbox",
				disabled: !availableLanguages.includes("cn"),
				checked: dubbing.value.includes("cn"),
				onUpdateChecked: (_checked: boolean) => toggleDubbing("cn"),
				onSelect: (e: Event) => e.preventDefault()
			}
		]

		if (availableLanguages.includes("en")) {
			dubbingItems.push({
				label: "English",
				type: "checkbox",
				disabled: !availableLanguages.includes("en"),
				checked: dubbing.value.includes("en"),
				onUpdateChecked: (_checked: boolean) => toggleDubbing("en"),
				onSelect: (e: Event) => e.preventDefault()
			})
		}

		if (availableLanguages.includes("fr")) {
			dubbingItems.push({
				label: "French",
				type: "checkbox",
				disabled: !availableLanguages.includes("fr"),
				checked: dubbing.value.includes("fr"),
				onUpdateChecked: (_checked: boolean) => toggleDubbing("fr"),
				onSelect: (e: Event) => e.preventDefault()
			})
		}

		return [...formatItems, ...dubbingLabel, ...dubbingItems]
	}

	// ========== Reset ==========
	const $reset = () => {
		currentView.value = "week"
		timeStep.value = 20
		currentFormat.value = ["TV", "ONA", "MOVIE"]
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
