<script lang="ts">
	import { onMount, onDestroy } from "svelte"
	import { watch } from "runed"
	import { current_builder_theme } from "$lib/builder_themes"

	import { EditorView, keymap } from "@codemirror/view"
	import { EditorState, Compartment } from "@codemirror/state"
	import { basicSetup } from "codemirror"
	import { markdown } from "@codemirror/lang-markdown"
	import { indentWithTab } from "@codemirror/commands"

	let {
		value = "",
		onchange,
		placeholder = "Write markdown...",
		min_height = "80px",
		max_height = "300px"
	}: {
		value: string
		onchange?: (value: string) => void
		placeholder?: string
		min_height?: string
		max_height?: string
	} = $props()

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
				border: "1px solid var(--builder-border)",
				maxHeight: max_height
			},
			"&.cm-focused": {
				outline: "none",
				borderColor: "var(--builder-accent)"
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
			},
			// Markdown-specific styling
			".cm-header-1": {
				fontSize: "1.4em",
				fontWeight: "bold"
			},
			".cm-header-2": {
				fontSize: "1.2em",
				fontWeight: "bold"
			},
			".cm-header-3": {
				fontSize: "1.1em",
				fontWeight: "bold"
			},
			".cm-strong": {
				fontWeight: "bold"
			},
			".cm-emphasis": {
				fontStyle: "italic"
			}
		}, { dark: is_dark })
	}

	function handle_blur() {
		if (!editor_view) return
		const current = editor_view.state.doc.toString()
		onchange?.(current)
	}

	onMount(() => {
		const initial_state = EditorState.create({
			doc: value,
			extensions: [
				basicSetup,
				markdown(),
				keymap.of([indentWithTab]),
				theme_compartment.of(create_theme()),
				EditorView.updateListener.of((update) => {
					if (update.docChanged) {
						internal_value = update.state.doc.toString()
					}
				}),
				EditorView.domEventHandlers({
					blur: () => {
						handle_blur()
						return false
					}
				}),
				EditorView.contentAttributes.of({ "aria-placeholder": placeholder })
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
</script>

<div class="markdown-editor-wrapper">
	<div class="markdown-editor" bind:this={editor_element}></div>
	<span class="markdown-hint">MD → HTML</span>
</div>

<style>
	.markdown-editor-wrapper {
		position: relative;
		width: 100%;
		max-width: 100%;
		min-width: 0;
		overflow: hidden;
	}

	.markdown-editor {
		width: 100%;
		max-width: 100%;
		min-width: 0;
	}

	.markdown-editor :global(.cm-editor) {
		border-radius: 6px;
		max-height: inherit;
	}

	.markdown-editor :global(.cm-scroller) {
		overflow: auto !important;
	}

	.markdown-editor :global(.cm-focused) {
		outline: none;
	}

	.markdown-hint {
		position: absolute;
		bottom: 6px;
		right: 8px;
		font-size: 10px;
		color: var(--builder-text-secondary);
		opacity: 0.5;
		pointer-events: none;
		font-family: ui-monospace, monospace;
		z-index: 1;
	}
</style>
