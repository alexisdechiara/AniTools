<script setup lang="ts">
import { getFeaturePageTitle } from "#shared/config/features"

const open = ref(false)
const route = useRoute()

useDashboard()

const { items: links } = useAppNavigation({
	onSelect: () => {
		open.value = false
	}
})

const mobileTitle = computed(() =>
	route.meta.feature ? getFeaturePageTitle(route.meta.feature) : "AniTools"
)
</script>

<template>
	<UDashboardGroup unit="rem" class="min-h-dvh">
		<UDashboardSidebar
			id="default"
			v-model:open="open"
			collapsible
			resizable
			:menu="{ title: 'Navigation', description: 'Every AniTools page and your account menu.' }"
			:ui="{ footer: 'lg:border-t lg:border-default', body: 'px-3' }">
			<template #header="{ collapsed }">
				<UDashboardSidebarCollapse
					:class="collapsed ? 'w-full' : 'w-fit'"
					:ui="{ base: 'rounded-full cursor-pointer' }" />
				<NuxtLink
					v-if="!collapsed"
					to="/"
					class="rounded-md text-lg font-bold tracking-tight text-highlighted focus-visible:outline-2 focus-visible:outline-primary">
					<span class="text-primary">Ani</span>Tools
				</NuxtLink>
			</template>

			<template #default="{ collapsed }">
				<UNavigationMenu
					:collapsed="collapsed"
					:items="links"
					aria-label="Primary navigation"
					orientation="vertical"
					tooltip
					popover
					:ui="{ childItem: 'first:pt-2' }" />
			</template>

			<template #footer="{ collapsed }">
				<UserMenu :collapsed="collapsed" />
			</template>
		</UDashboardSidebar>

		<main id="main-content" tabindex="-1" class="min-w-0 flex-1 overflow-x-hidden overflow-y-auto outline-none">
			<!-- Below lg the sidebar becomes a drawer: this bar is the only way to open it. -->
			<div
				data-mobile-navbar
				class="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-default bg-default/90 px-3 backdrop-blur lg:hidden">
				<UDashboardSidebarToggle
					color="neutral"
					variant="ghost"
					aria-label="Open navigation" />
				<p class="min-w-0 truncate text-sm font-semibold text-highlighted">
					{{ mobileTitle }}
				</p>
				<NuxtLink
					to="/"
					class="ms-auto rounded-md text-sm font-bold tracking-tight text-highlighted focus-visible:outline-2 focus-visible:outline-primary">
					<span class="text-primary">Ani</span>Tools
				</NuxtLink>
			</div>
			<slot />
		</main>
	</UDashboardGroup>
</template>
