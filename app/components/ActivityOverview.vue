<template>
  <div class="w-full">
    <!-- Légende des mois -->
    <div
      v-if="showMonths"
      class="flex justify-between text-[10px] text-gray-500 w-full overflow-hidden"
    >
      <span
        v-for="(month, index) in months"
        :key="index"
        class="flex-1 text-center truncate"
        :class="{ 'opacity-0': !month }"
      >
        {{ month }}
      </span>
    </div>

    <!-- Grille d'activité -->
    <div class="flex gap-1 w-full overflow-x-auto py-1">
      <!-- Jours de la semaine -->
      <div
        v-if="showDays"
        class="flex flex-col gap-1 mr-1 text-[10px] text-gray-500 flex-shrink-0"
      >
        <div
          v-for="(day, index) in ['', 'Mon', '', 'Wed', '', 'Fri', '']"
          :key="index"
          class="flex items-center justify-end pr-1"
          :class="{
            'h-3': size === 'sm',
            'h-4': size === 'md',
            'h-5': size === 'lg',
            'opacity-0': !day,
          }"
        >
          {{ day }}
        </div>
      </div>

      <!-- Grille des jours -->
      <div class="grid grid-flow-col grid-rows-7 gap-0.5 flex-1 min-w-0">
        <div v-for="(day, index) in activityData" :key="index">
          <UTooltip
            :delay-duration="0"
            :content="{
              side: 'top',
              align: 'center',
              sideOffset: 8,
              collisionPadding: 8,
            }"
          >
            <template #default>
              <div
                :class="[
                  'rounded-[2px]',
                  day.isCurrentMonth ? 'bg-primary' : 'bg-gray-100 dark:bg-gray-800',
                  'cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0',
                  {
                    'w-3 h-3': size === 'sm',
                    'w-4 h-4': size === 'md',
                    'w-5 h-5': size === 'lg',
                  },
                ]"
                :style="{ opacity: day.opacity }"
              />
            </template>
            <template #content>
              {{
                `${day.date.getDate()} ${day.date.toLocaleString("en-US", {
                  month: "long",
                })} ${day.date.getFullYear()}`
              }}
            </template>
          </UTooltip>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    year: number;
    showDays?: boolean;
    showMonths?: boolean;
    size?: "sm" | "md" | "lg";
    activityData: Array<{
      date: Date;
      opacity: number;
      isCurrentMonth: boolean;
    }>;
  }>(),
  {
    year: () => new Date().getFullYear(),
    showDays: true,
    showMonths: true,
    size: "md",
    activityData: () => [],
  }
);

// Vérifie si une année est bissextile
const isLeapYear = (year: number): boolean => {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
};

// Génère les données d'activité pour l'année
const activityData = computed(() => {
  if (props.activityData.length > 0) {
    return props.activityData;
  }

  const year = props.year;
  const isLeap = isLeapYear(year);
  const daysInYear = isLeap ? 366 : 365;
  const startDate = new Date(year, 0, 1);
  const data = [];

  // Trouver le premier jour de la semaine (0 = dimanche, 1 = lundi, etc.)
  const firstDayOfWeek = startDate.getDay();
  // Ajuster pour commencer la semaine le lundi
  const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  // Ajouter des jours vides pour la première semaine
  for (let i = 0; i < startOffset; i++) {
    data.push({
      date: new Date(year, 0, -startOffset + i + 1),
      opacity: 0,
      isCurrentMonth: false,
    });
  }

  // Ajouter les jours de l'année
  for (let i = 0; i < daysInYear; i++) {
    const date = new Date(year, 0, i + 1);
    // Générer une opacité aléatoire entre 0.1 et 1
    const opacity = 0.1 + Math.random() * 0.9;
    data.push({ date, opacity, isCurrentMonth: true });
  }

  return data;
});

// Génère les libellés des mois pour la légende
const months = computed((): string[] => {
  const monthLabels: string[] = [];
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  // Générer les libellés des mois
  for (let i = 0; i < 52; i++) {
    const dayIndex = i * 7; // Prendre le premier jour de chaque colonne
    if (dayIndex < activityData.value.length) {
      const day = activityData.value[dayIndex];
      if (day?.isCurrentMonth) {
        const month = day.date.getMonth();
        // Ne montrer le mois que s'il n'a pas encore été affiché
        if (
          monthNames[month] &&
          monthLabels[monthLabels.length - 1] !== monthNames[month]
        ) {
          monthLabels.push(monthNames[month]);
        } else {
          monthLabels.push("");
        }
      } else {
        monthLabels.push("");
      }
    } else {
      monthLabels.push("");
    }
  }

  // Réduire le nombre de mois affichés pour éviter le surpeuplement
  const filteredMonths: string[] = [];
  let lastMonth = "";

  for (const label of monthLabels) {
    if (label && label !== lastMonth) {
      filteredMonths.push(label);
      lastMonth = label;
    } else {
      filteredMonths.push("");
    }
  }

  return filteredMonths;
});
</script>
