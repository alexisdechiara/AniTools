<template>
  <div class="fixed inset-y-32 inset-x-64">
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
    <UNotifications />
  </div>
</template>

<script lang="ts" setup>
definePageMeta({
  layout: "none",
});

const route = useRoute();
const toast = useToast();
const username = ref("");
const isLoading = ref(false);

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
    const success = await useUserStore().fetchUserData(username.value);

    if (success) {
      // Get redirect URL from query parameters or use home page as default
      const redirectTo = route.query.redirect?.toString() || "/";
      await navigateTo(redirectTo, { replace: true });
    } else {
      throw new Error("Invalid username or user not found");
    }
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
