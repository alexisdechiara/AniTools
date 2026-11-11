import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { beforeAll, describe, expect, it, vi } from "vitest"
import {
	composite,
	contrastRatio,
	createTheme,
	oklchToRgb,
	toHex,
	type Rgb,
	type Theme,
	type ThemeName
} from "../helpers/theme-contrast"

/*
 * WCAG AA evidence for the theme tokens, computed from the stylesheet sources rather than a
 * browser: main.css is parsed, aliases are followed per theme, oklch is converted to sRGB
 * and ratios come from relative luminance. Class names are read from app.config.ts, so a
 * change to either file that breaks a ratio fails here.
 */

const TEXT = 4.5
const GRAPHIC = 3

const THEMES: readonly ThemeName[] = ["light", "dark"]
const STATUS_COLORS = ["success", "info", "warning", "error"] as const

interface CompoundVariant {
	color?: string
	variant?: string
	active?: boolean
	class: string | Record<string, string>
}

interface UiConfig {
	colors: Record<string, string>
	button: { compoundVariants: CompoundVariant[] }
	badge: { compoundVariants: CompoundVariant[] }
	alert: { slots: Record<string, string>, compoundVariants: CompoundVariant[] }
	navigationMenu: {
		compoundVariants: CompoundVariant[]
		variants: { active: { true: { link: string } } }
	}
}

function read(relativePath: string): string {
	return readFileSync(fileURLToPath(new URL(`../../${relativePath}`, import.meta.url)), "utf8").replace(/\r\n/g, "\n")
}

let ui: UiConfig
let theme: Theme

beforeAll(async () => {
	vi.stubGlobal("defineAppConfig", (config: unknown) => config)
	const appConfig = (await import("../../app/app.config")).default as unknown as { ui: UiConfig }
	ui = appConfig.ui

	theme = createTheme({
		mainCss: read("app/assets/css/main.css"),
		tailwindThemeCss: read("node_modules/tailwindcss/theme.css"),
		nuxtUiCss: read("node_modules/@nuxt/ui/dist/runtime/index.css"),
		colors: ui.colors
	})
})

/** Cards are pure white / pure black (`pageCard` in app.config.ts), not a token. */
function card(mode: ThemeName): Rgb {
	return mode === "light" ? [1, 1, 1] : [0, 0, 0]
}

function surfaces(mode: ThemeName): Record<string, Rgb> {
	return {
		card: card(mode),
		page: theme.color(mode, "--ui-bg"),
		muted: theme.color(mode, "--ui-bg-muted"),
		elevated: theme.color(mode, "--ui-bg-elevated")
	}
}

const SEMANTIC_TEXT: Record<string, string> = {
	dimmed: "--ui-text-dimmed",
	muted: "--ui-text-muted",
	toned: "--ui-text-toned",
	default: "--ui-text",
	highlighted: "--ui-text-highlighted",
	inverted: "--ui-text-inverted"
}

const SEMANTIC_BG: Record<string, string> = {
	default: "--ui-bg",
	muted: "--ui-bg-muted",
	elevated: "--ui-bg-elevated",
	accented: "--ui-bg-accented",
	inverted: "--ui-bg-inverted"
}

/** Maps the colour part of a utility (`primary`, `success-800`, `elevated`) to its custom property. */
function tokenFor(kind: "text" | "bg", name: string): string {
	const semantic = kind === "text" ? SEMANTIC_TEXT[name] : SEMANTIC_BG[name]
	if (semantic) return semantic
	return /-\d+$/.test(name) ? `--ui-color-${name}` : `--ui-${name}`
}

/**
 * The colour a class list applies for a utility kind in a theme, the way tailwind-merge
 * leaves it: the last unprefixed class wins, and a `dark:` class wins over it in dark mode.
 */
function utilityColor(mode: ThemeName, classes: string, kind: "text" | "bg", backdrop?: Rgb): Rgb {
	let base: string | undefined
	let dark: string | undefined

	for (const className of classes.split(/\s+/)) {
		const match = new RegExp(`^(dark:)?${kind}-([a-z]+(?:-\\d+)?(?:/\\d+)?)$`).exec(className)
		if (!match?.[2]) continue
		if (match[1]) dark = match[2]
		else base = match[2]
	}

	const utility = mode === "dark" ? dark ?? base : base
	if (!utility) throw new Error(`No ${kind}-* utility in "${classes}"`)

	// `bg-primary/12`: the colour at 12% opacity over whatever is behind it.
	const [name = "", opacity] = utility.split("/")
	const color = theme.color(mode, tokenFor(kind, name))
	if (opacity === undefined) return color
	if (!backdrop) throw new Error(`"${utility}" is translucent and needs a backdrop`)
	return composite(color, Number(opacity) / 100, backdrop)
}

function compoundClass(variants: CompoundVariant[], match: Partial<CompoundVariant>, slot?: string): string {
	const found = variants.filter(variant =>
		Object.entries(match).every(([key, value]) => variant[key as keyof CompoundVariant] === value)
	)
	if (!found.length) throw new Error(`No compound variant for ${JSON.stringify(match)}`)

	return found
		.map(variant => typeof variant.class === "string" ? variant.class : variant.class[slot ?? "root"] ?? "")
		.join(" ")
}

describe("colour maths", () => {
	it("converts oklch to sRGB", () => {
		expect(toHex(oklchToRgb(1, 0, 0))).toBe("#ffffff")
		expect(toHex(oklchToRgb(0, 0, 0))).toBe("#000000")
		// Tailwind's published hex for indigo-600-like and gray-900 values.
		expect(toHex(oklchToRgb(0.21, 0.034, 264.665))).toBe("#101828")
		expect(toHex(oklchToRgb(0.511, 0.23, 276.97))).toBe("#4f46e5")
	})

	it("computes WCAG contrast ratios", () => {
		expect(contrastRatio([1, 1, 1], [0, 0, 0])).toBeCloseTo(21, 5)
		expect(contrastRatio([1, 1, 1], [1, 1, 1])).toBe(1)
		// #767676 is the lightest grey that passes AA on white.
		expect(contrastRatio([0x76 / 255, 0x76 / 255, 0x76 / 255], [1, 1, 1])).toBeCloseTo(4.54, 2)
	})

	it("resolves aliases per theme", () => {
		expect(theme.raw("light", "--ui-primary")).toBe("var(--ui-color-primary-600)")
		expect(theme.raw("dark", "--ui-primary")).toBe("var(--ui-color-primary-200)")
		expect(toHex(theme.color("light", "--ui-primary"))).toBe("#4f46e5")
		expect(toHex(theme.color("light", "--ui-text-inverted"))).toBe("#ffffff")
		expect(toHex(theme.color("dark", "--ui-text-inverted"))).toBe("#101828")
	})
})

describe.each(THEMES)("theme contrast (%s)", (mode) => {
	it("keeps the brand hue for the primary colour", () => {
		const raw = theme.raw(mode, "--ui-primary")
		expect(raw).toMatch(/^var\(--ui-color-primary-\d+\)$/)
	})

	it("solid primary button label passes 4.5:1, at rest and on hover", () => {
		const label = theme.color(mode, "--ui-text-inverted")
		expect(contrastRatio(label, theme.color(mode, "--ui-primary"))).toBeGreaterThanOrEqual(TEXT)

		const overrides = compoundClass(ui.button.compoundVariants, { color: "primary", variant: "solid" })
		const hover = mode === "dark"
			? /dark:hover:bg-(primary-\d+)/.exec(overrides)
			: /(?:^|\s)hover:bg-(primary-\d+)/.exec(overrides)
		expect(hover?.[1]).toBeDefined()
		expect(contrastRatio(label, theme.color(mode, tokenFor("bg", hover?.[1] ?? "")))).toBeGreaterThanOrEqual(TEXT)
	})

	it("primary text passes 4.5:1 on the page, on cards and on tinted surfaces", () => {
		const primary = theme.color(mode, "--ui-primary")
		for (const [name, surface] of Object.entries(surfaces(mode))) {
			expect(contrastRatio(primary, surface), name).toBeGreaterThanOrEqual(TEXT)
		}
	})

	it("soft primary text passes 4.5:1 on its own tint", () => {
		const primary = theme.color(mode, "--ui-primary")
		for (const [name, surface] of Object.entries(surfaces(mode))) {
			expect(contrastRatio(primary, composite(primary, 0.1, surface)), name).toBeGreaterThanOrEqual(TEXT)
		}
	})

	it("muted text passes 4.5:1 on the page, muted and elevated surfaces", () => {
		const muted = theme.color(mode, "--ui-text-muted")
		for (const [name, surface] of Object.entries(surfaces(mode))) {
			expect(contrastRatio(muted, surface), name).toBeGreaterThanOrEqual(TEXT)
		}
	})

	it("dimmed text passes 4.5:1 on cards, the page and the muted surface", () => {
		const dimmed = theme.color(mode, "--ui-text-dimmed")
		const { card: cardSurface, page, muted } = surfaces(mode)
		for (const surface of [cardSurface, page, muted]) {
			expect(contrastRatio(dimmed, surface as Rgb)).toBeGreaterThanOrEqual(TEXT)
		}
	})

	it("keeps dimmed, muted and toned as distinct steps", () => {
		const background = card(mode)
		const dimmed = contrastRatio(theme.color(mode, "--ui-text-dimmed"), background)
		const muted = contrastRatio(theme.color(mode, "--ui-text-muted"), background)
		const toned = contrastRatio(theme.color(mode, "--ui-text-toned"), background)

		expect(muted - dimmed).toBeGreaterThanOrEqual(1)
		expect(toned - muted).toBeGreaterThanOrEqual(1)
	})

	it.each(STATUS_COLORS)("%s text passes 4.5:1 on cards and the page", (color) => {
		const text = theme.color(mode, `--ui-${color}`)
		expect(contrastRatio(text, card(mode))).toBeGreaterThanOrEqual(TEXT)
		expect(contrastRatio(text, theme.color(mode, "--ui-bg"))).toBeGreaterThanOrEqual(TEXT)
	})

	it.each(STATUS_COLORS)("solid %s label passes 4.5:1", (color) => {
		const label = theme.color(mode, "--ui-text-inverted")
		expect(contrastRatio(label, theme.color(mode, `--ui-${color}`))).toBeGreaterThanOrEqual(TEXT)
	})

	it.each(STATUS_COLORS)("soft and subtle %s text passes 4.5:1 on its own tint", (color) => {
		// `bg-<color>/10`: the alias at 10% over whatever surface the component sits on.
		const fill = theme.color(mode, `--ui-${color}`)
		const components: Array<[string, CompoundVariant[], string | undefined]> = [
			["button", ui.button.compoundVariants, undefined],
			["badge", ui.badge.compoundVariants, undefined],
			["alert", ui.alert.compoundVariants, "root"]
		]

		for (const [component, variants, slot] of components) {
			for (const variant of ["soft", "subtle"]) {
				const text = utilityColor(mode, compoundClass(variants, { color, variant }, slot), "text")
				for (const [name, surface] of Object.entries(surfaces(mode))) {
					const tint = composite(fill, 0.1, surface)
					expect(contrastRatio(text, tint), `${component} ${variant} on ${name}`).toBeGreaterThanOrEqual(TEXT)
				}
			}
		}
	})

	it.each(STATUS_COLORS)("outline and ghost %s buttons pass 4.5:1 on their hover tint", (color) => {
		const fill = theme.color(mode, `--ui-${color}`)
		for (const variant of ["outline", "ghost"]) {
			const text = utilityColor(mode, compoundClass(ui.button.compoundVariants, { color, variant }), "text")
			for (const surface of [card(mode), theme.color(mode, "--ui-bg")]) {
				expect(contrastRatio(text, surface), variant).toBeGreaterThanOrEqual(TEXT)
				expect(contrastRatio(text, composite(fill, 0.1, surface)), `${variant} hover`).toBeGreaterThanOrEqual(TEXT)
			}
		}
	})

	it("alert descriptions are not faded below their title", () => {
		expect(ui.alert.slots.description).toContain("opacity-100")
	})

	it("active navigation label passes 4.5:1 on its pill, from semantic tokens", () => {
		const pill = ui.navigationMenu.variants.active.true.link
		const label = compoundClass(ui.navigationMenu.compoundVariants, { color: "primary", variant: "pill", active: true }, "link")

		// A fixed ramp step renders as a light lavender pill on the near-black sidebar.
		expect(pill).not.toMatch(/bg-primary-\d+/)

		// The sidebar is the page surface.
		const background = utilityColor(mode, pill, "bg", theme.color(mode, "--ui-bg"))
		expect(contrastRatio(utilityColor(mode, label, "text"), background)).toBeGreaterThanOrEqual(TEXT)
		// The leading icon keeps Nuxt UI's `text-primary`.
		expect(contrastRatio(theme.color(mode, "--ui-primary"), background)).toBeGreaterThanOrEqual(GRAPHIC)
		// The pill itself must not glare against the sidebar it sits on.
		expect(contrastRatio(background, theme.color(mode, "--ui-bg"))).toBeLessThan(1.5)
	})

	it("focus ring passes 3:1 against cards, the page and tinted surfaces", () => {
		const ring = theme.color(mode, "--ui-primary")
		for (const [name, surface] of Object.entries(surfaces(mode))) {
			expect(contrastRatio(ring, surface), name).toBeGreaterThanOrEqual(GRAPHIC)
		}
	})

	it("list status colours pass 3:1 as chart fills on cards", () => {
		for (const status of ["completed", "planning", "dropped", "watching", "paused"]) {
			expect(contrastRatio(theme.color(mode, `--color-${status}`), card(mode)), status).toBeGreaterThanOrEqual(GRAPHIC)
		}
	})

	it("podium medals pass 3:1 as graphics on cards and on their own tint", () => {
		for (const medal of ["gold", "silver", "bronze"]) {
			const color = theme.color(mode, `--color-medal-${medal}`)
			expect(contrastRatio(color, card(mode)), medal).toBeGreaterThanOrEqual(GRAPHIC)
			expect(contrastRatio(color, composite(color, 0.15, card(mode))), `${medal} tint`).toBeGreaterThanOrEqual(GRAPHIC)
		}
	})
})

describe("dark surfaces", () => {
	it("stay near-black and primary-tinted", () => {
		const page = theme.color("dark", "--ui-bg")
		expect(contrastRatio(page, [0, 0, 0])).toBeLessThan(1.1)
		// Blue channel dominates: tinted, not neutral grey.
		expect(page[2]).toBeGreaterThan(page[0])
		expect(page[2]).toBeGreaterThan(page[1])
	})

	it("hairlines are visible against cards and the page without dominating", () => {
		const backgrounds = [card("dark"), theme.color("dark", "--ui-bg")]
		const steps = ["--ui-border", "--ui-border-muted", "--ui-border-accented"].map(token => theme.color("dark", token))

		for (const background of backgrounds) {
			const ratios = steps.map(step => contrastRatio(step, background))
			expect(ratios[0]).toBeGreaterThanOrEqual(1.5)
			expect(ratios[0]).toBeLessThanOrEqual(2)
			// Default, muted and accented keep their order of strength.
			expect(ratios[1]).toBeGreaterThan(ratios[0] ?? 0)
			expect(ratios[2]).toBeGreaterThan(ratios[1] ?? 0)
			expect(ratios[2]).toBeLessThan(GRAPHIC)
		}
	})
})

describe("stylesheet rules", () => {
	const css = read("app/assets/css/main.css")

	it("draws a solid 2px focus ring with a 2px offset as the global fallback", () => {
		expect(css).toMatch(/@layer base \{\s*:focus-visible \{\s*outline: 2px solid var\(--ui-primary\);\s*outline-offset: 2px;/)
	})

	it("re-colours every Nuxt UI 25% halo, including the navigation pill", () => {
		for (const color of ["primary", "secondary", "success", "info", "warning", "error", "inverted"]) {
			expect(css).toContain(`[class*="outline-${color}/25"]`)
			expect(css).toContain(`[class*="before:outline-${color}/25"]`)
		}
	})

	it("gives outline-less fields an indicator", () => {
		expect(css).toContain(":is(input, textarea, select)[class~=\"focus:outline-none\"]:focus-visible")
	})

	it("themes chart chrome from semantic tokens only", () => {
		const body = /\nbody \{([^}]+)\}/.exec(css)?.[1] ?? ""
		const declared = [...body.matchAll(/(--vis-[\w-]+):\s*([^;]+);/g)]

		expect(declared.map(match => match[1])).toEqual(expect.arrayContaining([
			"--vis-axis-grid-color",
			"--vis-axis-tick-color",
			"--vis-axis-tick-label-color",
			"--vis-axis-label-color",
			"--vis-tooltip-background-color",
			"--vis-tooltip-text-color",
			"--vis-tooltip-border-color"
		]))
		for (const [, name, value] of declared) {
			expect(value, name).toMatch(/^(var\(--[\w-]+\)|transparent)$/)
		}
	})

	it("keeps progress indicators alive under reduced motion", () => {
		const reduced = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"))
		expect(reduced).toMatch(/\.animate-spin,\s*\.animate-pulse,[^{]*\{\s*animation: progress-pulse [^;]*infinite !important;/)
		expect(css).toMatch(/@keyframes progress-pulse \{\s*50% \{\s*opacity:/)
	})
})
