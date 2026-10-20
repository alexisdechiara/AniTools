<script setup lang="ts">
import { ANILIST_SCORE_FORMATS } from "~~/shared/types/anilist"
import { SCORE_FORMAT_DESCRIPTIONS, SCORE_FORMAT_LABELS } from "~/utils/score-format"

const preferences = usePreferencesStore()
const userStore = useUserStore()
const { scoreFormat } = storeToRefs(preferences)
const { isAuthenticated, mediaListOptions } = storeToRefs(userStore)

/** Shared list runs from the coarsest scale up; settings read better from the most precise down. */
const items = [...ANILIST_SCORE_FORMATS].reverse().map(format => ({
	label: SCORE_FORMAT_LABELS[format],
	description: SCORE_FORMAT_DESCRIPTIONS[format],
	value: format
}))

const sourceFormat = computed(() => mediaListOptions.value.scoreFormat ?? null)

/** Explains the conversion only when the profile actually stores scores in another scale. */
const conversionNote = computed(() => {
	if (!isAuthenticated.value || !sourceFormat.value || sourceFormat.value === scoreFormat.value) {
		return null
	}

	return `Your AniList profile records scores as ${SCORE_FORMAT_LABELS[sourceFormat.value].toLowerCase()}. AniTools converts them for display here.`
})
</script>

<template>
	<UPageCard
		title="Score display"
		description="How scores read across AniTools. Your AniList account keeps its own format."
		:ui="{ container: 'gap-y-4' }">
		<div class="flex flex-col gap-3">
			<URadioGroup
				v-model="scoreFormat"
				:items="items"
				variant="card"
				aria-label="Score format"
				:ui="{ fieldset: 'grid gap-2 sm:grid-cols-2' }" />

			<p v-if="conversionNote" class="flex items-start gap-2 text-xs text-muted">
				<UIcon name="i-lucide-info" class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
				{{ conversionNote }}
			</p>
		</div>
	</UPageCard>
</template>
