import { defineStore } from "pinia"

export const useTierlistSettingsStore = defineStore("tierlistSettings", () => {
	// State
	const gapSize = ref(50)
	const headingCorner = ref(true)
	const rowCorner = ref(6)
	const colWidth = ref(0)

	// Initialize selectedBackground based on current theme
	const colorMode = useColorMode()
	const selectedBackground = ref(colorMode.value === "dark" ? "bg-neutral-900" : "bg-neutral-100")

	// Getters
	const lightBackgrounds = [
		"bg-transparent",
		"bg-neutral-50",
		"bg-neutral-100",
		"bg-neutral-200",
		"bg-neutral-300",
		"bg-neutral-400",
		"bg-neutral-500",
		"bg-neutral-600",
		"bg-neutral-700",
		"bg-neutral-800",
		"bg-neutral-900",
		"bg-neutral-950"
	]

	const darkBackgrounds = [
		"bg-transparent",
		"bg-neutral-950",
		"bg-neutral-900",
		"bg-neutral-800",
		"bg-neutral-700",
		"bg-neutral-600",
		"bg-neutral-500",
		"bg-neutral-400",
		"bg-neutral-300",
		"bg-neutral-200",
		"bg-neutral-100",
		"bg-white"
	]

	const neutralBackgrounds = computed(() => {
		const colorMode = useColorMode()
		return colorMode.value === "dark" ? darkBackgrounds : lightBackgrounds
	})

	const gapSizeText = computed(() => {
		switch (gapSize.value) {
			case 0: return "xs"
			case 25: return "sm"
			case 50: return "md"
			case 75: return "lg"
			case 100: return "xl"
			default: return "md"
		}
	})

	const gapSizeClass = computed(() => {
		switch (gapSize.value) {
			case 0: return "gap-0"
			case 25: return "gap-3"
			case 50: return "gap-6"
			case 75: return "gap-12"
			case 100: return "gap-24"
			default: return "gap-8"
		}
	})

	const rowCornerClass = computed(() => {
		switch (rowCorner.value) {
			case 0: return "rounded-0"
			case 1: return "rounded-xs"
			case 2: return "rounded-sm"
			case 3: return "rounded-md"
			case 4: return "rounded-lg"
			case 5: return "rounded-xl"
			case 6: return "rounded-2xl"
			default: return "rounded-2xl"
		}
	})

	const colWidthClass = computed(() => {
		switch (colWidth.value) {
			case 0: return "col-span-1"
			case 1: return "col-span-2"
			case 2: return "col-span-3"
			case 3: return "col-span-4"
			case 4: return "col-span-5"
			default: return "col-span-1"
		}
	})

	// Actions
	function setBackground(color: string) {
		selectedBackground.value = color
	}

	function setGapSize(size: number) {
		gapSize.value = size
	}

	function setHeadingCorner(enabled: boolean) {
		headingCorner.value = enabled
	}

	function setRowCorner(corner: number) {
		rowCorner.value = corner
	}

	function setColWidth(width: number) {
		colWidth.value = width
	}

	function setDefaultBackgroundForTheme() {
		const colorMode = useColorMode()
		selectedBackground.value = colorMode.value === "dark" ? "bg-neutral-900" : "bg-neutral-100"
	}

	return {
		// State
		gapSize,
		headingCorner,
		rowCorner,
		colWidth,
		selectedBackground,

		// Getters
		neutralBackgrounds,
		gapSizeText,
		gapSizeClass,
		rowCornerClass,
		colWidthClass,

		// Actions
		setBackground,
		setGapSize,
		setHeadingCorner,
		setRowCorner,
		setColWidth,
		setDefaultBackgroundForTheme
	}
}, {
	persist: {
		key: "tierlist-settings",
		storage: localStorage
	}
})
