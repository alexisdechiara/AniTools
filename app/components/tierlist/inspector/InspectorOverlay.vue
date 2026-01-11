<template>
	<Teleport to="body">
		<Transition name="fade" mode="out-in">
			<div v-if="isInspectorEnabled"
				class="fixed inset-0 z-200 cursor-pointer bg-black/10 pointer-events-none flex items-center justify-center">
				<div
					class="fixed right-8 bottom-4 px-3 py-1.5 bg-neutral-950/90 rounded-lg border border-white/10 shadow-xl backdrop-blur-sm">
					<p class="text-base font-medium text-white tracking-wide">Select an element to customize</p>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup lang="ts">
const { isInspectorEnabled } = useInspector()
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
	transition: all 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}

.fade-enter-active .fixed>div,
.fade-leave-active .fixed>div {
	transition: all 0.2s ease;
	transform: translateY(-8px);
}

.fade-enter-from .fixed>div,
.fade-leave-to .fixed>div {
	opacity: 0;
	transform: translateY(-16px);
}
</style>
