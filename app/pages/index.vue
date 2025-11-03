<script setup lang="ts">
import { ref } from "vue"
import { GridLayout, GridItem, type LayoutItem } from "grid-layout-plus"
import { ComponentType, getComponentById } from "~/config/components"

const user = useUserStore()

interface CardItem extends LayoutItem {
	componentId: number
	componentProps?: Record<string, unknown>
}

// Configuration du layout avec les composants
const layout = ref<Array<CardItem>>([
	{ x: 0, y: 0, w: 3, h: 1, i: '1', componentId: ComponentType.MetricsCard, componentProps: { title: 'Watch Time', value: '1d 23h 18m', change: 11.01 } },
	{ x: 3, y: 0, w: 3, h: 1, i: '2', componentId: ComponentType.MetricsCard, componentProps: { title: 'Episodes', value: '42', change: 5.5 } },
	{ x: 6, y: 0, w: 3, h: 1, i: '3', componentId: ComponentType.MetricsCard, componentProps: { title: 'Shows', value: '12', change: -2.3 } },
	{ x: 0, y: 2, w: 9, h: 3, i: '4', componentId: ComponentType.MeanScoreBarCard },
	{ x: 9, y: 0, w: 3, h: 4, i: '5', componentId: ComponentType.StatusDonutCard },
	{ x: 0, y: 5, w: 12, h: 2, i: '6', componentId: ComponentType.ActivityOverviewCard, componentProps: { year: new Date().getFullYear() } },
]);
</script>

<template>
  <UDashboardPanel id="home">
    <div class="flex flex-col px-4 sm:px-6 pt-4 sm:pt-6">
      <span class="font-semibold text-highlighted text-4xl"
        >Hey {{ user.username }} 👋</span
      >
      <span class="text-dimmed font-light text-2xl">Here all your summary</span>
    </div>
    <div class="relative">
      <GridLayout
        :layout="layout"
        :margin="[16, 16]"
        :row-height="104"
        class="size-full absolute inset-0"
      >
        <GridItem
          v-for="item in layout"
          :key="item.i"
          :x="item.x"
          :y="item.y"
          :w="item.w"
          :h="item.h"
          :i="item.i"
          drag-allow-from=".draggable-grip"
        >
          <template v-if="getComponentById(item.componentId)">
            <component
              :is="getComponentById(item.componentId)"
              v-bind="item.componentProps"
              draggable
              class="size-full"
            />
          </template>
          <UAlert
            v-else
            icon="i-lucide-alert-octagon"
            title="Error"
            description="An error occurred while loading the card"
            variant="subtle"
            color="error"
            class="draggable-grip size-full"
          />
        </GridItem>
      </GridLayout>
    </div>
    <UButton
      icon="i-lucide-plus"
      label="Add a card"
      class="m-4 ring-0 border border-dashed cursor-pointer flex items-center justify-center py-4"
      variant="outline"
      size="xl"
    />
  </UDashboardPanel>
</template>

<style>
.vgl-item__resizer {
  opacity: 0;
}

.vgl-item--placeholder {
  border-radius: var(--radius-md);
}
</style>

<style scoped>
.vgl-layout {
  --vgl-placeholder-bg: var(--ui-bg-elevated);
  --vgl-placeholder-opacity: 50%;
}
</style>
