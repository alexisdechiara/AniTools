<script setup lang="ts">
const open = ref(false)

useDashboard()

const { items: links } = useAppNavigation({
	onSelect: () => {
		open.value = false
	}
})
</script>

<template>
  <UDashboardGroup unit="rem" class="min-h-dvh">
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
        <UNavigationMenu
          :collapsed="collapsed"
          :items="links"
          aria-label="Primary navigation"
          orientation="vertical"
          tooltip
          popover
					:ui="{ childItem: 'first:pt-2' }"
        />
      </template>

      <template #footer="{ collapsed }">
        <UserMenu :collapsed="collapsed" />
      </template>
    </UDashboardSidebar>

		<main id="main-content" tabindex="-1" class="min-w-0 flex-1 overflow-hidden outline-none">
			<slot />
		</main>
  </UDashboardGroup>
</template>
