<template>
  <MetricsCard title="Formats" v-bind="$attrs" enable-sort-select v-model:sort="formatsSort">
    <DonutChart
      :data="chartData"
      :max-items="maxItems"
      :show-legend="showLegend"
      :show-tooltip="showTooltip"
      :orientation="orientation"
      :width="width"
      :height="height"
      :metric-type="formatsSort"
    />
  </MetricsCard>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { MediaFormat } from "#gql/default";

const { formats: formatsRef, formatsSort } = storeToRefs(useStatisticsStore());

export interface DonutFormat {
  color: string;
  name: string;
  value: number;
  count: number;
  [key: string]: any;
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
  [MediaFormat.TV]: "var(--color-completed)",
  [MediaFormat.MOVIE]: "var(--color-planning)",
  [MediaFormat.ONA]: "var(--color-dropped)",
  [MediaFormat.OVA]: "var(--color-pink-300)",
  [MediaFormat.TV_SHORT]: "var(--color-watching)",
  [MediaFormat.SPECIAL]: "var(--color-paused)",
};

// Custom display names for formats
const formatDisplayNames: Record<string, string> = {
  [MediaFormat.TV]: "TV",
  [MediaFormat.TV_SHORT]: "TV Short",
  [MediaFormat.MOVIE]: "Movie",
  [MediaFormat.SPECIAL]: "Special",
  [MediaFormat.OVA]: "OVA",
  [MediaFormat.ONA]: "ONA",
};

// Transforme les données pour le composant DonutChart
const chartData = computed<DonutFormat[]>(() => {
  const formats = formatsRef.value || [];

  // Filtre les formats non pertinents ou sans données
  const relevantFormats = formats.filter((format) => {
    if (!format?.format) return false;

    const excludedFormats = [
      MediaFormat.MANGA,
      MediaFormat.NOVEL,
      MediaFormat.ONE_SHOT,
      MediaFormat.MUSIC,
    ];

    return !excludedFormats.includes(format.format);
  });

  const accessor = (f: any) => {
    if (formatsSort.value === "meanScore") return f?.meanScore ?? 0;
    if (formatsSort.value === "minutesWatched") return f?.minutesWatched ?? 0;
    return f?.count ?? 0;
  };

  const mapped = relevantFormats
    .filter((format): format is NonNullable<typeof format> => format?.format != null)
    .map((format) => {
      const metric = accessor(format);

      // Format du nom pour l'affichage
      const formatName = format.format
        ? formatDisplayNames[format.format as keyof typeof formatDisplayNames] ||
          format.format
            .toString()
            .toLowerCase()
            .split("_")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ")
        : "Unknown";

      return {
        color:
          formatColors[format.format as keyof typeof formatColors] ||
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
