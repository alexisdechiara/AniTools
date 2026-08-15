<script setup lang="ts">
import type { AniListMediaSummary } from "~~/shared/types/anilist"
import { getExploreRelationBadge, getExploreTitle } from "~/utils/explore"

type SwipeDirection = "left" | "right"

const props = withDefaults(defineProps<{
	media: AniListMediaSummary | null
	nextMedia?: AniListMediaSummary[]
	reason?: string
	disabled?: boolean
}>(), {
	nextMedia: () => [],
	reason: "Recommended for you",
	disabled: false
})

const emit = defineEmits<{
	decision: [payload: { direction: SwipeDirection, media: AniListMediaSummary }]
}>()

const cardEl = ref<HTMLElement | null>(null)
const dragging = ref(false)
const animating = ref(false)
const exitDirection = ref<SwipeDirection | null>(null)
const pointerId = ref<number | null>(null)
const drag = reactive({
	startX: 0,
	startY: 0,
	x: 0,
	y: 0
})
let decisionTimer: ReturnType<typeof setTimeout> | null = null

const title = computed(() => props.media ? getExploreTitle(props.media) : "")
const cover = computed(() => props.media?.coverImage?.extraLarge
	?? props.media?.coverImage?.large
	?? props.media?.coverImage?.medium
	?? null
)
const score = computed(() => props.media?.averageScore ?? props.media?.meanScore)
const themeColor = computed(() => props.media?.coverImage?.color
	?? "var(--ui-color-primary-400)"
)
const mediaTags = computed(() => {
	const tags = (props.media?.tags ?? [])
		.filter(tag => !tag.isAdult && !tag.isGeneralSpoiler && !tag.isMediaSpoiler)
		.toSorted((left, right) => (right.rank ?? 0) - (left.rank ?? 0))
		.slice(0, 5)
		.map(tag => tag.name)
	return tags.length ? tags : (props.media?.genres ?? []).slice(0, 5)
})
const aniListUrl = computed(() => props.media?.siteUrl
	?? (props.media ? `https://anilist.co/anime/${props.media.id}` : "")
)
const description = computed(() => (props.media?.description ?? "")
	.replace(/<br\s*\/?>/gi, " ")
	.replace(/<[^>]*>/g, "")
	.replace(/\s+/g, " ")
	.trim()
)
const relationBadge = computed(() => props.media
	? getExploreRelationBadge(props.media)
	: null
)
const progress = computed(() => Math.min(1, Math.abs(drag.x) / 120))
const leftOpacity = computed(() => exitDirection.value === "left"
	? 1
	: drag.x < 0 ? progress.value : 0
)
const rightOpacity = computed(() => exitDirection.value === "right"
	? 1
	: drag.x > 0 ? progress.value : 0
)
const cardStyle = computed(() => ({
	"--anime-theme-color": themeColor.value,
	transform: `translate3d(${drag.x}px, ${drag.y * 0.16}px, 0) rotate(${drag.x / 24}deg)`
}))

function mediaCover(media: AniListMediaSummary): string | null {
	return media.coverImage?.extraLarge
		?? media.coverImage?.large
		?? media.coverImage?.medium
		?? null
}

function resetDrag(): void {
	dragging.value = false
	pointerId.value = null
	drag.x = 0
	drag.y = 0
}

function onPointerDown(event: PointerEvent): void {
	if (props.disabled || animating.value || !props.media) return
	if (event.pointerType === "mouse" && event.button !== 0) return
	if ((event.target as Element).closest("button, a")) return

	dragging.value = true
	pointerId.value = event.pointerId
	drag.startX = event.clientX
	drag.startY = event.clientY
	cardEl.value?.setPointerCapture(event.pointerId)
}

function onPointerMove(event: PointerEvent): void {
	if (!dragging.value || event.pointerId !== pointerId.value) return
	drag.x = event.clientX - drag.startX
	drag.y = event.clientY - drag.startY
}

function onPointerEnd(event: PointerEvent): void {
	if (!dragging.value || event.pointerId !== pointerId.value) return
	if (cardEl.value?.hasPointerCapture(event.pointerId)) {
		cardEl.value.releasePointerCapture(event.pointerId)
	}

	const threshold = Math.min(140, Math.max(88, (cardEl.value?.clientWidth ?? 400) * 0.22))
	if (Math.abs(drag.x) >= threshold) {
		commitDecision(drag.x < 0 ? "left" : "right")
		return
	}

	resetDrag()
}

function commitDecision(direction: SwipeDirection): void {
	if (!props.media || animating.value || props.disabled) return
	const selectedMedia = props.media
	dragging.value = false
	exitDirection.value = direction
	animating.value = true

	decisionTimer = setTimeout(async () => {
		emit("decision", { direction, media: selectedMedia })
		await nextTick()
		resetDrag()
		exitDirection.value = null
		animating.value = false
		decisionTimer = null
	}, 360)
}

onBeforeUnmount(() => {
	if (decisionTimer) clearTimeout(decisionTimer)
})
</script>

<template>
	<div
		class="mx-auto flex w-full max-w-5xl flex-col items-center gap-5 outline-none"
		tabindex="0"
		aria-label="Anime discovery deck. Use left and right arrow keys to decide."
		@keydown.left.prevent="commitDecision('left')"
		@keydown.right.prevent="commitDecision('right')">
		<div class="relative h-[min(66svh,40rem)] min-h-120 w-full max-w-md lg:h-136 lg:max-w-4xl">
			<div
				v-for="(preview, index) in nextMedia.slice(0, 2).toReversed()"
				:key="preview.id"
				data-swipe-preview
				class="pointer-events-none absolute inset-x-4 top-0 bottom-2 overflow-hidden rounded-3xl border border-default bg-elevated shadow-lg"
				:style="{
					transform: `translateY(${(2 - index) * 10}px) scale(${0.94 + index * 0.025})`,
					opacity: String(0.38 + index * 0.22)
				}">
				<NuxtImg
					v-if="mediaCover(preview)"
					:src="mediaCover(preview)!"
					alt=""
					width="420"
					height="560"
					loading="eager"
					class="size-full object-cover opacity-30" />
			</div>

			<article
				v-if="media"
				:key="media.id"
				ref="cardEl"
				data-swipe-card
				:data-dragging="dragging"
				:data-exit="exitDirection"
				class="absolute inset-0 flex flex-col overflow-hidden rounded-3xl border border-default bg-default shadow-2xl select-none lg:grid lg:grid-cols-[minmax(18rem,42%)_1fr]"
				:style="cardStyle"
				@pointerdown="onPointerDown"
				@pointermove="onPointerMove"
				@pointerup="onPointerEnd"
				@pointercancel="onPointerEnd">
				<div class="relative min-h-0 flex-[1.35] overflow-hidden bg-muted lg:h-full">
					<div
						v-if="cover"
						class="relative block size-full overflow-hidden">
						<NuxtImg
							:src="cover"
							:alt="`${title} cover`"
							width="720"
							height="960"
							loading="eager"
							data-cover-image
							class="size-full object-cover"
							@dragstart.prevent />
					</div>
					<div v-else class="flex size-full items-center justify-center" aria-hidden="true">
						<UIcon name="i-lucide-image-off" class="size-12 text-muted" />
					</div>
					<div class="absolute inset-x-0 bottom-0 h-28 bg-linear-to-t from-black/75 to-transparent lg:hidden" />
					<div class="absolute top-4 left-4 flex gap-2">
						<UBadge
							v-if="score"
							:label="`${score}% match`"
							variant="subtle"
							data-theme-badge
							class="rounded-full text-white shadow-sm" />
						<UBadge
							v-if="media.status === 'RELEASING'"
							label="Airing"
							color="success"
							variant="subtle"
							class="rounded-full shadow-sm" />
					</div>
					<UTooltip v-if="relationBadge" :text="relationBadge.description">
						<UBadge
							:label="relationBadge.label"
							color="neutral"
							variant="solid"
							class="absolute top-4 right-4 rounded-full bg-black/65 text-white shadow-sm backdrop-blur" />
					</UTooltip>
				</div>

				<div class="flex min-h-0 flex-1 flex-col p-5 sm:p-6 lg:p-8">
					<p class="text-xs font-semibold tracking-wide text-(--anime-theme-color) uppercase">{{ reason }}</p>
					<h2 class="mt-2 line-clamp-2 text-2xl font-bold tracking-tight text-highlighted sm:text-3xl">
						{{ title }}
					</h2>
					<div class="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
						<span v-if="media.format">{{ media.format.replaceAll("_", " ") }}</span>
						<span v-if="media.seasonYear" aria-hidden="true">·</span>
						<span v-if="media.seasonYear">{{ media.season }} {{ media.seasonYear }}</span>
						<span v-if="media.episodes" aria-hidden="true">·</span>
						<span v-if="media.episodes">{{ media.episodes }} episodes</span>
					</div>
					<p v-if="description" class="mt-4 line-clamp-4 text-sm leading-relaxed text-toned lg:line-clamp-6">
						{{ description }}
					</p>
					<div class="mt-auto flex flex-wrap gap-2 pt-4">
						<UBadge
							v-for="item in mediaTags"
							:key="item"
							:label="item"
							variant="subtle"
							class="rounded-full bg-(--anime-theme-color)/10 text-(--anime-theme-color) ring-(--anime-theme-color)/25" />
					</div>
					<p class="mt-4 hidden items-center gap-2 text-xs text-dimmed lg:flex">
						<UIcon name="i-lucide-mouse-pointer-2" class="size-4" />
						Drag the card or use the arrow keys
					</p>
				</div>

				<div
					class="pointer-events-none absolute top-8 left-6 -rotate-12 rounded-xl border-4 border-error px-4 py-2 text-2xl font-black tracking-widest text-error uppercase"
					:style="{ opacity: leftOpacity }">
					Pass
				</div>
				<div
					class="pointer-events-none absolute top-8 right-6 rotate-12 rounded-xl border-4 border-success px-4 py-2 text-2xl font-black tracking-widest text-success uppercase"
					:style="{ opacity: rightOpacity }">
					Interested
				</div>
			</article>
		</div>

		<div v-if="media" class="flex w-full flex-wrap items-center justify-center gap-3">
			<UButton
				icon="i-lucide-x"
				label="Pass"
				color="error"
				variant="soft"
				size="xl"
				class="min-w-40 justify-center rounded-full px-6 py-3 text-base"
				:disabled="disabled || animating"
				@click="commitDecision('left')" />
			<UButton
				:to="aniListUrl"
				external
				target="_blank"
				rel="noopener noreferrer"
				icon="i-lucide-info"
				label="Details"
				color="neutral"
				variant="outline"
				size="xl"
				class="min-w-40 justify-center rounded-full px-6 py-3 text-base" />
			<UButton
				icon="i-lucide-heart"
				label="Interested"
				color="success"
				variant="soft"
				size="xl"
				class="min-w-40 justify-center rounded-full px-6 py-3 text-base"
				:disabled="disabled || animating"
				@click="commitDecision('right')" />
		</div>
		<p v-if="media" class="text-center text-xs text-dimmed lg:hidden">
			Swipe left to pass · swipe right if you are interested
		</p>
	</div>
</template>

<style scoped>
[data-swipe-card] {
	touch-action: none;
	cursor: grab;
	border-color: color-mix(in srgb, var(--anime-theme-color) 42%, var(--ui-border));
	box-shadow: 0 24px 64px color-mix(in srgb, var(--anime-theme-color) 20%, transparent);
	will-change: transform, opacity;
	transition: transform 320ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 260ms ease;
}

[data-cover-image] {
	transition: transform 300ms ease;
}

[data-swipe-card]:hover [data-cover-image],
[data-swipe-card]:focus-within [data-cover-image] {
	transform: scale(1.025);
}

[data-theme-badge] {
	background: color-mix(in srgb, var(--anime-theme-color) 82%, transparent);
	box-shadow:
		0 0 0 1px var(--anime-theme-color),
		0 2px 6px color-mix(in srgb, black 18%, transparent);
}

[data-swipe-card][data-dragging="true"] {
	cursor: grabbing;
	transition: none;
}

[data-swipe-card][data-exit="left"] {
	animation: swipe-out-left 360ms cubic-bezier(0.32, 0, 0.67, 0) forwards;
}

[data-swipe-card][data-exit="right"] {
	animation: swipe-out-right 360ms cubic-bezier(0.32, 0, 0.67, 0) forwards;
}

[data-swipe-preview] {
	transition: transform 360ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 360ms ease;
}

@keyframes swipe-out-left {
	to {
		transform: translate3d(-125%, 4%, 0) rotate(-22deg);
		opacity: 0;
	}
}

@keyframes swipe-out-right {
	to {
		transform: translate3d(125%, 4%, 0) rotate(22deg);
		opacity: 0;
	}
}

@media (prefers-reduced-motion: reduce) {
	[data-swipe-card],
	[data-swipe-preview] {
		transition-duration: 1ms;
	}

	[data-swipe-card][data-exit] {
		animation-duration: 1ms;
	}
}
</style>
