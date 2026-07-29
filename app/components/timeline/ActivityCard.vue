<script setup lang="ts">
import type { AniListActivity } from "~~/shared/types/anilist"
import { getActivityText } from "~/utils/timeline"

const props = defineProps<{
	activity: AniListActivity
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
		? props.activity.media?.coverImage?.medium
			?? props.activity.media?.coverImage?.large
		: null
)
const text = computed(() => getActivityText(props.activity))
const actorName = computed(() =>
	props.activity.kind === "message"
		? props.activity.messenger?.name ?? props.activity.user?.name ?? "AniList user"
		: props.activity.user?.name ?? "AniList user"
)
const timestamp = computed(() => new Date(props.activity.createdAt * 1_000))
</script>

<template>
	<article class="flex gap-3 rounded-xl border border-default bg-elevated p-3 sm:gap-4 sm:p-4">
		<NuxtLink
			v-if="activity.kind === 'anime' && mediaUrl"
			:to="mediaUrl"
			external
			target="_blank"
			rel="noopener noreferrer"
			class="h-24 w-16 shrink-0 overflow-hidden rounded-md bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
			:aria-label="`Open ${mediaTitle} on AniList`">
			<NuxtImg
				v-if="cover"
				:src="cover"
				:alt="`${mediaTitle} cover`"
				width="128"
				height="192"
				loading="lazy"
				class="size-full object-cover"/>
			<span v-else class="flex size-full items-center justify-center" aria-hidden="true">
				<UIcon name="i-lucide-image-off" class="size-5 text-muted" />
			</span>
		</NuxtLink>
		<div
			v-else
			class="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
			aria-hidden="true">
			<UIcon
				:name="activity.kind === 'text' ? 'i-lucide-message-square-text' : 'i-lucide-mail'"
				class="size-5"/>
		</div>

		<div class="min-w-0 flex-1">
			<div class="flex flex-wrap items-start justify-between gap-2">
				<div>
					<p v-if="activity.kind === 'anime'" class="text-sm text-muted">
						{{ activity.status || "updated" }}
						<span v-if="activity.progress"> · {{ activity.progress }}</span>
					</p>
					<h3
						v-if="activity.kind === 'anime'"
						class="font-medium text-highlighted">
						{{ mediaTitle }}
					</h3>
					<p v-else class="text-sm font-medium text-highlighted">
						{{ actorName }}
					</p>
				</div>
				<time
					:datetime="timestamp.toISOString()"
					class="shrink-0 text-xs text-muted">
					{{ timestamp.toLocaleString(undefined, {
						dateStyle: "medium",
						timeStyle: "short"
					}) }}
				</time>
			</div>
			<p
				v-if="activity.kind !== 'anime'"
				class="mt-2 line-clamp-5 text-sm break-words whitespace-pre-wrap text-toned">
				{{ text }}
			</p>
			<p v-if="activity.replyCount" class="mt-2 text-xs text-muted">
				{{ activity.replyCount }} {{ activity.replyCount === 1 ? "reply" : "replies" }}
			</p>
		</div>
	</article>
</template>
