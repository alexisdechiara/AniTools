<script setup lang="ts">
import { FEATURE_REGISTRY } from "#shared/config/features"
import SettingsAccountCard from "~/components/settings/AccountCard.vue"
import SettingsAppearanceCard from "~/components/settings/AppearanceCard.vue"
import SettingsScoreFormatCard from "~/components/settings/ScoreFormatCard.vue"
import SettingsTimeDisplayCard from "~/components/settings/TimeDisplayCard.vue"
import SettingsLocalDataCard from "~/components/settings/LocalDataCard.vue"

definePageMeta({
	feature: "settings",
	auth: FEATURE_REGISTRY.settings.access,
	indexable: FEATURE_REGISTRY.settings.indexable
})

useSeoMeta({
	title: "Settings",
	description: "Local display preferences for AniTools.",
	robots: "noindex, nofollow"
})
</script>

<template>
	<UDashboardPanel id="settings">
		<template #body>
			<div class="mx-auto w-full max-w-3xl space-y-6 pb-8 sm:pb-12">
				<PageHeader
					title="Settings"
					description="How AniTools looks and reads on this device. Nothing here changes your AniList account." />

				<SettingsAccountCard />
				<SettingsAppearanceCard />
				<SettingsScoreFormatCard />
				<SettingsTimeDisplayCard />
				<SettingsLocalDataCard />
			</div>
		</template>
	</UDashboardPanel>
</template>
