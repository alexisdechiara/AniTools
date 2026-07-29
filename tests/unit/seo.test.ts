import { describe, expect, it } from "vitest"
import {
	normalizeSiteUrl,
	serializeJsonLd
} from "../../app/utils/seo"

describe("normalizeSiteUrl", () => {
	it("normalizes HTTP origins and removes trailing slashes", () => {
		expect(normalizeSiteUrl("https://example.com/tools///"))
			.toBe("https://example.com/tools")
	})

	it("rejects malformed and non-HTTP site URLs", () => {
		expect(normalizeSiteUrl("javascript:alert(1)", "https://safe.example"))
			.toBe("https://safe.example")
		expect(normalizeSiteUrl("not a url", "https://safe.example"))
			.toBe("https://safe.example")
	})
})

describe("serializeJsonLd", () => {
	it("neutralizes markup-breaking characters", () => {
		const serialized = serializeJsonLd({
			name: "</script><script>alert('xss')</script>&"
		})

		expect(serialized).not.toContain("<")
		expect(serialized).not.toContain(">")
		expect(serialized).not.toContain("&")
		expect(JSON.parse(serialized).name).toBe("</script><script>alert('xss')</script>&")
	})
})
