/**
 * Colour maths and token resolution for the theme contrast tests.
 *
 * Everything is computed from the stylesheet sources (no browser): oklch tokens are converted
 * to sRGB, aliases (`var(--x)`) are followed per theme, and WCAG 2.x contrast ratios are
 * derived from relative luminance.
 */

export type ThemeName = "light" | "dark"

/** Gamma-encoded sRGB, each channel in 0..1. */
export type Rgb = readonly [number, number, number]

export interface ThemeSources {
	/** `app/assets/css/main.css` */
	mainCss: string
	/** `tailwindcss/theme.css`, the default palettes (gray, green, red, yellow, blue…). */
	tailwindThemeCss: string
	/** `@nuxt/ui/dist/runtime/index.css`, the default semantic aliases. */
	nuxtUiCss: string
	/** `ui.colors` from `app.config.ts`, e.g. `{ primary: "indigo" }`. */
	colors: Record<string, string>
}

export interface Theme {
	/** Resolves a custom property (`--ui-primary`) or a colour literal to sRGB. */
	color: (theme: ThemeName, value: string) => Rgb
	/** Raw declared value of a custom property in a theme, before alias resolution. */
	raw: (theme: ThemeName, name: string) => string | undefined
}

const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const

const DEFAULT_COLORS: Record<string, string> = {
	primary: "green",
	secondary: "blue",
	success: "green",
	info: "blue",
	warning: "yellow",
	error: "red",
	neutral: "slate"
}

function toLinear(channel: number): number {
	return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
}

function toGamma(channel: number): number {
	return channel <= 0.0031308 ? channel * 12.92 : 1.055 * channel ** (1 / 2.4) - 0.055
}

function clamp01(value: number): number {
	return Math.min(1, Math.max(0, value))
}

/** oklch (lightness 0..1, chroma, hue in degrees) to gamma-encoded sRGB, clipped to gamut. */
export function oklchToRgb(lightness: number, chroma: number, hue: number): Rgb {
	const radians = (hue * Math.PI) / 180
	const a = chroma * Math.cos(radians)
	const b = chroma * Math.sin(radians)

	const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3
	const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3
	const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3

	return [
		toGamma(clamp01(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s)),
		toGamma(clamp01(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s)),
		toGamma(clamp01(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s))
	]
}

export function relativeLuminance([red, green, blue]: Rgb): number {
	return 0.2126 * toLinear(red) + 0.7152 * toLinear(green) + 0.0722 * toLinear(blue)
}

export function contrastRatio(first: Rgb, second: Rgb): number {
	const lighter = Math.max(relativeLuminance(first), relativeLuminance(second))
	const darker = Math.min(relativeLuminance(first), relativeLuminance(second))
	return (lighter + 0.05) / (darker + 0.05)
}

/** Source-over compositing of a translucent colour on an opaque backdrop (sRGB, like browsers). */
export function composite(foreground: Rgb, alpha: number, backdrop: Rgb): Rgb {
	return [
		foreground[0] * alpha + backdrop[0] * (1 - alpha),
		foreground[1] * alpha + backdrop[1] * (1 - alpha),
		foreground[2] * alpha + backdrop[2] * (1 - alpha)
	]
}

export function toHex(rgb: Rgb): string {
	return `#${rgb.map(channel => Math.round(channel * 255).toString(16).padStart(2, "0")).join("")}`
}

function parseNumber(token: string, percentScale = 1): number {
	return token.endsWith("%") ? (Number.parseFloat(token) / 100) * percentScale : Number.parseFloat(token)
}

interface Oklch {
	l: number
	c: number
	h: number
}

function parseOklch(value: string): Oklch | undefined {
	const match = /^oklch\(\s*([\d.]+%?)\s+([\d.]+%?)\s+([\d.]+|none)\s*\)$/.exec(value)
	if (!match) return undefined
	return {
		l: parseNumber(match[1] ?? "0"),
		c: parseNumber(match[2] ?? "0", 0.4),
		h: match[3] === "none" ? 0 : Number.parseFloat(match[3] ?? "0")
	}
}

function parseHex(value: string): Rgb | undefined {
	const short = /^#([\da-f])([\da-f])([\da-f])$/i.exec(value)
	if (short) {
		return [1, 2, 3].map(index => Number.parseInt(`${short[index]}${short[index]}`, 16) / 255) as unknown as Rgb
	}
	const long = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(value)
	if (long) {
		return [1, 2, 3].map(index => Number.parseInt(long[index] ?? "0", 16) / 255) as unknown as Rgb
	}
	return undefined
}

/** Body of the first `selector { … }` rule; selectors used here never nest braces. */
function blockBody(css: string, selector: string): string {
	const start = css.indexOf(selector)
	if (start === -1) return ""
	const open = css.indexOf("{", start)
	const close = css.indexOf("}", open)
	return open === -1 || close === -1 ? "" : css.slice(open + 1, close)
}

function declarations(body: string): Map<string, string> {
	const result = new Map<string, string>()
	const withoutComments = body.replace(/\/\*[\s\S]*?\*\//g, "")
	for (const match of withoutComments.matchAll(/(--[\w-]+)\s*:\s*([^;}]+)/g)) {
		if (match[1] && match[2]) result.set(match[1], match[2].trim())
	}
	return result
}

/**
 * Builds the per-theme custom property tables the browser ends up with, in cascade order.
 *
 * Everything layered lands in `@layer theme`: Tailwind hoists `@theme` variables (its own
 * palettes and the `@theme static` block of `main.css`) to the top of that layer, so Nuxt
 * UI's alias rules, which come later in the same layer, override any `--ui-*` alias declared
 * in `@theme`. The unlayered `:root` and `.dark` rules of `main.css` then beat the whole layer.
 * This order was checked against computed styles in the running app.
 */
export function createTheme(sources: ThemeSources): Theme {
	const colors = { ...DEFAULT_COLORS, ...sources.colors }
	const light = declarations(blockBody(sources.tailwindThemeCss, "@theme default"))

	for (const [name, value] of declarations(blockBody(sources.mainCss, "@theme static"))) {
		light.set(name, value)
	}

	for (const [alias, palette] of Object.entries(colors)) {
		for (const step of STEPS) {
			light.set(`--ui-color-${alias}-${step}`, `var(--color-${palette}-${step})`)
		}
		if (alias !== "neutral") light.set(`--ui-${alias}`, `var(--ui-color-${alias}-500)`)
	}

	const dark = new Map<string, string>()
	for (const alias of Object.keys(colors)) {
		if (alias !== "neutral") dark.set(`--ui-${alias}`, `var(--ui-color-${alias}-400)`)
	}

	const overlay = (target: Map<string, string>, body: string) => {
		for (const [name, value] of declarations(body)) target.set(name, value)
	}

	overlay(light, blockBody(sources.nuxtUiCss, ".light,:host,:root{"))
	overlay(dark, blockBody(sources.nuxtUiCss, ".dark{"))
	overlay(light, blockBody(sources.mainCss, "\n:root {"))
	overlay(dark, blockBody(sources.mainCss, "\n.dark {"))

	const raw = (theme: ThemeName, name: string) =>
		theme === "dark" ? dark.get(name) ?? light.get(name) : light.get(name)

	const resolveOklch = (theme: ThemeName, value: string, depth = 0): Oklch | undefined => {
		if (depth > 12) throw new Error(`Alias chain too deep at ${value}`)
		const trimmed = value.trim()

		const literal = parseOklch(trimmed)
		if (literal) return literal

		const alias = /^var\(\s*(--[\w-]+)\s*(?:,\s*(.+))?\)$/.exec(trimmed)
		if (alias?.[1]) {
			const next = raw(theme, alias[1]) ?? alias[2]
			if (next === undefined) throw new Error(`Unknown custom property ${alias[1]} (${theme})`)
			return resolveOklch(theme, next, depth + 1)
		}

		// Relative colour: `oklch(from <colour> <l> <c> <h>)`, where a channel keyword keeps the origin's.
		const relative = /^oklch\(\s*from\s+(var\([^)]+\)|oklch\([^)]+\))\s+(\S+)\s+(\S+)\s+(\S+)\s*\)$/.exec(trimmed)
		if (relative?.[1]) {
			const origin = resolveOklch(theme, relative[1], depth + 1)
			if (!origin) return undefined
			return {
				l: relative[2] === "l" ? origin.l : parseNumber(relative[2] ?? "0"),
				c: relative[3] === "c" ? origin.c : parseNumber(relative[3] ?? "0", 0.4),
				h: relative[4] === "h" ? origin.h : Number.parseFloat(relative[4] ?? "0")
			}
		}

		return undefined
	}

	const color = (theme: ThemeName, value: string): Rgb => {
		const input = value.startsWith("--") ? `var(${value})` : value

		// Follow aliases down to a literal so hex/keyword leaves (`#fff`) resolve too.
		let current = input.trim()
		for (let depth = 0; depth < 12; depth += 1) {
			const alias = /^var\(\s*(--[\w-]+)\s*(?:,\s*(.+))?\)$/.exec(current)
			if (!alias?.[1]) break
			const next = raw(theme, alias[1]) ?? alias[2]
			if (next === undefined) throw new Error(`Unknown custom property ${alias[1]} (${theme})`)
			current = next.trim()
		}

		if (current === "white") return [1, 1, 1]
		if (current === "black") return [0, 0, 0]
		const hex = parseHex(current)
		if (hex) return hex

		const oklch = resolveOklch(theme, current)
		if (!oklch) throw new Error(`Cannot resolve colour "${value}" (${theme}): ${current}`)
		return oklchToRgb(oklch.l, oklch.c, oklch.h)
	}

	return { color, raw }
}
