import { createError } from "h3"
import * as z from "zod"

const MAX_CALENDAR_RANGE_SECONDS = 42 * 24 * 60 * 60
const MAX_SEARCH_LENGTH = 100

const calendarQuerySchema = z.object({
	airingAtGreater: z.coerce.number().int().nonnegative(),
	airingAtLesser: z.coerce.number().int().nonnegative(),
	rangeStart: z.string().min(1).max(64),
	rangeEnd: z.string().min(1).max(64)
}).superRefine((query, context) => {
	if (query.airingAtLesser <= query.airingAtGreater) {
		context.addIssue({
			code: "custom",
			message: "airingAtLesser must be greater than airingAtGreater",
			path: ["airingAtLesser"]
		})
	}

	if (query.airingAtLesser - query.airingAtGreater > MAX_CALENDAR_RANGE_SECONDS) {
		context.addIssue({
			code: "custom",
			message: "Calendar ranges cannot exceed 42 days",
			path: ["airingAtLesser"]
		})
	}

	const start = Date.parse(query.rangeStart)
	const end = Date.parse(query.rangeEnd)

	if (!Number.isFinite(start)) {
		context.addIssue({
			code: "custom",
			message: "rangeStart must be a valid ISO date",
			path: ["rangeStart"]
		})
	}

	if (!Number.isFinite(end)) {
		context.addIssue({
			code: "custom",
			message: "rangeEnd must be a valid ISO date",
			path: ["rangeEnd"]
		})
	}

	if (Number.isFinite(start) && Number.isFinite(end)) {
		if (end <= start) {
			context.addIssue({
				code: "custom",
				message: "rangeEnd must be greater than rangeStart",
				path: ["rangeEnd"]
			})
		}

		if ((end - start) / 1_000 > MAX_CALENDAR_RANGE_SECONDS) {
			context.addIssue({
				code: "custom",
				message: "Calendar ranges cannot exceed 42 days",
				path: ["rangeEnd"]
			})
		}
	}
})

const searchQuerySchema = z.object({
	q: z.string().trim().max(MAX_SEARCH_LENGTH).optional().default("")
})

function invalidQuery(message: string) {
	return createError({
		statusCode: 400,
		statusMessage: message
	})
}

export function parseCalendarQuery(query: unknown) {
	const result = calendarQuerySchema.safeParse(query)
	if (!result.success) {
		throw invalidQuery(result.error.issues[0]?.message || "Invalid calendar query")
	}

	return result.data
}

export function parseSearchQuery(query: unknown) {
	const result = searchQuerySchema.safeParse(query)
	if (!result.success) {
		throw invalidQuery(result.error.issues[0]?.message || "Invalid search query")
	}

	return result.data
}
