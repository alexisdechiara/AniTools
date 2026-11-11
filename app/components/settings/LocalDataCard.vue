<script setup lang="ts">
const preferences = usePreferencesStore()
const explorePicks = useExplorePicksStore()
const { reset: resetDashboardLayout } = useDashboardCards()
const toast = useToast()

interface StoredItem {
	icon: string
	label: string
	detail: string
}

const storedItems: StoredItem[] = [
	{
		icon: "i-lucide-sliders-horizontal",
		label: "Display preferences",
		detail: "Your score display format."
	},
	{
		icon: "i-lucide-user-round",
		label: "Last AniList profile",
		detail: "So your pages reopen where you left off."
	},
	{
		icon: "i-lucide-layout-dashboard",
		label: "Dashboard layout",
		detail: "Which cards you keep, and in which order."
	},
	{
		icon: "i-lucide-rows-3",
		label: "Tier lists",
		detail: "Tiers, layout and the anime you placed. Edit them from Tierlist."
	},
	{
		icon: "i-lucide-heart",
		label: "Explore picks",
		detail: "Interested and passed titles, kept per profile. Up to 100 picks and 1 000 passes."
	}
]

const layoutResetOpen = ref(false)
const preferencesResetOpen = ref(false)
const picksResetOpen = ref(false)

function resetPreferences() {
	preferences.reset()
	preferencesResetOpen.value = false
	toast.add({
		title: "Preferences reset",
		description: "Score display is back to Percentage.",
		icon: "i-lucide-rotate-ccw"
	})
}

function resetLayout() {
	resetDashboardLayout()
	layoutResetOpen.value = false
	toast.add({
		title: "Dashboard layout reset",
		description: "The default cards are back, in their original order.",
		icon: "i-lucide-layout-dashboard"
	})
}

function resetExplorePicks() {
	explorePicks.clearAll()
	picksResetOpen.value = false
	toast.add({
		title: "Explore picks cleared",
		description: "Interested and passed titles are forgotten for every profile on this device.",
		icon: "i-lucide-heart"
	})
}
</script>

<template>
	<UPageCard
		title="Data on this device"
		description="AniTools has no accounts and stores nothing on a server. These items live in this browser only, and clearing your browser data removes them."
		:ui="{ container: 'gap-y-4' }">
		<div class="flex flex-col gap-4">
			<ul class="divide-y divide-default overflow-hidden rounded-lg border border-default">
				<li v-for="item in storedItems" :key="item.label" class="flex items-start gap-3 p-3">
					<UIcon :name="item.icon" class="mt-0.5 size-4 shrink-0 text-dimmed" aria-hidden="true" />
					<div class="min-w-0">
						<p class="text-sm font-medium text-highlighted">
							{{ item.label }}
						</p>
						<p class="text-xs text-muted">
							{{ item.detail }}
						</p>
					</div>
				</li>
			</ul>

			<div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
				<UButton
					label="Reset display preferences"
					icon="i-lucide-rotate-ccw"
					color="neutral"
					variant="soft"
					class="rounded-full"
					@click="preferencesResetOpen = true" />
				<UButton
					label="Reset dashboard layout"
					icon="i-lucide-layout-dashboard"
					color="neutral"
					variant="soft"
					class="rounded-full"
					@click="layoutResetOpen = true" />
				<UButton
					label="Clear Explore picks"
					icon="i-lucide-heart"
					color="neutral"
					variant="soft"
					class="rounded-full"
					@click="picksResetOpen = true" />
			</div>
		</div>

		<UModal
			v-model:open="preferencesResetOpen"
			title="Reset display preferences?"
			description="Your score display format goes back to the AniTools default, and this can't be undone.">
			<template #footer>
				<UButton
					label="Keep my preferences"
					color="neutral"
					variant="outline"
					class="ms-auto rounded-full"
					@click="preferencesResetOpen = false" />
				<UButton label="Reset preferences" color="error" class="rounded-full" @click="resetPreferences" />
			</template>
		</UModal>

		<UModal
			v-model:open="layoutResetOpen"
			title="Reset dashboard layout?"
			description="Your card selection and order go back to the AniTools default. Cards you removed come back, and this can't be undone.">
			<template #footer>
				<UButton
					label="Keep my layout"
					color="neutral"
					variant="outline"
					class="ms-auto rounded-full"
					@click="layoutResetOpen = false" />
				<UButton label="Reset layout" color="error" class="rounded-full" @click="resetLayout" />
			</template>
		</UModal>

		<UModal
			v-model:open="picksResetOpen"
			title="Clear Explore picks?"
			description="Your interested and passed titles are forgotten for every profile on this device. Passed titles can then be suggested again, and this can't be undone.">
			<template #footer>
				<UButton
					label="Keep my picks"
					color="neutral"
					variant="outline"
					class="ms-auto rounded-full"
					@click="picksResetOpen = false" />
				<UButton label="Clear picks" color="error" class="rounded-full" @click="resetExplorePicks" />
			</template>
		</UModal>
	</UPageCard>
</template>
