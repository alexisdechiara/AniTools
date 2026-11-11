import {
	clockTimeOptions,
	createDateFormatter,
	formatAiringTime as formatAiringTimeWith,
	formatDateTime as formatDateTimeWith
} from "~/utils/format"
import {
	normaliseHourCycle,
	resolveTimeDisplay,
	type ResolvedHourCycle,
	type ResolvedTimeDisplay,
	type TimeDisplay
} from "~/utils/time-display"

function readBrowserTimeZone(): string | null {
	try {
		return Intl.DateTimeFormat().resolvedOptions().timeZone || null
	} catch {
		return null
	}
}

/** The clock the browser's own locale uses: what "Automatic" means for this visitor. */
function readBrowserHourCycle(): ResolvedHourCycle | undefined {
	try {
		return normaliseHourCycle(
			new Intl.DateTimeFormat(undefined, { hour: "numeric" }).resolvedOptions().hourCycle
		)
	} catch {
		return undefined
	}
}

/**
 * The visitor's time zone and clock, from Settings, the AniList profile and the browser.
 *
 * The choices live in `localStorage` and the browser's zone is unknown to the server, so
 * nothing here can be trusted while a server-rendered page hydrates. `ready` is false on
 * the server and until the component is mounted; until then `activeDisplay` is undefined
 * and the helpers print exactly what they printed before this setting existed, so server
 * HTML and the first client render are identical.
 */
export function useTimeDisplay() {
	const preferences = usePreferencesStore()
	const userStore = useUserStore()
	const nuxtApp = useNuxtApp()

	// After hydration (client-side navigation) the browser's values are safe at once.
	const ready = ref(import.meta.client && !nuxtApp.isHydrating)
	if (!ready.value && getCurrentInstance()) {
		onMounted(() => {
			ready.value = true
		})
	}

	const browserTimeZone = computed(() => ready.value ? readBrowserTimeZone() : null)
	const browserHourCycle = computed(() => ready.value ? readBrowserHourCycle() : undefined)

	const display = computed<ResolvedTimeDisplay>(() => resolveTimeDisplay(
		{ timeZoneChoice: preferences.timeZoneChoice, hourCycle: preferences.hourCycle },
		{
			profileTimeZone: userStore.options.timezone,
			profileIsOwn: userStore.isOAuthAuthenticated,
			browserTimeZone: browserTimeZone.value,
			browserHourCycle: browserHourCycle.value
		}
	))

	/** What formatters receive: undefined until `ready`, which keeps the previous output. */
	const activeDisplay = computed<TimeDisplay | undefined>(() => ready.value
		? { timeZone: display.value.timeZone, hourCycle: display.value.hourCycle }
		: undefined
	)

	function createFormatter(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
		return createDateFormatter(options, activeDisplay.value)
	}

	function formatDateTime(date: Date, options?: Intl.DateTimeFormatOptions): string {
		return formatDateTimeWith(date, options, activeDisplay.value)
	}

	function formatAiringTime(date: Date, now?: Date): string {
		return formatAiringTimeWith(date, now, activeDisplay.value)
	}

	/** "13:30" or "1:30 PM" in the visitor's zone. Call it only once `ready` is true. */
	function formatClockTime(date: Date): string {
		return formatDateTimeWith(date, clockTimeOptions(activeDisplay.value), activeDisplay.value)
	}

	return {
		display,
		activeDisplay,
		ready,
		browserTimeZone,
		createFormatter,
		formatDateTime,
		formatAiringTime,
		formatClockTime
	}
}
