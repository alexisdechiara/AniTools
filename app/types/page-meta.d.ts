import type {
	FeatureAccessPolicy,
	FeatureId
} from "#shared/config/features"

declare module "#app" {
	interface PageMeta {
		auth?: FeatureAccessPolicy
		feature?: FeatureId
		indexable?: boolean
	}
}

declare module "nuxt/app" {
	interface PageMeta {
		auth?: FeatureAccessPolicy
		feature?: FeatureId
		indexable?: boolean
	}
}

declare module "vue-router" {
	interface RouteMeta {
		auth?: FeatureAccessPolicy
		feature?: FeatureId
		indexable?: boolean
	}
}

export {}
