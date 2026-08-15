export interface ProgressiveLoadingState {
	allowPartial: boolean
	layoutReady: boolean
	minimumElapsed: boolean
	partialRevealElapsed: boolean
	readyStates: readonly boolean[]
}

export type ProgressiveLoadingPhase = "page" | "content"

export function getProgressiveLoadingPhase(
	state: ProgressiveLoadingState
): ProgressiveLoadingPhase {
	if (!state.layoutReady || !state.minimumElapsed) return "page"

	const allReady = state.readyStates.length === 0
		|| state.readyStates.every(Boolean)
	if (allReady) return "content"

	const someReady = state.readyStates.some(Boolean)
	if (state.allowPartial && state.partialRevealElapsed && someReady) {
		return "content"
	}

	return "page"
}
