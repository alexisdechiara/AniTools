export type CalendarRangeType = "week" | "month" | "year"

export interface CalendarRange {
	start: Date
	end: Date
}

export interface CalendarViewRangeInput {
	extendedEnd?: Date
	extendedStart?: Date
	fullRangeEnd?: Date
	fullRangeStart?: Date
}

function isValidDate(value: unknown): value is Date {
	return value instanceof Date && Number.isFinite(value.getTime())
}

export function getCalendarViewRange(view: CalendarViewRangeInput): CalendarRange | null {
	const start = view.extendedStart ?? view.fullRangeStart
	const end = view.extendedEnd ?? view.fullRangeEnd

	if (!isValidDate(start) || !isValidDate(end) || end <= start) {
		return null
	}

	return {
		start: new Date(start),
		end: new Date(end)
	}
}

export function getCalendarRange(
	type: CalendarRangeType = "week",
	date: Date = new Date()
): CalendarRange {
	const current = new Date(date)

	let start: Date
	let end: Date

	if (type === "week") {
		const day = current.getDay()
		const diffToMonday = (day === 0 ? -6 : 1) - day

		start = new Date(current)
		start.setDate(current.getDate() + diffToMonday)
		start.setHours(0, 0, 0, 0)

		end = new Date(start)
		end.setDate(start.getDate() + 7)
	} else if (type === "month") {
		start = new Date(current.getFullYear(), current.getMonth(), 1)
		start.setHours(0, 0, 0, 0)

		end = new Date(current.getFullYear(), current.getMonth() + 1, 1)
	} else {
		start = new Date(current.getFullYear(), 0, 1)
		start.setHours(0, 0, 0, 0)

		end = new Date(current.getFullYear() + 1, 0, 1)
	}

	return {
		start,
		end
	}
}
