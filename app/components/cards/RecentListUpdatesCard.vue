<script setup lang="ts">
import type { RecentListUpdate } from "~/types/dashboard"

withDefaults(defineProps<{
	items?: readonly RecentListUpdate[]
	limit?: number
}>(), {
	items: () => [],
	limit: 5
})

const relativeTime = new Intl.RelativeTimeFormat("en", { numeric: "auto" })
const renderedAt = useState(
	"recent-list-updates-rendered-at",
	() => Math.floor(Date.now() / 1000)
)

function formatRelativeDate(timestamp: number): string {
	const seconds = timestamp - renderedAt.value
	const absoluteSeconds = Math.abs(seconds)

	if (absoluteSeconds < 60) return relativeTime.format(seconds, "second")
	if (absoluteSeconds < 3_600) {
		return relativeTime.format(Math.round(seconds / 60), "minute")
	}
	if (absoluteSeconds < 86_400) {
		return relativeTime.format(Math.round(seconds / 3_600), "hour")
	}

	return relativeTime.format(Math.round(seconds / 86_400), "day")
}

function formatStatus(status: string): string {
	if (status === "CURRENT") return "Watching"
	if (status === "REPEATING") return "Rewatching"

	return status.charAt(0) + status.slice(1).toLowerCase()
}
</script>

<template>
	<MetricsCard title="Recent list updates">
		<ol
			v-if="items.length"
			class="relative space-y-3 before:absolute before:inset-y-2 before:left-5 before:w-px before:bg-border">
			<li
				v-for="item in items.slice(0, limit)"
				:key="item.id"
				class="relative flex min-w-0 items-center gap-3">
				<NuxtImg
					v-if="item.coverImage"
					:src="item.coverImage"
					:alt="`${item.title} cover`"
					class="z-1 size-10 shrink-0 rounded-full border-2 border-default object-cover"
					width="40"
					height="40"/>
				<div
					v-else
					class="z-1 flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-default bg-elevated"
					aria-hidden="true">
					<UIcon
						name="i-lucide-list-checks"
						class="size-4 text-muted"/>
				</div>
				<div class="min-w-0 flex-1">
					<p class="truncate text-sm font-medium text-highlighted">
						{{ item.title }}
					</p>
					<p class="text-xs text-muted">
						{{ formatStatus(item.status) }}
						<span aria-hidden="true"> · </span>
						<time :datetime="new Date(item.updatedAt * 1000).toISOString()">
							{{ formatRelativeDate(item.updatedAt) }}
						</time>
					</p>
				</div>
			</li>
		</ol>
		<div
			v-else
			class="flex min-h-40 flex-col items-center justify-center gap-2 text-center">
			<UIcon
				name="i-lucide-history"
				class="size-7 text-muted"/>
			<p class="text-sm text-muted">
				No recent list updates are available.
			</p>
		</div>
	</MetricsCard>
</template>
