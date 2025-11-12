<template>
  <UPageCard
    :ui="{
      title: 'text-xs capitalize text-toned font-medium',
      container: 'gap-y-2 group/grab',
      root: 'bg-white dark:bg-black',
      body: 'size-full',
    }"
    :class="{ 'cursor-grabbing': isDragging }"
  >
    <template v-if="title" #title>
      <div class="flex items-center justify-between gap-3">
        <span
          class="text-xs capitalize text-toned font-medium text-ellipsis text-nowrap overflow-hidden whitespace-nowrap"
          >{{ title }}</span
        >
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
          aria-label="Sort"
        />
      </div>
    </template>
    <Icon
      v-if="draggable"
      name="i-lucide-grip-vertical"
      class="draggable-grip absolute top-1.5 right-1.5 z-999 group-hover/grab:opacity-50 hover:opacity-100 opacity-0 cursor-grab transition-opacity duration-75 ease-in"
      :class="{ 'cursor-grabbing': isDragging }"
      @mousedown="onMouseDown"
    />
    <div v-if="value" class="flex h-fit items-center">
      <span class="text-2xl font-semibold text-highlighted text-ellipsis">
        {{ value }}
      </span>
      <div
        v-if="change"
        class="ms-auto text-xs font-normal inline-flex items-center gap-x-1.5 h-fit"
        :class="change > 0 ? 'text-success-600' : 'text-error-600'"
      >
        <div class="inline-flex gap-x-0.5">
          {{ change > 0 ? "+" : "-" }}
          <span>{{ Math.abs(change).toFixed(2) }}</span>
          {{ changeUnit }}
        </div>
        <Icon
          v-if="showChangeIcon"
          :name="change > 0 ? 'i-lucide-trending-up' : 'i-lucide-trending-down'"
        />
      </div>
    </div>
    <slot />
  </UPageCard>
</template>

<script lang="ts" setup>
import type { MetricSort } from "../../stores/Statistics";
const props = withDefaults(
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
  isDragging.value = true;

  const onMouseUp = () => {
    isDragging.value = false;
    document.removeEventListener("mouseup", onMouseUp);
  };

  document.addEventListener("mouseup", onMouseUp, { once: true });
};
</script>
