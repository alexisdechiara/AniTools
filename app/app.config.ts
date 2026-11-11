/*
 * Soft and subtle status colours sit on a 10% tint of themselves, where the alias used for
 * text on a plain surface no longer reaches 4.5:1 (success 700 on its own tint: 4.4:1). The
 * 800 steps clear it on every surface; dark keeps the 400 steps, which already pass. Class
 * names stay literal so Tailwind can see them. Ratios are asserted in
 * tests/unit/theme-contrast.test.ts.
 */
const tintedStatusText = {
	success: "text-success-800 dark:text-success-400",
	info: "text-info-800 dark:text-info-400",
	warning: "text-warning-800 dark:text-warning-400",
	error: "text-error-800 dark:text-error-400"
} as const

const statusColors = ["success", "info", "warning", "error"] as const
const tintedVariants = ["soft", "subtle"] as const
// Outline and ghost buttons pick up the same tint on hover, so they take the same ink.
const tintedButtonVariants = [...tintedVariants, "outline", "ghost"] as const

const tintedStatus = statusColors.flatMap(color =>
	tintedVariants.map(variant => ({ color, variant, text: tintedStatusText[color] }))
)
const tintedStatusButtons = statusColors.flatMap(color =>
	tintedButtonVariants.map(variant => ({ color, variant, class: tintedStatusText[color] }))
)

export default defineAppConfig({
	ui: {
		colors: {
			primary: "indigo",
			secondary: "amber",
			neutral: "gray"
		},
		button: {
			compoundVariants: [
				// Hover used to fade the fill to 75%, which drops the label below 4.5:1; step the fill instead.
				{
					color: "primary",
					variant: "solid",
					class: "hover:bg-primary-700 active:bg-primary-700 dark:hover:bg-primary-300 dark:active:bg-primary-300"
				},
				...tintedStatusButtons
			]
		},
		badge: {
			compoundVariants: tintedStatus.map(({ color, variant, text }) => ({ color, variant, class: text }))
		},
		alert: {
			slots: {
				// The default 90% opacity takes status descriptions back under 4.5:1 on their tint.
				description: "opacity-100"
			},
			compoundVariants: tintedStatus.map(({ color, variant, text }) => ({ color, variant, class: { root: text } }))
		},
		navigationMenu: {
			compoundVariants: [
				// Nuxt UI colours the active pill label with the primary; the label reads better as ink, the icon keeps the accent.
				{
					color: "primary",
					variant: "pill",
					active: true,
					class: {
						link: "text-highlighted"
					}
				}
			],
			variants: {
				orientation: {
					vertical: {
						list: "space-y-1",
						link: "before:rounded-3xl rounded-3xl",
						label: "py-3",
						linkLeadingIcon: "py-3 mx-1"
					}
				},
				active: {
					true: {
						// 12% of the primary alias is the lavender pill light mode always had; dark uses its tinted surface.
						link: "bg-primary/12 dark:bg-elevated before:rounded-3xl rounded-3xl"
					}
				}
			}
		},
		pageHero: {
			slots: {
				title: "text-4xl sm:text-6xl",
				headline: "mb-2"
			},
			variants: {
				title: {
					true: {
						description: "mt-2"
					}
				}
			}
		},
		pageCard: {
			slots: {
				root: "bg-white dark:bg-black rounded-md"
			}
		},
		dashboardSidebar: {
			variants: {
				side: {
					left: {
						root: "border-none"
					}
				}
			}
		},
		dashboardPanel: {
			slots: {
				root: "overflow-y-auto",
				body: "pt-12 sm:pt-16"
			}
		},
		header: {
			slots: {
				root: "border-none"
			}
		},
		formField: {
			variants: {
				orientation: {
					horizontal: {
						root: "grid items-center grid-cols-3",
						wrapper: "col-span-2",
						container: "col-span-1 w-full flex justify-center"
					}
				}
			}
		},
		radioGroup: {
			compoundVariants: [
				{
					size: "xs",
					variant: [
						"card",
						"table"
					],
					class: {
						item: "py-1.5 px-2.5"
					}
				}
			],
			variants: {
				orientation: {
					horizontal: {
						item: "first:rounded-s-full! last:rounded-e-full!"
					}
				},
				variant: {
					table: {
						item: "group cursor-pointer has-data-[state=checked]:bg-primary! has-data-[state=checked]:border-primary! hover:bg-primary/10 hover:border-primary/50",
						label: "group-has-data-[state=checked]:text-inverted!"
					}
				}
			}
		}
	}
})
