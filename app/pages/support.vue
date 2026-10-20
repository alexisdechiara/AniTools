<script setup lang="ts">
import { FEATURE_REGISTRY } from "#shared/config/features"

definePageMeta({
	feature: "support",
	auth: FEATURE_REGISTRY.support.access,
	indexable: FEATURE_REGISTRY.support.indexable
})

useSeoMeta({
	title: "Support",
	description: "Frequently asked questions about AniTools: accounts, local data, and how each tool works."
})

interface FaqEntry {
	question: string
	answer: string
}

const faq: FaqEntry[] = [
	{
		question: "Do I need to create an account?",
		answer: "No. AniTools never creates accounts of its own. Calendar, Tierlist and Create work without signing in. Dashboard, Statistics, Rewind, Explore, Podium and Timeline need your anime list, so they ask you to either sign in with AniList or enter a public AniList username."
	},
	{
		question: "Where is my data stored?",
		answer: "Your anime list and profile are fetched live from AniList and never stored on our servers. What does stay on your device, in this browser's local storage, is: your display preferences (Settings), the last profile you viewed, and anything you build in Tierlist or Create. Clearing your browser data removes all of it."
	},
	{
		question: "What's the difference between signing in and using a public username?",
		answer: "Signing in with AniList uses OAuth and lets AniTools read your list on your behalf, including private data like your own scores. Entering a public username instead reads whatever that AniList profile has made public, with no login required — handy for looking at your own list without going through OAuth, or checking a friend's."
	},
	{
		question: "How does the Calendar merge simuldub information?",
		answer: "The Calendar combines AniList's official airing schedule with simulcast dub data from AniTools' own catalogue, matched by anime. If that catalogue is temporarily unavailable, the Calendar still shows AniList's airing schedule on its own."
	},
	{
		question: "Why do some pages say \"beta\"?",
		answer: "AniTools ships features once they're usable, then keeps refining them. A beta label just means a feature is fully functional but may still change shape based on feedback."
	},
	{
		question: "I found a bug or have an idea — where do I report it?",
		answer: "Open an issue on the GitHub repository linked below. Screenshots and the anime list involved (if relevant) help a lot."
	}
]
</script>

<template>
	<UDashboardPanel id="support">
		<template #body>
			<div class="mx-auto w-full max-w-2xl space-y-8">
				<header>
					<h1 class="text-2xl font-bold tracking-tight text-highlighted">
						Support
					</h1>
					<p class="mt-1 text-sm text-muted">
						Answers to common questions about how AniTools works.
					</p>
				</header>

				<div class="overflow-hidden rounded-lg border border-default">
					<CollapseButton
						v-for="(entry, index) in faq"
						:key="entry.question"
						:label="entry.question"
						:first="index === 0">
						<p class="text-sm text-toned">
							{{ entry.answer }}
						</p>
					</CollapseButton>
				</div>

				<UPageCard
					title="Still stuck?"
					description="Report a bug, ask a question, or suggest a feature on GitHub."
					:ui="{ container: 'gap-y-3' }">
					<UButton
						label="GitHub repository"
						icon="i-simple-icons-github"
						to="https://github.com/alexisdechiara/AniTools"
						target="_blank"
						color="neutral"
						variant="subtle"
						class="w-fit" />
				</UPageCard>
			</div>
		</template>
	</UDashboardPanel>
</template>
