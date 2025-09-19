<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui"

const route = useRoute()
const toast = useToast()

const open = ref(false)

const links = [[{
	label: "Overview",
	icon: "i-lucide-layout-dashboard",
	to: "/",
	onSelect: () => {
		open.value = false
	}
}, {
	label: "Statistics",
	icon: "i-lucide-chart-no-axes-combined",
	to: "/inbox",
	onSelect: () => {
		open.value = false
	}
}, {
	label: "Rewind",
	icon: "i-lucide-rewind",
	to: "/inbox",
	onSelect: () => {
		open.value = false
	}
}, {
	label: "Tierlist",
	icon: "i-lucide-rows-3",
	to: "/inbox",
	onSelect: () => {
		open.value = false
	}
}, {
	label: "Create",
	icon: "i-lucide-circle-fading-plus",
	to: "/customers",
	onSelect: () => {
		open.value = false
	}
}, {
	label: "Calendar",
	icon: "i-lucide-calendar-days",
	to: "/customers",
	onSelect: () => {
		open.value = false
	}
}, {
	label: "Explore",
	icon: "i-lucide-telescope",
	to: "/customers",
	onSelect: () => {
		open.value = false
	}
}, {
	label: "Podium",
	icon: "i-lucide-trophy",
	to: "/customers",
	onSelect: () => {
		open.value = false
	}
}, {
	label: "Timeline",
	icon: "i-lucide-chart-no-axes-gantt",
	to: "/customers",
	onSelect: () => {
		open.value = false
	}
}], [{
	label: "Feedback",
	icon: "i-lucide-message-circle",
	to: "https://github.com/nuxt-ui-templates/dashboard",
	target: "_blank"
}, {
	label: "Help & Support",
	icon: "i-lucide-info",
	to: "https://github.com/nuxt-ui-templates/dashboard",
	target: "_blank"
}]] satisfies NavigationMenuItem[][]

const groups = computed(() => [{
	id: "links",
	label: "Go to",
	items: links.flat()
}, {
	id: "code",
	label: "Code",
	items: [{
		id: "source",
		label: "View page source",
		icon: "i-simple-icons-github",
		to: `https://github.com/nuxt-ui-templates/dashboard/blob/main/app/pages${route.path === "/" ? "/index" : route.path}.vue`,
		target: "_blank"
	}]
}])

onMounted(async () => {
	const cookie = useCookie("cookie-consent")
	if (cookie.value === "accepted") {
		return
	}

	toast.add({
		title: "We use first-party cookies to enhance your experience on our website.",
		duration: 0,
		close: false,
		actions: [{
			label: "Accept",
			color: "neutral",
			variant: "outline",
			onClick: () => {
				cookie.value = "accepted"
			}
		}, {
			label: "Opt out",
			color: "neutral",
			variant: "ghost"
		}]
	})
})
</script>

<template>
	<UDashboardGroup unit="rem">
		<UDashboardSidebar
			id="default"
			v-model:open="open"
			collapsible
			resizable
			:ui="{ footer: 'lg:border-t lg:border-default', body: 'px-3'}">
			<template #header="{ collapsed }">
				<UDashboardSidebarCollapse :class="collapsed ? 'w-full' : 'w-fit'" :ui="{ base: 'rounded-full cursor-pointer'}" />
				<UHeader v-if="!collapsed" title="AniTools" />
			</template>

			<template #default="{ collapsed }">
				<UDashboardSearchButton :collapsed="collapsed" variant="ghost" :ui="{ base: 'bg-elevated/50 rounded-3xl cursor-pointer', leadingIcon: 'ms-1'}" />

				<UNavigationMenu
					:collapsed="collapsed"
					:items="links[0]"
					orientation="vertical"
					tooltip
					popover
					/>

				<UNavigationMenu
					:collapsed="collapsed"
					:items="links[1]"
					orientation="vertical"
					tooltip
					variant="link"
					class="mt-auto" />
			</template>

			<template #footer="{ collapsed }">
				<UserMenu :collapsed="collapsed" />
			</template>
		</UDashboardSidebar>

		<UDashboardSearch :groups="groups" />

		<slot />

		<NotificationsSlideover />
	</UDashboardGroup>
</template>
