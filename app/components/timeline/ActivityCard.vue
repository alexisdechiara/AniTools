<script setup lang="ts">
import type { AniListActivity } from "~~/shared/types/anilist"
import { getActivityText } from "~/utils/timeline"

const props = defineProps<{
	activity: AniListActivity
	layout?: "vertical" | "horizontal"
	side?: "left" | "right"
	showTimestamp?: boolean
}>()

const mediaTitle = computed(() => {
	if (props.activity.kind !== "anime") return null
	return props.activity.media?.title?.userPreferred
		?? props.activity.media?.title?.english
		?? props.activity.media?.title?.romaji
		?? "Untitled anime"
})
const mediaUrl = computed(() =>
	props.activity.kind === "anime" && props.activity.media
		? `https://anilist.co/anime/${props.activity.media.id}`
		: null
)
const cover = computed(() =>
	props.activity.kind === "anime"
		? props.activity.media?.coverImage?.large
			?? props.activity.media?.coverImage?.medium
		: null
)
const text = computed(() => getActivityText(props.activity))
const actorName = computed(() =>
	props.activity.kind === "message"
		? props.activity.messenger?.name ?? props.activity.user?.name ?? "AniList user"
		: props.activity.user?.name ?? "AniList user"
)
const timestamp = computed(() => new Date(props.activity.createdAt * 1_000))
const badge = computed(() => props.activity.kind === "anime"
	? "Anime update"
	: props.activity.kind === "text"
		? "Text post"
		: "Message"
)
const isHorizontal = computed(() => props.layout === "horizontal")
const imageOrderClass = computed(() =>
	!isHorizontal.value && props.side === "left" ? "sm:order-last" : ""
)
</script>

<template>
	<article
		class="flex h-full overflow-hidden rounded-xl border border-default bg-default shadow-sm"
		:class="isHorizontal ? 'flex-col' : 'min-h-44 flex-col sm:flex-row'">
		<NuxtLink
			v-if="activity.kind === 'anime' && mediaUrl"
			:to="mediaUrl"
			external
			target="_blank"
			rel="noopener noreferrer"
			class="relative shrink-0 overflow-hidden bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
			:class="[isHorizontal ? 'h-52 w-full' : 'h-48 w-full sm:h-auto sm:w-32', imageOrderClass]"
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

		<div class="flex min-w-0 flex-1 flex-col p-4">
			<div class="flex items-start justify-between gap-3">
				<UBadge :label="badge" color="neutral" variant="soft" size="sm"/>
				<time
					v-if="props.showTimestamp !== false"
					:datetime="timestamp.toISOString()"
					class="shrink-0 text-xs text-dimmed">
					{{ timestamp.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) }}
				</time>
			</div>

			<NuxtLink
				v-if="activity.kind === 'anime' && mediaUrl"
				:to="mediaUrl"
				external
				target="_blank"
				rel="noopener noreferrer"
				class="mt-3 line-clamp-2 font-semibold text-highlighted hover:text-primary focus-visible:outline-2 focus-visible:outline-primary">
				{{ mediaTitle }}
			</NuxtLink>
			<p v-else class="mt-3 font-semibold text-highlighted">
				{{ actorName }}
			</p>

			<p v-if="activity.kind === 'anime'" class="mt-1 text-sm text-toned">
				{{ activity.status || "updated" }}
				<span v-if="activity.progress"> · {{ activity.progress }}</span>
			</p>
			<p v-else class="mt-2 line-clamp-6 text-sm break-words whitespace-pre-wrap text-toned">
				{{ text }}
			</p>

			<p v-if="activity.replyCount" class="mt-auto pt-3 text-xs text-muted">
				{{ activity.replyCount }} {{ activity.replyCount === 1 ? "reply" : "replies" }}
			</p>
		</div>
	</article>
</template>
