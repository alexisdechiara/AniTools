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
			slots: {
				root: "mx-6 py-6"
			},
			variants: {
				side: {
					left: {
						root: "border-none"
					}
				}
			}
		},
		header: {
			slots: {
				root: "border-none"
			}
		}
	}
})
