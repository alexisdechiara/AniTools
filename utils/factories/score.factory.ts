import type { ScoreEntry, ScoringData } from "../../types/score"

const months: string[] = [
	"January", "February", "March", "April", "May", "June",
	"July", "August", "September", "October", "November", "December"
]

/**
 * Génère un tableau d'entrées de score avec des données aléatoires
 * @param count Nombre d'entrées à générer (par défaut: 100)
 * @returns Tableau d'objets ScoreEntry
 */
export function generateRandomScores(count = 100): ScoreEntry[] {
	return Array.from({ length: count }, (_, i) => {
		const monthIndex = Math.floor(i / 8.33) % 12
		return {
			month: months[monthIndex] || "January",
			score: Math.floor(Math.random() * 100) + 1
		}
	})
}

/**
 * Calcule les données de scoring groupées par mois
 * @param scores Tableau d'entrées de score
 * @returns Tableau d'objets ScoringData groupés par mois avec la moyenne des scores
 */
export function calculateMonthlyScores(scores: ScoreEntry[]): ScoringData[] {
	const monthlyScores: Record<string, { count: number, sum: number }> = {}

	scores.forEach(({ month, score }) => {
		const currentMonth = monthlyScores[month] || { count: 0, sum: 0 }
		currentMonth.count++
		currentMonth.sum += score
		monthlyScores[month] = currentMonth
	})

	return Object.entries(monthlyScores).map(([month, { count, sum }]) => ({
		month,
		score: Math.round(sum / count)
	}))
}

/**
 * Calcule les données de scoring groupées par plage de 10
 * @param scores Tableau d'entrées de score
 * @returns Tableau d'objets ScoringData groupés par plage de score
 */
export function calculateScoreRanges(scores: ScoreEntry[]): ScoringData[] {
	const scoreRanges: Record<string, { count: number }> = {}

	scores.forEach(({ score }) => {
		let range: string
		if (score === 100) {
			range = "100"
		} else {
			const lowerBound = Math.floor(score / 10) * 10
			range = `${lowerBound} - ${lowerBound + 9}`
		}

		const currentRange = scoreRanges[range] || { count: 0 }
		currentRange.count++
		scoreRanges[range] = currentRange
	})

	// Trier les plages par ordre croissant
	return Object.entries(scoreRanges)
		.map(([range, { count }]) => ({
			month: range,
			score: count
		}))
		.sort((a, b) => {
			const aNum = parseInt(a.month.split("-")[0] || "0")
			const bNum = parseInt(b.month.split("-")[0] || "0")
			return aNum - bNum
		})
}
