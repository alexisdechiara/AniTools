<template>
  <UDashboardPanel id="statistics">
    <template #body>
      <div class="grid grid-cols-4 gap-4">
        <WatchTimeCard />
        <AnimesWatchedCard />
        <EpisodesWatchedCard />
        <StatusDonutCard title="Status" class="row-span-3" />
        <MeanScoreBarCard class="col-span-3 row-span-2" />
        <GenresCard class="col-span-1 row-span-2" />
        <TagsCard class="col-span-1 row-span-2" />
        <HighlightCard class="col-span-2 row-span-2" />
      </div>
    </template>
  </UDashboardPanel>
</template>
