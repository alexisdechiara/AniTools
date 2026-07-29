import { createError } from "h3"

export async function withTimeout<T>(
	request: Promise<T>,
	timeoutMs: number,
	statusMessage: string
): Promise<T> {
	let timeout: ReturnType<typeof setTimeout> | undefined

	try {
		return await Promise.race([
			request,
			new Promise<never>((_resolve, reject) => {
				timeout = setTimeout(() => {
					reject(createError({
						statusCode: 504,
						statusMessage
					}))
				}, timeoutMs)
			})
		])
	} finally {
		if (timeout) {
			clearTimeout(timeout)
		}
	}
}
