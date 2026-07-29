import * as z from "zod"

const simuldubItemSchema = z.object({
	id: z.union([
		z.number().int().nonnegative(),
		z.string().trim().min(1).max(64)
	]),
	status: z.enum(["published", "cancelled"]),
	title: z.string().trim().max(300).nullable().optional(),
	start_date: z.string().datetime({ offset: true }),
	end_date: z.string().datetime({ offset: true }).nullable().optional(),
	episode: z.coerce.number().int().positive().max(100_000).nullable().optional(),
	languages: z.array(z.string().trim().min(2).max(64)).max(24).catch([]),
	streaming: z.array(z.string().trim().min(1).max(100)).max(24).catch([]),
	anilist_media_id: z.union([
		z.number().int().positive(),
		z.string().regex(/^[1-9]\d{0,9}$/)
	]).nullable().optional()
}).superRefine((item, context) => {
	if (!item.end_date) return

	const start = Date.parse(item.start_date)
	const end = Date.parse(item.end_date)
	if (end <= start) {
		context.addIssue({
			code: "custom",
			message: "end_date must be later than start_date",
			path: ["end_date"]
		})
	}
})

export type ValidatedSimuldubItem = z.infer<typeof simuldubItemSchema>

export class InvalidCalendarUpstreamResponse extends Error {
	constructor(message: string) {
		super(message)
		this.name = "InvalidCalendarUpstreamResponse"
	}
}

export function parseSimuldubItems(input: unknown) {
	const items = z.array(z.unknown()).max(500).safeParse(input)
	if (!items.success) {
		throw new InvalidCalendarUpstreamResponse("Invalid simuldub collection")
	}

	const parsed = items.data.flatMap((item) => {
		const result = simuldubItemSchema.safeParse(item)
		return result.success ? [result.data] : []
	})

	if (items.data.length > 0 && parsed.length === 0) {
		throw new InvalidCalendarUpstreamResponse("Invalid simuldub records")
	}

	return parsed
}
