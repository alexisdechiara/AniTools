<template>
  <MetricsCard v-bind="$attrs" v-model:sort="formatsSort" title="Formats" enable-sort-select>
    <DonutChart
      :data="chartData"
      :max-items="maxItems"
      :show-legend="showLegend"
      :show-tooltip="showTooltip"
      :orientation="orientation"
      :width="width"
      :height="height"
      :metric-type="formatsSort"/>
  </MetricsCard>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import { storeToRefs } from "pinia";
const { formats: formatsRef, formatsSort } = storeToRefs(useStatisticsStore());

export interface DonutFormat {
  color: string;
  name: string;
  value: number;
  count: number;
  meanScore?: number;
  minutesWatched?: number;
}

withDefaults(
  defineProps<{
    maxItems?: number;
    showLegend?: boolean;
    showTooltip?: boolean;
    orientation?: "horizontal" | "vertical";
    width?: string;
    height?: string;
  }>(),
  {
    maxItems: 6,
    showLegend: true,
    showTooltip: false,
    orientation: "vertical",
    width: "100%",
    height: "200px",
  }
);

// Mapping of AniList anime formats with their colors
// Source: https://anilist.github.io/ApiV2-GraphQL-Docs/medialiststatus.doc.html
const formatColors: Record<string, string> = {
  // Main formats
  TV: "var(--color-completed)",
  MOVIE: "var(--color-planning)",
  ONA: "var(--color-dropped)",
  OVA: "var(--color-pink-300)",
  TV_SHORT: "var(--color-watching)",
  SPECIAL: "var(--color-paused)",
};

// Custom display names for formats
const formatDisplayNames: Record<string, string> = {
  TV: "TV",
  TV_SHORT: "TV Short",
  MOVIE: "Movie",
  SPECIAL: "Special",
  OVA: "OVA",
  ONA: "ONA",
};

const excludedFormats = new Set(["MANGA", "NOVEL", "ONE_SHOT", "MUSIC"]);

type FormatStatistic = NonNullable<typeof formatsRef.value>[number];

function getMetric(format: FormatStatistic): number {
  if (formatsSort.value === "meanScore") return format.meanScore ?? 0;
  if (formatsSort.value === "minutesWatched") return format.minutesWatched ?? 0;
  return format.count ?? 0;
}

// Transforme les données pour le composant DonutChart
const chartData = computed<DonutFormat[]>(() => {
  const formats = formatsRef.value || [];

  // Filtre les formats non pertinents ou sans données
  const relevantFormats = formats.filter((format) => {
    if (!format?.format) return false;

    return !excludedFormats.has(format.format);
  });

  const mapped = relevantFormats
    .filter((format): format is NonNullable<typeof format> => format?.format != null)
    .map((format) => {
      const metric = getMetric(format);
      const formatKey = format.format ?? "UNKNOWN";

      // Format du nom pour l'affichage
      const formatName = formatKey !== "UNKNOWN"
        ? formatDisplayNames[formatKey] ||
          formatKey
            .toString()
            .toLowerCase()
            .split("_")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ")
        : "Unknown";

      return {
        color:
          formatColors[formatKey] ||
          "var(--color-text-muted)",
        name: formatName,
        value: metric,
        count: format?.count ?? 0,
        meanScore: format?.meanScore,
        minutesWatched: format?.minutesWatched,
      } as DonutFormat;
    });

  if (formatsSort.value === "count") return mapped.sort((a, b) => (b.count ?? 0) - (a.count ?? 0));
  if (formatsSort.value === "meanScore") return mapped.sort((a, b) => (b.meanScore ?? 0) - (a.meanScore ?? 0));
  return mapped.sort((a, b) => (b.minutesWatched ?? 0) - (a.minutesWatched ?? 0));
});
</script>
