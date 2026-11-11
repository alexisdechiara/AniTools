<script setup lang="ts">
import { FEATURE_REGISTRY } from "#shared/config/features"
import { getSafeInternalPath } from "~/utils/navigation"

definePageMeta({
	layout: "none",
	feature: "login",
	auth: FEATURE_REGISTRY.login.access,
	indexable: FEATURE_REGISTRY.login.indexable
})

const seo = {
	title: "Login",
	description: "Connect securely with AniList or explore a public profile on AniTools."
}

useSeoMeta({
	title: seo.title,
	description: seo.description,
	ogTitle: seo.title,
	ogDescription: seo.description
})

const route = useRoute()
const toast = useToast()
const userStore = useUserStore()
const { fetchUserData } = userStore
const { loginWithAniList } = useAuth()

const username = ref("")
const isLoading = ref(false)
const profileError = ref<string | null>(null)

const publicTools = [
	{ label: "Calendar", to: "/calendar", icon: "i-lucide-calendar-days" },
	{ label: "Tier list", to: "/tierlist", icon: "i-lucide-rows-3" },
	{ label: "Create", to: "/create", icon: "i-lucide-circle-fading-plus" }
]

watch(username, () => {
	profileError.value = null
})
const canSubmit = computed(() => !isLoading.value && username.value.trim().length > 0)
// Text typed or autofilled before hydration lives only in the server-rendered input,
// and v-model overwrites it on mount: adopt it first so it survives hydration.
onBeforeMount(() => {
	const prefilled = document.querySelector<HTMLInputElement>("#anilist-username")?.value
	if (prefilled && !username.value) username.value = prefilled
})

const AUTH_ERROR_MESSAGES: Record<string, { title: string, description: string }> = {
	unavailable: {
		title: "AniList sign-in isn't available",
		description: "This server isn't set up for AniList sign-in right now. You can still open a public profile below."
	},
	rate_limited: {
		title: "Too many sign-in attempts",
		description: "Wait a minute, then try again."
	}
}
const DEFAULT_AUTH_ERROR_MESSAGE = {
	title: "AniList sign-in didn't finish",
	description: "The authorization was cancelled or has expired. Try again, or open a public profile instead."
}

const authError = route.query.authError?.toString()
if (authError) {
	// Only fixed copy is shown: the raw query value is used as a lookup key and never rendered.
	const message = Object.hasOwn(AUTH_ERROR_MESSAGES, authError)
		? AUTH_ERROR_MESSAGES[authError]
		: DEFAULT_AUTH_ERROR_MESSAGE
	toast.add({
		...message,
		color: "error",
		icon: "i-lucide-circle-alert"
	})
}

/** AniList answers 404 for an unknown username; anything else is an upstream or network failure. */
function isUnknownProfile(error: unknown): boolean {
	if (typeof error !== "object" || error === null || !("statusCode" in error)) return false

	const { statusCode } = error
	return typeof statusCode === "number" && statusCode === 404
}

async function loadPublicProfile() {
	const candidate = username.value.trim()
	if (!candidate) return

	isLoading.value = true
	profileError.value = null
	try {
		const profile = await fetchUserData(candidate)
		if (!profile.id) {
			throw createError({ statusCode: 404, statusMessage: "Unknown AniList profile" })
		}

		await navigateTo(getSafeInternalPath(route.query.redirect, "/"), { replace: true })
	} catch (error: unknown) {
		profileError.value = isUnknownProfile(error)
			? `AniList has no public profile called "${candidate}". Check the spelling: usernames must match exactly.`
			: "AniList didn't answer. Wait a few seconds, then try again."
	} finally {
		isLoading.value = false
	}

	if (profileError.value) {
		// The field is disabled while loading: refocus it once re-enabled so the name can be fixed.
		await nextTick()
		document.querySelector<HTMLInputElement>("#anilist-username")?.focus()
	}
}
</script>

<template>
	<div class="flex min-h-dvh items-center justify-center bg-default p-4 sm:p-8">
		<section
			class="login-hero w-full max-w-100 bg-[linear-gradient(165deg,var(--color-hero-surface-from),var(--color-hero-surface-to))] px-5 py-6 text-white shadow-2xl sm:px-8 sm:py-9"
			aria-labelledby="login-title">
			<div class="mb-6 flex items-center gap-2.5">
				<span
					class="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-500 text-lg font-black text-white"
					aria-hidden="true">
					A
				</span>
				<span class="text-2xl font-bold tracking-tight">
					<span class="text-primary-400">Ani</span>Tools
				</span>
			</div>

			<h1 id="login-title" class="mb-2 text-2xl leading-tight font-bold tracking-tight sm:text-3xl">
				Your AniList, with tools.
			</h1>
			<p class="mb-6 text-sm leading-relaxed text-white/65">
				Dashboard, statistics, Rewind, tier lists and share cards — your anime year in one place.
			</p>

			<button
				type="button"
				class="flex h-13 w-full items-center justify-center gap-2.5 rounded-full bg-brand-anilist text-base font-semibold text-hero-ink transition-colors hover:bg-brand-anilist-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
				@click="loginWithAniList()">
				<UIcon name="i-custom-anilist" class="size-5" aria-hidden="true" />
				Sign in with AniList
			</button>

			<div class="my-5 flex items-center gap-3 text-xs text-white/50">
				<span class="h-px flex-1 bg-white/15" />
				or a public profile
				<span class="h-px flex-1 bg-white/15" />
			</div>

			<form @submit.prevent="loadPublicProfile">
				<label for="anilist-username" class="sr-only">AniList username</label>
				<div
					class="flex h-13 items-center gap-2 rounded-full border bg-white/8 ps-4 pe-1.5"
					:class="profileError ? 'border-error-400' : 'border-white/15 focus-within:border-white/30'">
					<UIcon name="i-lucide-user-round" class="size-4.5 shrink-0 text-white/60" aria-hidden="true" />
					<input
						id="anilist-username"
						v-model="username"
						name="username"
						type="text"
						autocomplete="username"
						placeholder="AniList username"
						:aria-describedby="profileError ? 'public-profile-error public-profile-help' : 'public-profile-help'"
						:aria-invalid="profileError ? 'true' : undefined"
						:disabled="isLoading"
						:maxlength="50"
						class="min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-white/55 sm:text-sm">
					<button
						type="submit"
						aria-label="Load public AniList profile"
						:disabled="!canSubmit"
						class="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-500 text-white transition-opacity hover:bg-primary-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-45">
						<UIcon
							:name="isLoading ? 'i-lucide-loader-circle' : 'i-lucide-arrow-right'"
							:class="['size-4.5', isLoading ? 'animate-spin' : '']"
							aria-hidden="true" />
					</button>
				</div>
				<p
					v-if="profileError"
					id="public-profile-error"
					role="alert"
					class="mt-2 flex items-start gap-1.5 px-2 text-xs leading-relaxed text-error-300">
					<UIcon name="i-lucide-circle-alert" class="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
					{{ profileError }}
				</p>
			</form>

			<p id="public-profile-help" class="mt-5 text-center text-[0.7rem] leading-relaxed text-white/50">
				Public profiles are read-only. No AniList token ever reaches the browser.
			</p>

			<nav aria-labelledby="public-tools-title" class="mt-6 border-t border-white/10 pt-5">
				<p id="public-tools-title" class="mb-3 text-center text-xs font-medium text-white/65">
					No account needed for these
				</p>
				<ul class="grid grid-cols-3 gap-2">
					<li v-for="tool in publicTools" :key="tool.to">
						<NuxtLink
							:to="tool.to"
							class="flex flex-col items-center gap-1.5 rounded-2xl bg-white/6 px-2 py-3 text-xs font-medium text-white/85 transition-colors hover:bg-white/12 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
							<UIcon :name="tool.icon" class="size-5" aria-hidden="true" />
							{{ tool.label }}
						</NuxtLink>
					</li>
				</ul>
			</nav>
		</section>
	</div>
</template>

<style scoped>
.login-hero {
	border-radius: 2rem;
}

@supports (corner-shape: squircle) {
	.login-hero {
		corner-shape: squircle;
		border-radius: clamp(2rem, 9vw, 4.5rem);
	}
}
</style>
