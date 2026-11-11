/**
 * Which time zone and clock the interface prints times with.
 *
 * Pure: the browser's zone and the profile's zone are passed in, so the same rules run on
 * the server, in the browser and in tests without reading the machine's settings.
 */

/** `"auto"` follows the AniList profile first, then the browser. Anything else is an IANA name. */
export type TimeZoneChoice = "auto" | "browser" | (string & {})
export type HourCycleChoice = "auto" | "h23" | "h12"
export type ResolvedHourCycle = "h23" | "h12"
export type TimeDisplaySource = "profile" | "browser" | "chosen" | "utc"

export const HOUR_CYCLE_CHOICES: readonly HourCycleChoice[] = ["auto", "h23", "h12"]
export const FALLBACK_TIME_ZONE = "UTC"

export interface TimeDisplayPreferences {
	timeZoneChoice: TimeZoneChoice
	hourCycle: HourCycleChoice
}

export interface TimeDisplayContext {
	/** The zone stored on the loaded AniList profile, whatever its format. */
	profileTimeZone: string | null | undefined
	/** True for an OAuth session: the profile belongs to the person looking at the screen. */
	profileIsOwn: boolean
	/** Unknown on the server. */
	browserTimeZone: string | null | undefined
	/** What "Automatic" means in this browser. Without it the interface locale decides. */
	browserHourCycle?: ResolvedHourCycle
}

/** What a formatter needs. Both fields are optional: a missing one keeps Intl's default. */
export interface TimeDisplay {
	timeZone?: string
	hourCycle?: ResolvedHourCycle
}

export interface ResolvedTimeDisplay {
	timeZone: string
	hourCycle: ResolvedHourCycle | undefined
	source: TimeDisplaySource
	/** Whether "My AniList profile" can be offered: an own profile with a named, valid zone. */
	profileZoneUsable: boolean
}

export function isHourCycleChoice(value: unknown): value is HourCycleChoice {
	return typeof value === "string" && (HOUR_CYCLE_CHOICES as readonly string[]).includes(value)
}

/**
 * True for a named zone Intl can format with ("Europe/Paris", "UTC").
 * Offsets such as "-05:00" are refused even where the engine accepts them: they carry no
 * daylight-saving rule, so a profile that stores one cannot give the right hour all year.
 */
export function isValidTimeZone(value: unknown): value is string {
	if (typeof value !== "string") return false
	const zone = value.trim()
	if (!zone || zone !== value || !/^[A-Za-z]/.test(zone)) return false

	try {
		new Intl.DateTimeFormat("en", { timeZone: zone })
		return true
	} catch {
		return false
	}
}

/** Maps Intl's four cycles to the two the interface offers. */
export function normaliseHourCycle(value: string | null | undefined): ResolvedHourCycle | undefined {
	if (value === "h23" || value === "h24") return "h23"
	if (value === "h12" || value === "h11") return "h12"
	return undefined
}

/**
 * Fallback chain: the own profile's zone, then the browser's, then UTC.
 * An explicit zone wins when it is valid; an invalid one falls back the same way.
 */
export function resolveTimeDisplay(
	preferences: TimeDisplayPreferences,
	context: TimeDisplayContext
): ResolvedTimeDisplay {
	const profileZoneUsable = context.profileIsOwn && isValidTimeZone(context.profileTimeZone)
	const browserZone = isValidTimeZone(context.browserTimeZone) ? context.browserTimeZone : null
	const hourCycle = preferences.hourCycle === "h23" || preferences.hourCycle === "h12"
		? preferences.hourCycle
		: context.browserHourCycle

	const zone = (timeZone: string, source: TimeDisplaySource): ResolvedTimeDisplay =>
		({ timeZone, hourCycle, source, profileZoneUsable })
	const browserOrUtc = () => browserZone
		? zone(browserZone, "browser")
		: zone(FALLBACK_TIME_ZONE, "utc")

	const choice = preferences.timeZoneChoice
	if (choice === "browser") return browserOrUtc()
	if (choice !== "auto" && isValidTimeZone(choice)) return zone(choice, "chosen")

	return profileZoneUsable && isValidTimeZone(context.profileTimeZone)
		? zone(context.profileTimeZone, "profile")
		: browserOrUtc()
}

const FORMATTER_CACHE_LIMIT = 200
const formatterCache = new Map<string, Intl.DateTimeFormat>()

function formatterKey(
	locale: string,
	options: Intl.DateTimeFormatOptions,
	display: TimeDisplay | undefined
): string {
	const sortedOptions = Object.entries(options)
		.filter(([, value]) => value !== undefined)
		.sort(([left], [right]) => left.localeCompare(right))
	return JSON.stringify([locale, display?.timeZone ?? null, display?.hourCycle ?? null, sortedOptions])
}

/**
 * One `Intl.DateTimeFormat` per locale, zone, cycle and options: building one is costly and
 * lists format hundreds of dates. Explicit `timeZone`, `hourCycle` or `hour12` options win
 * over the display settings, so a caller can still pin a zone.
 */
export function getDateFormatter(
	locale: string,
	options: Intl.DateTimeFormatOptions,
	display?: TimeDisplay
): Intl.DateTimeFormat {
	const key = formatterKey(locale, options, display)
	const cached = formatterCache.get(key)
	if (cached) return cached

	const merged: Intl.DateTimeFormatOptions = { ...options }
	if (display?.timeZone && merged.timeZone === undefined) merged.timeZone = display.timeZone
	if (display?.hourCycle && merged.hourCycle === undefined && merged.hour12 === undefined) {
		merged.hourCycle = display.hourCycle
	}

	const formatter = new Intl.DateTimeFormat(locale, merged)
	if (formatterCache.size >= FORMATTER_CACHE_LIMIT) formatterCache.clear()
	formatterCache.set(key, formatter)
	return formatter
}

/**
 * The zones offered in Settings. `Intl.supportedValuesOf` is missing from older browsers:
 * the list then holds only the zones already known to be valid.
 */
export function listTimeZones(known: ReadonlyArray<string | null | undefined> = []): string[] {
	const intl = Intl as typeof Intl & { supportedValuesOf?: (key: "timeZone") => string[] }
	let supported: string[]
	try {
		supported = typeof intl.supportedValuesOf === "function" ? intl.supportedValuesOf("timeZone") : []
	} catch {
		supported = []
	}

	const zones = new Set<string>(supported)
	for (const zone of [...known, FALLBACK_TIME_ZONE]) {
		if (isValidTimeZone(zone)) zones.add(zone)
	}
	return [...zones].sort((left, right) => left.localeCompare(right, "en"))
}
