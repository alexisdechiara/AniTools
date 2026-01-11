export default defineAppConfig({
	ui: {
		colors: {
			primary: "indigo",
			secondary: "amber",
			neutral: "gray"
		},
		navigationMenu: {
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
						link: "bg-primary-100 text-highlighted before:rounded-3xl rounded-3xl"
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
