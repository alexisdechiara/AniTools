/**
 * Formate une durée en minutes en une chaîne lisible
 * @param minutes - Durée en minutes
 * @returns Chaîne formatée (ex: "2d 3h 30m" ou "1h 45m" ou "30m")
 */
export function formatWatchTime(minutes: number): string {
	const totalMinutes = Math.floor(minutes)
	const days = Math.floor(totalMinutes / (24 * 60))
	const remainingMinutes = totalMinutes % (24 * 60)
	const hours = Math.floor(remainingMinutes / 60)
	const mins = remainingMinutes % 60

	const parts = []
	if (days > 0) parts.push(`${days}d`)
	if (hours > 0 || days > 0) parts.push(`${hours}h`)
	parts.push(`${mins}m`)

	return parts.join(" ")
}
