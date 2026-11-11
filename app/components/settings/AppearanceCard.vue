<script setup lang="ts">
const colorMode = useColorMode()

type AppearanceValue = "system" | "light" | "dark"

const items: Array<{ label: string, value: AppearanceValue, icon: string }> = [
	{ label: "System", value: "system", icon: "i-lucide-monitor" },
	{ label: "Light", value: "light", icon: "i-lucide-sun" },
	{ label: "Dark", value: "dark", icon: "i-lucide-moon" }
]

const preference = computed<AppearanceValue>({
	get: () => (colorMode.preference as AppearanceValue) || "system",
	set: (value) => {
		colorMode.preference = value
	}
})
</script>

<template>
	<UPageCard
		title="Appearance"
		description="Pick a theme, or follow your system setting."
		:ui="{ container: 'gap-y-4' }">
		<URadioGroup
			v-model="preference"
			:items="items"
			variant="table"
			orientation="horizontal"
			indicator="hidden"
			aria-label="Theme"
			:ui="{ item: 'flex-1 justify-center', label: 'flex items-center gap-1.5' }">
			<template #label="{ item }">
				<span class="flex items-center gap-1.5">
					<UIcon :name="item.icon" class="size-4" />
					{{ item.label }}
				</span>
			</template>
		</URadioGroup>
	</UPageCard>
</template>
