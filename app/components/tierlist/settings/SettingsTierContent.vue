<template>
    <div class="flex flex-col gap-4">
        <UFormField label="Background color">
            <div class="flex gap-0.5">
                <div v-for="bg in neutralBackgrounds" :key="bg" @click="setBackground(bg)"
                    class="size-6 first:rounded-l-xs transition-all hover:scale-110 cursor-pointer last:rounded-r-full flex justify-center items-center w-full"
                    :class="[bg, selectedBackground === bg ? 'ring-2 ring-offset-2 ring-primary z-50' : '']">
                    <UTooltip text="Transparent" :delay="0">
                        <Icon v-if="bg === 'bg-transparent'" name="i-lucide-ban" class="text-error" />
                    </UTooltip>
                </div>
            </div>
        </UFormField>
        <UFormField label="Number of columns">
            <USlider v-model="nbCol" :min="1" :max="12" tooltip />
        </UFormField>
    </div>
</template>

<script setup lang="ts">
const tierlistStore = useTierlistStore()
const { selectedBackground, neutralBackgrounds, nbCol } = storeToRefs(tierlistStore)
const { setBackground } = tierlistStore
</script>
