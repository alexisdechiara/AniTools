<template>
  <div class="fixed inset-y-24 inset-x-48">
    <div class="size-full flex flex-col p-24 bg-neutral-900 rounded-2xl">
      <h1 class="text-6xl font-bold text-white dark:text-neutral-300 mb-4">
        <span class="text-primary-400 me-1">Ani</span>Tools
      </h1>
      <h2 class="text-2xl text-white">The awesome anime tools</h2>
      <div class="mt-auto">
        <UInput
          v-model="username"
          placeholder="Enter your username"
          :ui="{ base: 'h-16 ps-8 rounded-full text-base', trailing: '-end-12' }"
          @keyup.enter="login"
        >
          <template #trailing>
            <UButton
              @click="login"
              :loading="isLoading"
              :ui="{
                base:
                  'size-full cursor-pointer rounded-full px-8 hover:bg-primary-400 active:bg-primary-400',
              }"
            >
              <Icon name="lucide:arrow-right" class="size-8" />
            </UButton>
          </template>
        </UInput>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ScoreFormat } from "#gql/default";

definePageMeta({
  layout: "none",
});

const route = useRoute();
const toast = useToast();
const username = ref("");
const isLoading = ref(false);

const { fetchUserData } = useUserStore();
const { fetchStatistics } = useStatisticsStore();
const { fetchAllAnimes } = useEntriesStore();

const login = async () => {
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
    // Récupérer les données de l'utilisateur
    const userData = await fetchUserData(username.value);

    // Utiliser l'ID de l'utilisateur pour charger les statistiques
    await fetchStatistics(userData.id);
    await fetchAllAnimes(
      userData.id,
      userData.mediaListOptions?.scoreFormat || ScoreFormat.POINT_100
    );

    // Rediriger vers la page d'accueil ou l'URL de redirection
    const redirectTo = route.query.redirect?.toString() || "/";
    await navigateTo(redirectTo, { replace: true });
  } catch (error: any) {
    console.error("Login error:", error);

    toast.add({
      title: "Login Error",
      description: error.message || "An error occurred during login",
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  } finally {
    isLoading.value = false;
  }
};
</script>
