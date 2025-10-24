<script setup lang="ts">
const year = useRoute().params.year as string;
const yearNumber = parseInt(year, 10);
</script>

<template>
  <UContainer class="overflow-auto">
    <UPageHero
      title="Anime Rewind"
      description="@alexisdechiara"
      :headline="year"
      :ui="{ container: 'py-12 sm:py-16 lg:py-24' }"
    />
    <div class="grid grid-cols-4 gap-4">
      <MetricsCard title="Watch time" value="1d 23h 18m" :change="11.01" />
      <MetricsCard title="Animes watched" value="42" :change="-7.98" />
      <MetricsCard title="Episodes watched" value="438" :change="17.96" />
      <StatusDonutCard title="Status" class="row-span-3" />
      <MeanScoreBarCard class="col-span-3 row-span-2" />
    </div>
    <div class="grid grid-cols-4 gap-4 my-8">
      <ListCard class="col-span-1 row-span-2" title="Genres" />
      <ListCard class="col-span-1 row-span-2" title="Genres" />
      <HighlightCard class="col-span-2 row-span-2" />
      <ActivityOverviewCard :year="yearNumber" class="col-span-full" />
    </div>
  </UContainer>
</template>
