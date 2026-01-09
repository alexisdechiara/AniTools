export function gapSizeToText(size: number): string {
	const map: Record<number, string> = {
		0: "xs",
		25: "sm",
		50: "md",
		75: "lg",
		100: "xl"
	}
	return map[size] ?? "md"
}

export function gapSizeToClass(size: number): string {
	const map: Record<number, string> = {
		0: "gap-0",
		25: "gap-3",
		50: "gap-6",
		75: "gap-12",
		100: "gap-24"
	}
	return map[size] ?? "gap-8"
}

export function rowCornerToClass(corner: number): string {
	const map: Record<number, string> = {
		0: "rounded-0",
		1: "rounded-xs",
		2: "rounded-sm",
		3: "rounded-md",
		4: "rounded-lg",
		5: "rounded-xl",
		6: "rounded-2xl"
	}
	return map[corner] ?? "rounded-2xl"
}

export function colWidthToClass(width: number): string {
	const map: Record<number, string> = {
		0: "col-span-1",
		1: "col-span-2",
		2: "col-span-3",
		3: "col-span-4",
		4: "col-span-5"
	}
	return map[width] ?? "col-span-1"
}

export const tierlistLightBackgrounds = [
	"bg-transparent",
	"bg-neutral-50",
	"bg-neutral-100",
	"bg-neutral-200",
	"bg-neutral-300",
	"bg-neutral-400",
	"bg-neutral-500",
	"bg-neutral-600",
	"bg-neutral-700",
	"bg-neutral-800",
	"bg-neutral-900",
	"bg-neutral-950"
]

export const tierlistDarkBackgrounds = [
	"bg-transparent",
	"bg-neutral-950",
	"bg-neutral-900",
	"bg-neutral-800",
	"bg-neutral-700",
	"bg-neutral-600",
	"bg-neutral-500",
	"bg-neutral-400",
	"bg-neutral-300",
	"bg-neutral-200",
	"bg-neutral-100",
	"bg-white"
]

export function getTierlistNeutralBackgrounds(theme: "light" | "dark"): string[] {
	return theme === "dark" ? tierlistDarkBackgrounds : tierlistLightBackgrounds
}
