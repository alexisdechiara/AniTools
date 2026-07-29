<template>
	<div class="flex min-h-dvh items-center justify-center bg-muted p-4 sm:p-8">
		<section
			class="squircle flex min-h-[32rem] w-full max-w-4xl flex-col bg-neutral-900 px-6 py-10 shadow-2xl sm:px-12 sm:py-14 lg:px-24 lg:py-20"
			aria-labelledby="login-title">
			<h1 id="login-title" class="mb-4 text-4xl font-bold text-white sm:text-6xl dark:text-neutral-300">
				<span class="me-1 text-primary-400">Ani</span>Tools
			</h1>
			<p class="max-w-2xl text-xl text-white sm:text-2xl">
				Your anime year, lists and calendar in one place.
			</p>

			<div class="mt-auto flex flex-col gap-5 pt-12">
				<UButton
					label="Continue with AniList"
					icon="i-simple-icons-anilist"
					size="xl"
					block
					type="button"
					class="h-14 justify-center rounded-full sm:h-16"
					@click="loginWithAniList()" />

				<div class="flex items-center gap-3 text-neutral-400">
					<USeparator class="flex-1" />
					<span class="text-sm">or view a public profile</span>
					<USeparator class="flex-1" />
				</div>

				<form class="space-y-2" @submit.prevent="loadPublicProfile">
					<label for="anilist-username" class="sr-only">AniList username</label>
					<UInput
						id="anilist-username"
						v-model="username"
						name="username"
						autocomplete="username"
						placeholder="AniList username"
						class="w-full"
						aria-describedby="public-profile-help"
						:disabled="isLoading"
						:maxlength="50"
						:ui="{ base: 'h-14 ps-6 sm:h-16 sm:ps-8 rounded-full text-base', trailing: '-end-10 sm:-end-12' }">
						<template #trailing>
							<UButton
								type="submit"
								aria-label="Load public AniList profile"
								:disabled="isLoading || !username.trim()"
								:ui="{
									base: 'size-full cursor-pointer rounded-full px-6 hover:bg-primary-400 active:bg-primary-400 sm:px-8'
								}">
								<Icon v-if="isLoading" name="lucide:loader-circle" class="size-7 animate-spin sm:size-8" aria-hidden="true" />
								<Icon v-else name="lucide:arrow-right" class="size-7 sm:size-8" aria-hidden="true" />
							</UButton>
						</template>
					</UInput>
					<p id="public-profile-help" class="px-4 text-xs text-neutral-400">
						Public profiles are read-only. Editing AniList data requires OAuth.
					</p>
				</form>
			</div>
		</section>
	</div>
</template>

<script lang="ts" setup>
import { FEATURE_REGISTRY } from "#shared/config/features";
import { getSafeInternalPath } from "~/utils/navigation";

definePageMeta({
	layout: "none",
	feature: "login",
	auth: FEATURE_REGISTRY.login.access,
	indexable: FEATURE_REGISTRY.login.indexable
});

const route = useRoute();
const seo = {
	title: "Login",
	description: "Connect securely with AniList or explore a public profile on AniTools."
};

useSeoMeta({
	title: seo.title,
	description: seo.description,
	ogTitle: seo.title,
	ogDescription: seo.description
});

const toast = useToast();
const username = ref("");
const isLoading = ref(false);

const userStore = useUserStore();
const { fetchUserData } = userStore;
const { loginWithAniList } = useAuth();

if (route.query.authError) {
	toast.add({
		title: "AniList login failed",
		description: "The authorization could not be completed. Please try again.",
		color: "error",
		icon: "i-lucide-circle-alert"
	});
}

const loadPublicProfile = async () => {
	if (!username.value.trim()) {
		toast.add({
			title: "Error",
			description: "Please enter a username",
			color: "error",
			icon: "i-heroicons-exclamation-circle",
		});
		return;
	}

	isLoading.value = true;
	try {
		const userData = await fetchUserData(username.value);
		if (!userData.id) {
			throw new Error("User not found");
		}

		const redirectTo = getSafeInternalPath(route.query.redirect, "/");
		await navigateTo(redirectTo, { replace: true });
	} catch (error: unknown) {
		toast.add({
			title: "Profile error",
			description: error instanceof Error
				? error.message
				: "An error occurred while loading the profile.",
			color: "error",
			icon: "i-lucide-circle-alert",
		});
	} finally {
		isLoading.value = false;
	}
};
</script>

<style>
@supports (corner-shape: squircle) {
	.squircle {
		corner-shape: squircle !important;
		border-radius: clamp(2rem, 10vw, 9rem);
	}
}

@supports not (corner-shape: squircle) {
	.squircle {
		border-radius: clamp(2rem, 6vw, 4rem) !important;
	}
}
</style>
