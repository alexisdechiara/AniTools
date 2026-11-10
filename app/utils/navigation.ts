export function getSafeInternalPath(value: unknown, fallback = "/") {
	const candidate = Array.isArray(value) ? value[0] : value
	const containsControlCharacter = typeof candidate === "string"
		&& [...candidate].some((character) => {
			const code = character.charCodeAt(0)
			return code < 32 || code === 127
		})
	if (
		typeof candidate !== "string"
		|| !candidate.startsWith("/")
		|| candidate.startsWith("//")
		|| candidate.includes("\\")
		|| containsControlCharacter
	) {
		return fallback
	}

	try {
		const parsed = new URL(candidate, "https://anitools.local")
		if (parsed.origin !== "https://anitools.local") return fallback
		const normalized = `${parsed.pathname}${parsed.search}${parsed.hash}`
		if (!normalized.startsWith("/") || normalized.startsWith("//") || normalized.includes("\\")) {
			return fallback
		}
		return normalized
	} catch {
		return fallback
	}
}
