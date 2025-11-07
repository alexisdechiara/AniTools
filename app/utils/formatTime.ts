type TimeFormat = "short" | "long"

/**
 * Formate une durée en minutes en une chaîne lisible
 * @param minutes - Durée en minutes (peut être null ou undefined)
 * @param format - Format d'affichage : 'short' (2d 3h 30m) ou 'long' (2days 3hours 30min)
 * @returns Chaîne formatée (ex: "2d 3h 30m" ou "2days 3hours 30min") ou "-" si minutes est null/undefined
 */
export function formatWatchTime(minutes: number | null | undefined, format: TimeFormat = "short"): string {
	if (minutes === null || minutes === undefined) return "-"

	const totalMinutes = Math.floor(minutes)
	const days = Math.floor(totalMinutes / (24 * 60))
	const remainingMinutes = totalMinutes % (24 * 60)
	const hours = Math.floor(remainingMinutes / 60)
	const mins = remainingMinutes % 60

	const parts = []

	if (format === "short") {
		if (days > 0) parts.push(`${days}d`)
		if (hours > 0 || days > 0) parts.push(`${hours}h`)
		parts.push(`${mins}m`)
	} else {
		if (days > 0) parts.push(`${days}${days > 1 ? "days" : "day"}`)
		if (hours > 0 || days > 0) parts.push(`${hours}${hours > 1 ? "hours" : "hour"}`)
		parts.push(`${mins}min`)
	}

	return parts.length > 0 ? parts.join(" ") : "0min"
}
