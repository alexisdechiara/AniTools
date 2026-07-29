const DEFAULT_SITE_URL = "https://anitools.vercel.app"

export function normalizeSiteUrl(value: unknown, fallback = DEFAULT_SITE_URL) {
	try {
		const url = new URL(String(value || fallback))
		if (url.protocol !== "https:" && url.protocol !== "http:") {
			return fallback
		}

		return url.href.replace(/\/+$/, "")
	} catch {
		return fallback
	}
}

export function serializeJsonLd(value: unknown) {
	return (JSON.stringify(value) ?? "null")
		.replaceAll("<", "\\u003c")
		.replaceAll(">", "\\u003e")
		.replaceAll("&", "\\u0026")
		.replaceAll("\u2028", "\\u2028")
		.replaceAll("\u2029", "\\u2029")
}
