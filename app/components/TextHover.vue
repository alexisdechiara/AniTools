<template>
	<div class="group/subtitle cursor-default" v-bind="$attrs">
		<div class="inline-flex group-hover/subtitle:hidden">
			<slot name="default" />
		</div>
		<div class="hidden group-hover/subtitle:flex">
			<slot name="hover" />
		</div>
	</div>
</template>
