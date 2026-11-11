import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import type { NuxtError } from "#app"
import ErrorPage from "~/error.vue"

const RAW_MESSAGE = "Directory import 'D:\\app\\node_modules\\pkg' is not supported"

function nuxtError(statusCode: number, message: string): NuxtError {
	return createError({ statusCode, message, statusMessage: message }) as NuxtError
}

async function mountError(statusCode: number, message: string) {
	return await mountSuspended(ErrorPage, {
		props: { error: nuxtError(statusCode, message) }
	})
}

describe("error page", () => {
	it("titles a 404 as a missing page with a single way home", async () => {
		const wrapper = await mountError(404, "Page not found: /nope-404")

		expect(wrapper.find("h1").text()).toBe("Page not found")
		expect(wrapper.text()).toContain("This page does not exist or has moved.")
		expect(wrapper.findAll("button").map(button => button.text())).toEqual(["Back to home"])
	})

	it("titles any other status as a failure and offers a retry", async () => {
		const wrapper = await mountError(500, RAW_MESSAGE)
		const main = wrapper.find("main")

		expect(wrapper.find("h1").text()).toBe("Something went wrong")
		expect(main.text()).toContain("500")
		expect(wrapper.findAll("button").map(button => button.text()))
			.toEqual(["Try again", "Back to home"])
		// The raw error text never reaches the visitor-facing block.
		expect(main.text()).not.toContain("Directory import")
		expect(main.text()).not.toContain("node_modules")
	})

	it("only prints raw error text in the development details block", async () => {
		const wrapper = await mountError(503, RAW_MESSAGE)
		const details = wrapper.find("[data-testid='error-dev-details']")

		expect(wrapper.find("h1").text()).toBe("Something went wrong")
		expect(details.exists()).toBe(import.meta.dev)
	})

	it("falls back to 500 for a status outside the HTTP error range", async () => {
		const wrapper = await mountError(200, "odd")

		expect(wrapper.find("main").text()).toContain("500")
		expect(wrapper.find("h1").text()).toBe("Something went wrong")
	})
})
