<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui"

const toast = useToast()

const open = ref(false)

const links = [[{
	label: "Playground",
	icon: "i-lucide-layout-dashboard",
	to: "/",
	onSelect: () => {
		open.value = false
	}
}, {
	label: "Statistics",
	icon: "i-lucide-chart-no-axes-combined",
	to: '/statistics',
	children: [{
		label: 'Overview',
		to: '/statistics',
		onSelect: () => {
			open.value = false
		}
	}, {
			label: 'Genres',
			to: '/statistics/genres',
			onSelect: () => {
				open.value = false
			},
			disabled: true
		}, {
			label: 'Tags',
			to: '/statistics/tags',
			onSelect: () => {
				open.value = false
			},
			disabled: true
		}, {
			label: 'Voice Actors',
			to: '/statistics/voice-actors',
			onSelect: () => {
				open.value = false
			},
			disabled: true
		}, {
			label: 'Studios',
			to: '/statistics/studios',
			onSelect: () => {
				open.value = false
			},
			disabled: true
		}, {
			label: 'Staff',
			to: '/statistics/staff',
			onSelect: () => {
				open.value = false
			},
			disabled: true
		}]
}, {
	label: "Rewind",
	icon: "i-lucide-rewind",
	to: `/rewind/${new Date().getFullYear()}`,
	onSelect: () => {
		open.value = false
	}
}, {
	label: "Tierlist",
	icon: "i-lucide-rows-3",
	to: "/tierlist",
	onSelect: () => {
		open.value = false
	}
}, {
	label: "Create",
	icon: "i-lucide-circle-fading-plus",
	to: "/create",
	disabled: true,
	onSelect: () => {
		open.value = false
	}
}, {
	label: "Calendar",
	icon: "i-lucide-calendar-days",
	to: "/calendar",
	onSelect: () => {
		open.value = false
	}
}, {
	label: "Explore",
	icon: "i-lucide-telescope",
	to: "/explore",
	disabled: true,
	onSelect: () => {
		open.value = false
	}
}, {
	label: "Podium",
	icon: "i-lucide-trophy",
	to: "/podium",
	disabled: true,
	onSelect: () => {
		open.value = false
	}
}, {
	label: "Timeline",
	icon: "i-lucide-chart-no-axes-gantt",
	to: "/timeline",
	disabled: true,
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
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="default"
      v-model:open="open"
      collapsible
      resizable
      :ui="{ footer: 'lg:border-t lg:border-default', body: 'px-3' }"
    >
      <template #header="{ collapsed }">
        <UDashboardSidebarCollapse
          :class="collapsed ? 'w-full' : 'w-fit'"
          :ui="{ base: 'rounded-full cursor-pointer' }"
        />
        <UHeader v-if="!collapsed" title="AniTools" />
      </template>

      <template #default="{ collapsed }">
        <!-- <UDashboardSearchButton :collapsed="collapsed" variant="ghost" :ui="{ base: 'bg-elevated/50 rounded-3xl cursor-pointer', leadingIcon: 'ms-1'}" /> -->

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
          class="mt-auto"
        />
      </template>

      <template #footer="{ collapsed }">
        <UserMenu :collapsed="collapsed" />
      </template>
    </UDashboardSidebar>

    <slot />

    <NotificationsSlideover />
  </UDashboardGroup>
</template>
