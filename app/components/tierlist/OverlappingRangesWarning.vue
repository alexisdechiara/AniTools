<template>
	<UModal v-model:open="isOpen" title="Inconsistency Detected" :close="false" :dismissible="false"
		description="Overlapping tier ranges have been detected. Animes with scores in these ranges will be duplicated in the corresponding tiers.">
		<template #body>
			<div class="flex flex-col gap-2">
				<span class="text-sm font-medium text-highlighted">Affected ranges:</span>
				<div class="flex w-full h-fit px-2 py-1 rounded-lg bg-muted">
					<ul class="text-sm text-muted-foreground divide-muted divide-y w-full overflow-y-auto max-h-64">
						<li v-for="overlap in overlappingRanges" :key="overlap" class="flex items-center gap-2 py-1">
							<UIcon name="i-lucide-alert-triangle" class="text-warning size-4" />
							{{ overlap }}
						</li>
					</ul>
				</div>
				<span class="text-sm mt-4">
					Do you want to continue with duplication?
				</span>
			</div>
		</template>
		<template #footer>
			<UButton label="Cancel" color="neutral" variant="outline" @click="handleCancel" class="ms-auto" />
			<UButton label="Continue with duplication" color="primary" @click="handleConfirm" :loading="isLoading"
				:disabled="isLoading" />
		</template>
	</UModal>
</template>

<script lang="ts" setup>
interface Props {
	open: boolean
	overlappingRanges: string[]
	isLoading?: boolean
}

interface Emits {
	(e: 'update:open', value: boolean): void
	(e: 'confirm'): void
	(e: 'cancel'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const isOpen = computed({
	get: () => props.open,
	set: (value) => emit('update:open', value)
})

function handleConfirm() {
	emit('confirm')
	emit('update:open', false)
}

function handleCancel() {
	emit('cancel')
	emit('update:open', false)
}
</script>
