import data from "~/content/tierlist-data.json"

export interface TierlistOption<TValue> {
	label: string
	value: TValue
}

export const tierlistGenres = data.genres as string[]
export const tierlistSeasons = data.seasons as TierlistOption<string>[]
export const tierlistFormats = data.formats as TierlistOption<string>[]

export const tierlistYears: TierlistOption<number>[] = Array.from(
	{ length: new Date().getFullYear() - 1940 + 1 },
	(_, i) => {
		const year = new Date().getFullYear() - i
		return { label: String(year), value: year }
	}
)
