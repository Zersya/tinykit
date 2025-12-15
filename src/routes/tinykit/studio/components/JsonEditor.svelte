<script lang="ts">
	import { onMount, onDestroy } from "svelte"
	import { watch } from "runed"
	import { current_builder_theme } from "$lib/builder_themes"

	import { EditorView, keymap } from "@codemirror/view"
	import { EditorState, Compartment } from "@codemirror/state"
	import { basicSetup } from "codemirror"
	import { json } from "@codemirror/lang-json"
	import { indentWithTab } from "@codemirror/commands"

	let {
		value = "",
		onchange,
		onerror,
		min_height = "80px",
		max_height = "300px"
	}: {
		value: string
		onchange?: (value: string) => void
		onerror?: (has_error: boolean) => void
		min_height?: string
		max_height?: string
	} = $props()

	let has_error = $state(false)

	let editor_element: HTMLDivElement
	let editor_view: EditorView | undefined
	let theme_compartment = new Compartment()
	let internal_value = value

	// Create themed editor based on current builder theme
	function create_theme() {
		const is_dark = $current_builder_theme?.name !== "light"
		return EditorView.theme({
			"&": {
				fontSize: "13px",
				backgroundColor: "var(--builder-bg-secondary)",
				borderRadius: "6px",
				border: has_error
					? "1px solid #ef4444"
					: "1px solid var(--builder-border)",
				maxHeight: max_height
			},
			"&.cm-focused": {
				outline: "none",
				borderColor: has_error ? "#ef4444" : "var(--builder-accent)"
			},
			".cm-scroller": {
				fontFamily: "JetBrains Mono, ui-monospace, monospace",
				overflow: "auto",
				minHeight: min_height
			},
			".cm-content": {
				padding: "8px",
				caretColor: "var(--builder-text-primary)"
			},
			".cm-line": {
				padding: "0 4px"
			},
			".cm-gutters": {
				display: "none"
			},
			".cm-activeLine": {
				backgroundColor: "transparent"
			},
			".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
				backgroundColor: is_dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"
			}
		}, { dark: is_dark })
	}

	// Validate and format JSON
	function validate_json(str: string): { valid: boolean; formatted?: string } {
		try {
			const parsed = JSON.parse(str)
			return { valid: true, formatted: JSON.stringify(parsed, null, 2) }
		} catch {
			return { valid: false }
		}
	}

	// Format JSON on blur
	function handle_blur() {
		if (!editor_view) return
		const current = editor_view.state.doc.toString()
		const result = validate_json(current)

		has_error = !result.valid
		onerror?.(has_error)

		if (result.valid && result.formatted && result.formatted !== current) {
			// Update editor with formatted JSON
			editor_view.dispatch({
				changes: {
					from: 0,
					to: editor_view.state.doc.length,
					insert: result.formatted
				}
			})
			internal_value = result.formatted
			onchange?.(result.formatted)
		} else {
			onchange?.(current)
		}
	}

	onMount(() => {
		const initial_state = EditorState.create({
			doc: value,
			extensions: [
				basicSetup,
				json(),
				keymap.of([indentWithTab]),
				theme_compartment.of(create_theme()),
				EditorView.updateListener.of((update) => {
					if (update.docChanged) {
						internal_value = update.state.doc.toString()
						// Clear error on edit
						if (has_error) {
							has_error = false
							onerror?.(false)
						}
					}
				}),
				EditorView.domEventHandlers({
					blur: () => {
						handle_blur()
						return false
					}
				})
			]
		})

		editor_view = new EditorView({
			state: initial_state,
			parent: editor_element
		})
	})

	onDestroy(() => {
		editor_view?.destroy()
	})

	// Sync external value changes
	watch(
		() => value,
		(new_value) => {
			if (editor_view && new_value !== internal_value) {
				internal_value = new_value
				editor_view.dispatch({
					changes: {
						from: 0,
						to: editor_view.state.doc.length,
						insert: new_value
					}
				})
			}
		}
	)

	// Update theme when builder theme changes
	watch(
		() => $current_builder_theme,
		() => {
			if (editor_view && theme_compartment) {
				editor_view.dispatch({
					effects: theme_compartment.reconfigure(create_theme())
				})
			}
		}
	)

	// Update border color when error state changes
	watch(
		() => has_error,
		() => {
			if (editor_view && theme_compartment) {
				editor_view.dispatch({
					effects: theme_compartment.reconfigure(create_theme())
				})
			}
		}
	)
</script>

<div class="json-editor" bind:this={editor_element}></div>

<style>
	.json-editor {
		width: 100%;
		max-width: 100%;
		min-width: 0;
		overflow: hidden;
	}

	.json-editor :global(.cm-editor) {
		border-radius: 6px;
		max-height: inherit;
	}

	.json-editor :global(.cm-scroller) {
		overflow: auto !important;
	}

	.json-editor :global(.cm-focused) {
		outline: none;
	}
</style>
