// Fails only on high/critical advisories that are not on the reviewed allowlist.
import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

const BLOCKING = new Set(["high", "critical"])

export function findBlockingAdvisories(report, allowlist) {
	const allowed = new Set(allowlist.map(entry => entry.id))
	const blocking = []
	for (const [packageName, advisories] of Object.entries(report)) {
		for (const advisory of advisories) {
			const id = String(advisory.url ?? "").split("/").pop() ?? ""
			if (BLOCKING.has(advisory.severity) && !allowed.has(id)) {
				blocking.push({ packageName, id, severity: advisory.severity })
			}
		}
	}
	return blocking
}

function main() {
	const result = spawnSync("bun", ["audit", "--json"], {
		encoding: "utf8",
		shell: process.platform === "win32"
	})
	const stdout = result.stdout ?? ""
	let report
	try {
		report = JSON.parse(stdout)
	} catch {
		console.error(stdout || result.stderr || "bun audit produced no output")
		process.exit(2)
	}
	const allowlist = JSON.parse(
		readFileSync(new URL("./audit-allowlist.json", import.meta.url), "utf8")
	)
	const blocking = findBlockingAdvisories(report, allowlist)
	for (const { packageName, id, severity } of blocking) {
		console.log(`${packageName} ${id} ${severity}`)
	}
	if (blocking.length > 0) {
		process.exit(1)
	}
	console.log(`audit gate: ok (${allowlist.length} allowlisted)`)
	process.exit(0)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
	main()
}
