<template>
  <MetricsCard title="Genres" v-bind="$attrs">
    <USelect
      v-model="selectedSort"
      :items="sortItems"
      size="xs"
      variant="soft"
      class="absolute top-6 right-6 z-10 cursor-pointer"
      :ui="{ content: 'min-w-fit', item: 'px-2 cursor-pointer' }"
      aria-label="Sort"
    />
    <ol class="flex flex-col group mt-2">
      <template v-for="(item, index) in list" :key="item.name">
        <GenresAndTagsPopover v-if="index < 5" v-bind="item">
          <li
            class="flex items-center gap-2 cursor-pointer transition duration-200 py-1.5 hover:scale-101"
            @mouseover="handleMouseOver(item.name)"
            @mouseleave="handleMouseLeave()"
          >
            <NuxtImg
              v-if="item.entries && item.entries.length > 0"
              :src="
                item.entries[getRandomEntryIndex(item.name, item.entries)]?.media
                  ?.coverImage?.large ||
                item.entries[getRandomEntryIndex(item.name, item.entries)]?.media
                  ?.coverImage?.medium ||
                ''
              "
              :alt="
                item.entries[getRandomEntryIndex(item.name, item.entries)]?.media?.title
                  ?.english ||
                item.entries[getRandomEntryIndex(item.name, item.entries)]?.media?.title
                  ?.romaji ||
                ''
              "
              class="size-10 rounded-sm aspect-square object-cover"
            />
            <div
              v-else
              class="size-10 bg-elevated rounded-sm aspect-square relative overflow-hidden"
            >
              <Icon
                :name="item.icon || 'i-lucide-help-circle'"
                class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-6 text-primary-400"
              />
            </div>
            <div class="flex flex-col w-full gap-y-1">
              <div class="flex justify-between w-full">
                <span class="text-xs font-medium">{{ item.name }}</span>
              </div>
              <UProgress
                v-model="progressValues[item.name]"
                :ui="{
                  base: 'bg-transparent',
                  indicator: `transition-colors group-hover:bg-elevated duration-200 ${
                    hoveredItem === item.name || (index === 0 && hoveredItem === null)
                      ? '!bg-primary'
                      : 'bg-elevated'
                  }`,
                }"
                size="lg"
              />
            </div>
          </li>
        </GenresAndTagsPopover>
      </template>
    </ol>
  </MetricsCard>
</template>

<script lang="ts" setup>
const hoveredItem = ref<string | null>(null);
// Pour stocker l'index aléatoire de l'image affichée pour chaque élément de la liste
const currentEntryIndex = ref<Record<string, number>>({});

const sortItems = [
  { value: "count", label: "Count" },
  { value: "meanScore", label: "Mean Score" },
  { value: "minutesWatched", label: "Watch Time" },
];

const selectedSort = defineModel<string>("sort", { default: "count", required: true });

const handleMouseOver = (name: string) => {
  hoveredItem.value = name;
};

const handleMouseLeave = () => {
  hoveredItem.value = null;
};

// Fonction pour obtenir un index aléatoire unique pour chaque nom
const getRandomEntryIndex = (name: string, entries: any[]): number => {
  // Si c'est la première fois qu'on traite ce nom ou si l'index n'est pas défini
  if (currentEntryIndex.value[name] === undefined && entries.length > 0) {
    // Génère un index aléatoire entre 0 et le nombre d'entrées - 1
    currentEntryIndex.value[name] = Math.floor(Math.random() * entries.length);
  }
  return currentEntryIndex.value[name] || 0;
};

export type listType = {
  name: string;
  count?: number;
  meanScore?: number;
  minutesWatched?: number;
  entries?: any[];
  icon?: string;
};

const props = defineProps<{ list: listType[] | any }>();

// Vérifie si les scores sont sur une échelle 0-10 ou 0-100
const isMeanScoreOutOfTen = computed(() => {
  if (!props.list.length) return true; // Par défaut, on suppose que c'est sur 10
  const maxScore = Math.max(
    ...props.list
      .map((item: listType) => item.meanScore ?? 0)
      .filter((score: number) => score > 0) // On ignore les scores à 0 pour éviter les faux positifs
  );
  return maxScore <= 10; // Si le score max est <= 10, on considère que c'est sur 10
});

const maxValue = computed(() => {
  if (!props.list.length) return 0;
  return Math.max(
    ...props.list.map((item: listType) =>
      selectedSort.value === "count"
        ? item.count ?? 0
        : selectedSort.value === "meanScore"
        ? item.meanScore ?? 0
        : selectedSort.value === "minutesWatched"
        ? item.minutesWatched ?? 0
        : 0
    )
  );
});

function calculatePercentage(value: number): number {
  if (maxValue.value === 0) return 0;
  // Si c'est un meanScore et que c'est sur 10, on convertit en échelle 0-100
  const normalizedValue =
    selectedSort.value === "meanScore" && isMeanScoreOutOfTen.value ? value * 10 : value;

  return Math.min(100, Math.max(0, Math.floor((normalizedValue / maxValue.value) * 100)));
}

const progressValues = ref<Record<string, number>>({});

// Initialisation des valeurs de progression
watchEffect(() => {
  if (props.list) {
    props.list.forEach((item: listType) => {
      progressValues.value[item.name] = calculatePercentage(
        selectedSort.value === "count"
          ? item.count ?? 0
          : selectedSort.value === "meanScore"
          ? item.meanScore ?? 0
          : selectedSort.value === "minutesWatched"
          ? item.minutesWatched ?? 0
          : 0
      );
    });
  }
});
</script>

<style scoped></style>
