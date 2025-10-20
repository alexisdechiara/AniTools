/**
 * Représente une entrée de score avec son mois associé
 */
export interface ScoreEntry {
	/** Mois de l'entrée (ex: 'January', 'February', etc.) */
	month: string
	/** Score numérique entre 1 et 100 */
	score: number
}

/**
 * Représente une entrée de données de scoring pour l'affichage
 */
export interface ScoringData {
	/** Libellé (mois ou plage de scores) */
	month: string
	/** Valeur (moyenne ou comptage) */
	score: number
}
