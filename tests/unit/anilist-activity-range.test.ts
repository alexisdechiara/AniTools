import { describe, expect, it, vi } from "vitest"
import {
	getAniListActivitiesResponse,
	parseAniListActivitiesQuery,
	resolveAniListActivityRange
} from "../../server/utils/anilist-client"

const oauthAccess = {
	mode: "oauth" as const,
	username: "Alexis",
	userId: 42,
	accessToken: "secret-access-token"
}

function jsonResponse(body: unknown) {
	return new Response(JSON.stringify(body), {
		headers: { "Content-Type": "application/json" }
	})
}

describe("AniList activity range validation", () => {
	it("accepts a bounded year while keeping pagination defaults", () => {
		const query = parseAniListActivitiesQuery({
			username: "Alexis",
			year: "2025"
		})

		expect(query).toMatchObject({
			username: "Alexis",
			year: 2025,
			page: 1,
			perPage: 20,
			kind: "anime"
		})
		expect(resolveAniListActivityRange(query)).toEqual({
			from: Date.UTC(2025, 0, 1) / 1_000,
			to: Date.UTC(2026, 0, 1) / 1_000
		})
	})

	it.each([
		{ from: "1704067200" },
		{ to: "1735689600" },
		{ from: "1735689600", to: "1704067200" },
		{ from: "1609459200", to: "1735689601" },
		{ year: "2025", from: "1704067200", to: "1735689600" },
		{ year: "1999" }
	])("rejects ambiguous or excessive ranges", (query) => {
		expect(() => parseAniListActivitiesQuery(query)).toThrow()
	})

	it("propagates a half-open range through fixed GraphQL variables", async () => {
		const requester = vi.fn(async () => jsonResponse({
			data: {
				Page: {
					pageInfo: {
						currentPage: 1,
						hasNextPage: false,
						lastPage: 1,
						perPage: 20,
						total: 0
					},
					activities: []
				}
			}
		})) as unknown as typeof fetch

		await getAniListActivitiesResponse(oauthAccess, {
			page: 1,
			perPage: 20,
			kind: "anime",
			from: 1_704_067_200,
			to: 1_735_689_600
		}, { fetch: requester })

		const [, request] = requester.mock.calls[0]!
		const body = JSON.parse(String(request?.body)) as {
			query: string
			variables: Record<string, unknown>
		}

		expect(body.query).toContain("createdAt_greater: $createdAtGreater")
		expect(body.query).toContain("createdAt_lesser: $createdAtLesser")
		expect(body.variables).toMatchObject({
			createdAtGreater: 1_704_067_199,
			createdAtLesser: 1_735_689_600
		})
	})
})
