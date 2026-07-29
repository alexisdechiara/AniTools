<template>
  <UPageCard
    :ui="{
      title: 'text-xs capitalize text-toned font-medium',
      container: 'gap-y-2 group/grab',
      root: 'bg-white dark:bg-black',
      body: 'size-full',
    }"
    :class="{ 'cursor-grabbing': isDragging }">
    <template v-if="title" #title>
      <div class="flex items-center justify-between gap-3">
        <span
          class="truncate text-xs font-medium text-nowrap text-toned capitalize">{{ title }}</span>
        <USelect
          v-if="enableSortSelect"
          v-model="selectedSort"
          :items="selectItems"
          size="xs"
          variant="soft"
          :ui="{
            base: 'cursor-pointer',
            content: 'min-w-fit',
            item: 'px-2 cursor-pointer',
          }"
          aria-label="Sort"/>
      </div>
    </template>
    <button
      v-if="draggable"
      type="button"
      aria-label="Drag card"
      data-card-drag-handle
      class="absolute top-1.5 right-1.5 z-50 cursor-grab rounded p-1 opacity-0 transition-opacity duration-75 ease-in group-hover/grab:opacity-50 hover:opacity-100 focus-visible:opacity-100"
      :class="{ 'cursor-grabbing': isDragging }"
      @mousedown="onMouseDown">
      <Icon
        name="i-lucide-grip-vertical"
        aria-hidden="true"/>
    </button>
    <div
      v-if="value !== undefined && value !== null && value !== ''"
      class="flex h-fit items-center">
      <span class="text-2xl font-semibold text-ellipsis text-highlighted">
        {{ value }}
      </span>
      <div
        v-if="change !== undefined"
        class="ms-auto inline-flex h-fit items-center gap-x-1.5 text-xs font-normal"
        :class="change > 0
          ? 'text-success-600'
          : change < 0
            ? 'text-error-600'
            : 'text-muted'">
        <div class="inline-flex gap-x-0.5">
          {{ change > 0 ? "+" : change < 0 ? "-" : "" }}
          <span>{{ Math.abs(change).toFixed(2) }}</span>
          {{ changeUnit }}
        </div>
        <Icon
          v-if="showChangeIcon && change !== 0"
          :name="change > 0 ? 'i-lucide-trending-up' : 'i-lucide-trending-down'"/>
      </div>
    </div>
    <slot />
  </UPageCard>
</template>

<script lang="ts" setup>
import type { MetricSort } from "../../stores/Statistics";
withDefaults(
  defineProps<{
    title?: string;
    value?: string | number;
    change?: number;
    changeUnit?: string | "%";
    showChangeIcon?: boolean;
    draggable?: boolean;
    enableSortSelect?: boolean;
    selectItems?: Array<{ value: string; label: string }>;
  }>(),
  {
    title: undefined,
    value: undefined,
    change: undefined,
    changeUnit: "%",
    showChangeIcon: true,
    draggable: false,
    enableSortSelect: false,
    selectItems: () => [
      { value: "count", label: "Count" },
      { value: "meanScore", label: "Mean Score" },
      { value: "minutesWatched", label: "Watch Time" },
    ],
  }
);

const isDragging = ref(false);
const selectedSort = defineModel<MetricSort>("sort", { default: "count" });

const onMouseDown = () => {
  if (!import.meta.client) return;
  isDragging.value = true;

  const onMouseUp = () => {
    isDragging.value = false;
    document.removeEventListener("mouseup", onMouseUp);
  };

  document.addEventListener("mouseup", onMouseUp, { once: true });
};
</script>
