<template>
  <MetricsCard title="Activity Overview" v-bind="$attrs">
    <ActivityOverview
      :year="year"
      :show-days="showDays"
      :show-months="showMonths"
      :size="size"
      :activity-data="activityData"
    />
  </MetricsCard>
</template>

<script lang="ts" setup>
const props = withDefaults(
  defineProps<{
    year: number;
    showDays?: boolean;
    showMonths?: boolean;
    size?: "sm" | "md" | "lg";
  }>(),
  {
    year: () => new Date().getFullYear(),
    showDays: false,
    showMonths: false,
    size: "md",
  }
);

// Vérifie si une année est bissextile
const isLeapYear = (year: number): boolean => {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
};

// Génère les données d'activité pour l'année
const activityData = computed(() => {
  const year = props.year;
  const isLeap = isLeapYear(year);
  const daysInYear = isLeap ? 366 : 365;
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);

  // Trouver le premier jour de la semaine (0 = dimanche, 1 = lundi, etc.)
  const firstDayOfWeek = startDate.getDay();
  // Ajuster pour commencer la semaine le lundi
  const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  const data = [];

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

  // Ajouter des jours vides pour compléter la dernière semaine
  const totalCells = Math.ceil((startOffset + daysInYear) / 7) * 7;
  const remainingCells = totalCells - (startOffset + daysInYear);

  for (let i = 0; i < remainingCells; i++) {
    const nextDay = new Date(endDate);
    nextDay.setDate(endDate.getDate() + i + 1);
    data.push({ date: nextDay, opacity: 0, isCurrentMonth: false });
  }

  return data;
});
</script>
