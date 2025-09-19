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
		dashboardSidebar: {
			variants: {
				side: {
					left: {
						root: "border-none"
					}
				}
			}
		}
	}
})
