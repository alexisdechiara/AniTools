<script setup lang="ts">
import type { AniListActivity } from "~~/shared/types/anilist"
import { getMediaCover } from "~/utils/media-display"
import { getActivityText } from "~/utils/timeline"
import {
	formatRunSpan,
	formatRunUpdateTime,
	pluraliseEpisodeStatus,
	runSpansSeveralDays
} from "~/utils/timeline-run-format"
import type { TimelineEpisodeRun } from "~/utils/timeline-runs"

const props = withDefaults(defineProps<{
	activity: AniListActivity
	/** Consecutive episode updates folded into this card; one update renders as a plain card. */
	run?: TimelineEpisodeRun
	layout?: "vertical" | "horizontal"
	side?: "left" | "right"
	showTimestamp?: boolean
	compact?: boolean
}>(), {
	run: undefined,
	layout: "vertical",
	side: "right",
	// Without this default Vue casts an absent boolean prop to false and hides the time.
	showTimestamp: true
})

const { title: getAnimeTitle } = useMediaTitle()
const { activeDisplay, formatDateTime: formatLocalDateTime } = useTimeDisplay()

const mediaTitle = computed(() => {
	if (props.activity.kind !== "anime") return null
	return getAnimeTitle(props.activity.media)
})
const mediaUrl = computed(() =>
	props.activity.kind === "anime" && props.activity.media
		? `https://anilist.co/anime/${props.activity.media.id}`
		: null
)
const cover = computed(() =>
	props.activity.kind === "anime"
		? getMediaCover(props.activity.media, "medium")
		: null
)
const text = computed(() => getActivityText(props.activity))
const actorName = computed(() =>
	props.activity.kind === "message"
		? props.activity.messenger?.name ?? props.activity.user?.name ?? "AniList user"
		: props.activity.user?.name ?? "AniList user"
)
const timestamp = computed(() => new Date(props.activity.createdAt * 1_000))
const mergedRun = computed(() =>
	props.run && props.run.activities.length > 1 ? props.run : null
)
const badge = computed(() => mergedRun.value
	? `${mergedRun.value.activities.length} anime updates`
	: props.activity.kind === "anime"
		? "Anime update"
		: props.activity.kind === "text"
			? "Text post"
			: "Message"
)
const runStartedAt = computed(() =>
	mergedRun.value ? new Date(mergedRun.value.startedAt * 1_000) : null
)
const runSpan = computed(() => mergedRun.value
	? formatRunSpan(mergedRun.value.startedAt, mergedRun.value.endedAt, {
		compact: props.compact,
		display: activeDisplay.value
	})
	: ""
)
const runStatus = computed(() =>
	mergedRun.value ? pluraliseEpisodeStatus(mergedRun.value.activity.status) : ""
)
const runUpdates = computed(() => {
	const run = mergedRun.value
	if (!run) return []

	const display = activeDisplay.value
	const severalDays = runSpansSeveralDays(run.startedAt, run.endedAt, undefined, display)
	return run.activities.map(update => ({
		id: update.id,
		label: update.progress
			? `${update.status || "updated"} · ${update.progress}`
			: update.status || "updated",
		datetime: new Date(update.createdAt * 1_000).toISOString(),
		time: formatRunUpdateTime(update.createdAt, severalDays, undefined, display)
	}))
})
const expanded = ref(false)
const updatesListId = useId()
const isHorizontal = computed(() => props.layout === "horizontal")
const imageOrderClass = computed(() =>
	!isHorizontal.value && props.side === "left" ? "sm:order-last" : ""
)
</script>

<template>
	<article
		class="flex h-full overflow-hidden rounded-xl border border-default bg-default shadow-sm"
		:class="isHorizontal ? 'flex-col' : compact ? 'min-h-28 flex-col sm:flex-row' : 'min-h-44 flex-col sm:flex-row'">
		<NuxtLink
			v-if="activity.kind === 'anime' && mediaUrl"
			:to="mediaUrl"
			external
			target="_blank"
			rel="noopener noreferrer"
			class="relative shrink-0 overflow-hidden bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
			:class="[
				isHorizontal ? 'h-52 w-full' : compact ? 'h-28 w-full sm:h-auto sm:w-20' : 'h-48 w-full sm:h-auto sm:w-32',
				imageOrderClass
			]"
			:aria-label="`Open ${mediaTitle} on AniList`">
			<template v-if="cover">
				<NuxtImg
					:src="cover"
					alt=""
					class="absolute inset-0 size-full scale-110 object-cover opacity-35 blur-xl"
					aria-hidden="true"/>
				<NuxtImg
					:src="cover"
					:alt="`${mediaTitle} cover`"
					sizes="sm:128px 320px"
					loading="lazy"
					decoding="async"
					class="relative mx-auto h-full w-auto max-w-full object-cover"/>
			</template>
			<span v-else class="flex size-full items-center justify-center" aria-hidden="true">
				<UIcon name="i-lucide-image-off" class="size-6 text-muted"/>
			</span>
		</NuxtLink>

		<div class="flex min-w-0 flex-1 flex-col" :class="compact ? 'p-3' : 'p-4'">
			<div class="flex items-start justify-between gap-3">
				<UBadge v-if="!compact" :label="badge" color="neutral" variant="soft" size="sm"/>
				<time
					v-if="mergedRun && runStartedAt && showTimestamp"
					:datetime="runStartedAt.toISOString()"
					class="text-right text-xs text-dimmed"
					:class="compact ? 'ml-auto' : ''"
					data-timeline-run-span>
					{{ runSpan }}
				</time>
				<time
					v-else-if="showTimestamp"
					:datetime="timestamp.toISOString()"
					class="shrink-0 text-xs text-dimmed"
					:class="compact ? 'ml-auto' : ''">
					{{ formatLocalDateTime(timestamp, compact ? { timeStyle: "short" } : { dateStyle: "medium", timeStyle: "short" }) }}
				</time>
			</div>

			<NuxtLink
				v-if="activity.kind === 'anime' && mediaUrl"
				:to="mediaUrl"
				external
				target="_blank"
				rel="noopener noreferrer"
				class="line-clamp-2 font-semibold text-highlighted hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
				:class="compact ? 'mt-1.5 text-sm' : 'mt-3'">
				{{ mediaTitle }}
			</NuxtLink>
			<p v-else class="font-semibold text-highlighted" :class="compact ? 'mt-1.5 text-sm' : 'mt-3'">
				{{ actorName }}
			</p>

			<template v-if="mergedRun">
				<p
					class="mt-1 text-toned"
					:class="compact ? 'text-xs' : 'text-sm'"
					data-timeline-run-range>
					{{ runStatus }}
					<strong class="font-semibold text-highlighted">{{ mergedRun.firstEpisode }} → {{ mergedRun.lastEpisode }}</strong>
				</p>
				<div class="mt-auto pt-3">
					<UButton
						:label="`${expanded ? 'Hide' : 'Show'} ${mergedRun.activities.length} updates`"
						:icon="expanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
						color="neutral"
						variant="soft"
						size="xs"
						class="cursor-pointer"
						:aria-expanded="expanded"
						:aria-controls="updatesListId"
						data-timeline-run-toggle
						@click="expanded = !expanded" />
					<ol
						v-show="expanded"
						:id="updatesListId"
						class="mt-3 divide-y divide-default border-t border-default"
						:aria-label="`${mergedRun.activities.length} updates, newest first`">
						<li
							v-for="update in runUpdates"
							:key="update.id"
							class="flex justify-between gap-3 py-2 text-xs last:pb-0">
							<span class="min-w-0 wrap-break-word text-toned">{{ update.label }}</span>
							<time :datetime="update.datetime" class="shrink-0 text-dimmed">{{ update.time }}</time>
						</li>
					</ol>
				</div>
			</template>
			<p v-else-if="activity.kind === 'anime'" class="mt-1 text-toned" :class="compact ? 'text-xs' : 'text-sm'">
				{{ activity.status || "updated" }}
				<span v-if="activity.progress"> · {{ activity.progress }}</span>
			</p>
			<p
				v-else
				class="mt-2 break-words whitespace-pre-wrap text-toned"
				:class="compact ? 'line-clamp-2 text-xs' : 'line-clamp-6 text-sm'">
				{{ text }}
			</p>

			<p v-if="activity.replyCount && !compact" class="mt-auto pt-3 text-xs text-muted">
				{{ activity.replyCount }} {{ activity.replyCount === 1 ? "reply" : "replies" }}
			</p>
		</div>
	</article>
</template>
