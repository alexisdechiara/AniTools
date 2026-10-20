/**
 * Standard competition ranking ("1224") for values already sorted best first: equal values
 * share the rank of the first of them, so three 100% scores all read as 1st, not 1st/2nd/3rd.
 */
export function competitionRanks(values: readonly number[]): number[] {
	return values.map((value, index) => {
		const firstEqual = values.findIndex(candidate => candidate === value)
		return (firstEqual === -1 ? index : firstEqual) + 1
	})
}

/** Whether the value at `index` shares its rank with another entry. */
export function isTiedRank(values: readonly number[], index: number): boolean {
	const value = values[index]
	return value !== undefined && values.filter(candidate => candidate === value).length > 1
}
