<script setup lang="ts">
const userStore = useUserStore()
const { loginWithAniList, logout } = useAuth()
const toast = useToast()

const { isAuthenticated, isOAuthAuthenticated, username, avatar } = storeToRefs(userStore)

type Identity = "oauth" | "public" | "guest"

const identity = computed<Identity>(() => {
	if (isOAuthAuthenticated.value) return "oauth"
	return isAuthenticated.value ? "public" : "guest"
})

const copy = computed(() => {
	switch (identity.value) {
		case "oauth":
			return {
				title: "Signed in with AniList",
				description: "AniTools reads your list to build your pages. It never posts, never edits, and never keeps a copy on a server.",
				badge: "AniList account"
			}
		case "public":
			return {
				title: "Reading a public profile",
				description: "Whatever this profile shares publicly on AniList shows up here. Private entries and personal scores stay hidden — sign in with AniList to include them.",
				badge: "Read-only"
			}
		default:
			return {
				title: "Not connected",
				description: "Calendar, Tierlist and Create work as they are. Connect AniList to unlock Dashboard, Statistics, Rewind, Podium, Explore and Timeline.",
				badge: "Guest"
			}
	}
})

function forgetProfile() {
	userStore.$reset()
	toast.add({
		title: "Profile forgotten",
		description: "This browser no longer remembers a public AniList profile.",
		icon: "i-lucide-user-round-x"
	})
}
</script>

<template>
	<UPageCard
		:title="copy.title"
		:description="copy.description"
		:ui="{ container: 'gap-y-4' }">
		<div class="flex flex-col gap-4">
			<div class="flex items-center gap-3 rounded-lg bg-elevated/50 p-3">
				<UAvatar
					:src="avatar?.src"
					:alt="avatar?.alt"
					icon="i-lucide-user-round"
					size="lg" />
				<div class="min-w-0">
					<p class="truncate text-sm font-medium text-highlighted">
						{{ isAuthenticated ? `@${username}` : "No profile loaded" }}
					</p>
					<UBadge
						:label="copy.badge"
						:color="identity === 'oauth' ? 'primary' : 'neutral'"
						variant="soft"
						size="sm"
						class="mt-1 rounded-full" />
				</div>
			</div>

			<div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
				<UButton
					v-if="identity !== 'oauth'"
					label="Continue with AniList"
					icon="i-custom-anilist"
					class="rounded-full"
					@click="loginWithAniList('/settings')" />
				<UButton
					v-if="identity === 'guest'"
					label="Use a public username"
					icon="i-lucide-search"
					to="/login"
					color="neutral"
					variant="soft"
					class="rounded-full" />
				<UButton
					v-if="identity === 'public'"
					label="Forget this profile"
					icon="i-lucide-user-round-x"
					color="neutral"
					variant="soft"
					class="rounded-full"
					@click="forgetProfile" />
				<UButton
					v-if="identity === 'oauth'"
					label="Sign out"
					icon="i-lucide-log-out"
					color="neutral"
					variant="soft"
					class="rounded-full"
					@click="logout" />
			</div>
		</div>
	</UPageCard>
</template>
