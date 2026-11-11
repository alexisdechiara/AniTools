const AUDIO_LANGUAGE_LABELS: Readonly<Record<string, string>> = {
	cn: "Chinese",
	en: "English",
	fr: "French",
	jp: "Japanese",
	kr: "Korean",
	tw: "Taiwanese Mandarin"
}

/** Audio languages are stored as the country code of their flag icon; this is the readable name. */
export function getAudioLanguageLabel(code: string): string {
	return AUDIO_LANGUAGE_LABELS[code] ?? code.toUpperCase()
}

export interface CalendarAudioSource {
	/** Flag codes, as kept on a calendar event: the original audio of an airing, then its dubs. */
	languages: readonly string[]
	media?: { countryOfOrigin?: string | null } | null
}

function joinWithAnd(labels: readonly string[]): string {
	if (labels.length <= 1) return labels[0] ?? ""
	return `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}`
}

/**
 * Names the audio of a calendar event: "Japanese audio" for the language of the anime's country
 * of origin, "English dub" / "English and French dubs" for every other language. Without a
 * country of origin nothing tells the original from a dub, so the languages are only listed
 * ("Audio: Japanese, English"). Empty when the event has no language.
 */
export function getEventAudioLabel(event: CalendarAudioSource): string {
	const languages = [...new Set(event.languages)]
	if (languages.length === 0) return ""

	const origin = event.media?.countryOfOrigin?.trim().toLowerCase() || null
	if (!origin) return `Audio: ${languages.map(getAudioLanguageLabel).join(", ")}`

	const dubs = languages.filter(language => language !== origin).map(getAudioLanguageLabel)
	const parts: string[] = []
	if (languages.includes(origin)) parts.push(`${getAudioLanguageLabel(origin)} audio`)
	if (dubs.length > 0) parts.push(`${joinWithAnd(dubs)} ${dubs.length === 1 ? "dub" : "dubs"}`)
	return parts.join(", ")
}
