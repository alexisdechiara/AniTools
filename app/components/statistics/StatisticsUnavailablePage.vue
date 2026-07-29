<script setup lang="ts">
defineProps<{
	pageId: string
	title: string
	description: string
	requiredData: string
}>()
</script>

<template>
	<StatisticsPageShell
		:page-id="pageId"
		:title="title"
		:description="description"
		:load-data="false">
		<UPageCard
			icon="i-lucide-database-zap"
			title="This data is not available yet"
			:description="requiredData"
			variant="subtle">
			<template #footer>
				<p class="text-sm text-muted">
					AniTools does not estimate or fabricate this ranking from unrelated list data.
					The view is ready for a dedicated, allowlisted AniList server query.
				</p>
			</template>
		</UPageCard>
	</StatisticsPageShell>
</template>
