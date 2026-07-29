// @ts-nocheck
import tailwind from "eslint-plugin-tailwindcss"
import withNuxt from "./.nuxt/eslint.config.mjs"

export default withNuxt({
	...tailwind.configs.recommended,
	files: ["*.vue", "**/*.vue", "*.ts", "**/*.ts", "*.mjs"],
	settings: {
		tailwindcss: {
			cssConfigPath: "./app/assets/css/main.css"
		}
	},
	rules: {
		...tailwind.configs.recommended.rules,
		"@typescript-eslint/no-explicit-any": "warn",
		"@typescript-eslint/no-unused-vars": "warn",
		"vue/no-multiple-template-root": "off",
		"vue/multi-word-component-names": "off",
		"vue/max-attributes-per-line": ["warn", {
			singleline: {
				max: 10
			},
			multiline: {
				max: 1
			}
		}],
		"vue/html-closing-bracket-newline": ["warn", {
			singleline: "never",
			multiline: "never"
		}],
		"vue/singleline-html-element-content-newline": ["warn", {
			externalIgnores: ["div", "h1", "h2", "h3", "h4", "h5", "h6", "p"]
		}]
	}
})
