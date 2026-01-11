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

export const tierlistGapOptions = [
	{ label: 'XS', value: 0 },
	{ label: 'SM', value: 25 },
	{ label: 'MD', value: 50 },
	{ label: 'LG', value: 75 },
	{ label: 'XL', value: 100 }
]

export const tierlistCornerOptions = [
	{ label: 'NO', value: 0 },
	{ label: 'XS', value: 1 },
	{ label: 'SM', value: 2 },
	{ label: 'MD', value: 3 },
	{ label: 'LG', value: 4 },
	{ label: 'XL', value: 5 },
	{ label: '2XL', value: 6 }
]

export const tierlistColWidthOptions = [
	{ label: '1', value: 0 },
	{ label: '2', value: 1 },
	{ label: '3', value: 2 },
	{ label: '4', value: 3 },
	{ label: '5', value: 4 }
]
