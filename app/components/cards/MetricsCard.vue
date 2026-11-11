<template>
  <UPageCard
    :data-card-controls="draggable ? '' : undefined"
    :ui="{
      title: 'text-xs text-toned font-medium',
      container: 'gap-y-2 group/grab min-w-0 lg:grid-cols-[minmax(0,1fr)]',
      root: 'bg-white dark:bg-black min-w-0 overflow-hidden',
      body: 'size-full min-w-0',
    }"
    :class="{ 'cursor-grabbing': isDragging }">
    <template v-if="title" #title>
      <div
        class="flex items-center justify-between gap-3"
        :class="{ 'card-controls-gutter': draggable }">
        <h2
          class="truncate text-xs font-medium text-nowrap text-toned">{{ title }}</h2>
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
    <!-- Dashboard controls. The options button is always visible: hover does not exist on touch. -->
    <div
      v-if="draggable"
      class="absolute top-1 right-1 z-50 flex items-center">
      <button
        type="button"
        :aria-label="`Drag ${controlsLabel}`"
        title="Drag to reorder"
        data-card-drag-handle
        class="inline-flex size-8 cursor-grab touch-none items-center justify-center rounded-md text-muted opacity-0 transition-opacity duration-75 ease-in group-hover/grab:opacity-70 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-primary pointer-coarse:size-11 pointer-coarse:opacity-70"
        :class="{ 'cursor-grabbing': isDragging }"
        @mousedown="onMouseDown"
        @keydown.alt.left.prevent="emit('move', -1)"
        @keydown.alt.right.prevent="emit('move', 1)">
        <Icon
          name="i-lucide-grip-vertical"
          aria-hidden="true"/>
      </button>
      <UDropdownMenu
        v-if="optionsItems?.length"
        :items="optionsItems"
        :content="{ align: 'end', collisionPadding: 12 }"
        size="sm">
        <UButton
          icon="i-lucide-ellipsis"
          color="neutral"
          variant="ghost"
          :aria-label="`Card options for ${controlsLabel}`"
          data-card-options
          class="size-8 justify-center rounded-md text-muted data-[state=open]:bg-elevated data-[state=open]:text-highlighted pointer-coarse:size-11"
          @keydown.alt.left.prevent="emit('move', -1)"
          @keydown.alt.right.prevent="emit('move', 1)"/>
      </UDropdownMenu>
    </div>
    <div
      v-if="value !== undefined && value !== null && value !== ''"
      class="@container flex h-fit items-center">
      <!-- Narrow cards (tablet grid) drop a size instead of wrapping "90d 12h 37m" out of the card. -->
      <span
        class="truncate text-base font-semibold whitespace-nowrap text-highlighted tabular-nums @[9rem]:text-lg @[10rem]:text-xl @[13rem]:text-2xl"
        :title="String(value)">
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
import type { DropdownMenuItem } from "@nuxt/ui";
import type { MetricSort } from "../../stores/Statistics";

const emit = defineEmits<{
  move: [direction: -1 | 1];
}>();

const props = withDefaults(
  defineProps<{
    title?: string;
    value?: string | number;
    change?: number;
    changeUnit?: string | "%";
    showChangeIcon?: boolean;
    draggable?: boolean;
    /** Dashboard only: the card's menu (move, remove), opened from the visible options button. */
    optionsItems?: DropdownMenuItem[][];
    /** Name used by the dashboard controls when it differs from the title or there is none. */
    optionsLabel?: string;
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
    optionsItems: undefined,
    optionsLabel: undefined,
    enableSortSelect: false,
    selectItems: () => [
      { value: "count", label: "Count" },
      { value: "meanScore", label: "Mean score" },
      { value: "minutesWatched", label: "Watch time" },
    ],
  }
);

const controlsLabel = computed(() => props.optionsLabel ?? props.title ?? "this card");
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

<style scoped>
/* Width of the dashboard controls in the top-right corner: drag handle and options button. */
[data-card-controls] {
  --card-controls-width: 4rem;
}

@media (pointer: coarse) {
  [data-card-controls] {
    --card-controls-width: 5.5rem;
  }
}

.card-controls-gutter {
  padding-inline-end: calc(var(--card-controls-width) - 0.5rem);
}

/*
 * Several cards pin their own control (sort select, tabs, pager) to the top-right corner with
 * these utilities. On the dashboard that corner belongs to the card controls, so they step aside.
 */
[data-card-controls] :deep(.absolute.top-6.right-6),
[data-card-controls] :deep(.absolute.top-0.right-0) {
  margin-inline-end: calc(var(--card-controls-width) - 0.5rem);
}

/* A tab bar is too wide to sit beside the touch-sized controls on a phone: it moves below them. */
@media (pointer: coarse) and (max-width: 40rem) {
  [data-card-controls] :deep(.absolute.top-6.right-6[data-orientation]) {
    margin-block-start: 2rem;
    margin-inline-end: 0;
  }
}
</style>
