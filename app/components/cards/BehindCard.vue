<script setup lang="ts">
import { selectBehindEntries, type BehindEntry } from "~/utils/dashboard-behind"
import { getMediaCover } from "~/utils/media-display"

const MAX_ROWS = 5

const entriesStore = useEntriesStore()
const { entries, error, loading, truncated } = storeToRefs(entriesStore)

const behindEntries = computed(() => selectBehindEntries(entries.value, MAX_ROWS))

const { title: getAnimeTitle } = useMediaTitle()

function getTitle(item: BehindEntry): string {
	return getAnimeTitle(item.entry.media)
}

function getCover(item: BehindEntry): string | null {
	return getMediaCover(item.entry.media, "small")
}

function getProgressLine(item: BehindEntry): string {
	// `behind` is `aired - watched` with a non-negative watched count: see selectBehindEntries.
	const aired = (item.entry.media?.nextAiringEpisode?.episode ?? 1) - 1
	return `Watched ${aired - item.behind} · aired ${aired}`
}

async function retry() {
	// The store keeps the failure in `error`: the rejection itself needs no second report.
	await entriesStore.fetchAllAnimes(true).catch(() => undefined)
}
</script>

<template>
	<MetricsCard title="Behind">
		<div class="flex size-full flex-col justify-start gap-3">
			<div
				v-if="error"
				class="flex min-h-40 flex-1 flex-col items-center justify-center gap-3 text-center"
				role="alert">
				<UIcon
					name="i-lucide-triangle-alert"
					class="size-7 text-error"/>
				<p class="text-sm font-medium text-highlighted">
					Your list could not be loaded
				</p>
				<UButton
					label="Try again"
					icon="i-lucide-rotate-cw"
					color="primary"
					variant="soft"
					:loading="loading"
					@click="retry"/>
			</div>
			<template v-else>
				<ul
					v-if="behindEntries.length"
					class="space-y-3">
					<li
						v-for="item in behindEntries"
						:key="item.entry.id"
						class="flex min-w-0 items-center gap-3">
						<NuxtImg
							v-if="getCover(item)"
							:src="getCover(item) ?? undefined"
							:alt="`${getTitle(item)} cover`"
							class="size-11 shrink-0 rounded-md object-cover"
							width="44"
							height="44"/>
						<div
							v-else
							class="flex size-11 shrink-0 items-center justify-center rounded-md bg-elevated"
							aria-hidden="true">
							<UIcon
								name="i-lucide-image-off"
								class="size-5 text-muted"/>
						</div>
						<div class="min-w-0 flex-1">
							<p class="truncate text-sm font-medium text-highlighted" :title="getTitle(item)">
								{{ getTitle(item) }}
							</p>
							<p class="flex items-center gap-1.5 text-xs text-muted">
								<UBadge
									v-if="item.entry.status === 'PAUSED'"
									label="Paused"
									color="neutral"
									variant="soft"
									size="sm"/>
								<span class="truncate">{{ getProgressLine(item) }}</span>
							</p>
						</div>
						<UBadge
							:label="`${item.behind} behind`"
							color="primary"
							variant="soft"
							size="md"
							class="shrink-0"/>
					</li>
				</ul>
				<div
					v-else
					class="flex min-h-40 flex-1 flex-col items-center justify-center gap-2 text-center">
					<UIcon
						name="i-lucide-circle-check"
						class="size-7 text-muted"/>
					<p class="text-sm text-muted">
						You are all caught up.
					</p>
				</div>
				<p
					v-if="truncated"
					class="mt-auto flex items-start gap-2 rounded-md bg-warning/10 px-2.5 py-2 text-xs text-toned">
					<UIcon
						name="i-lucide-triangle-alert"
						class="mt-px size-4 shrink-0 text-warning"/>
					<span>Your list was only partly loaded, so some titles may be missing here.</span>
				</p>
			</template>
		</div>
	</MetricsCard>
</template>
