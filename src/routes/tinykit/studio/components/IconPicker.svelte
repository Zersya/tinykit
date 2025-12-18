<script lang="ts">
	import Icon from "@iconify/svelte"
	import { Search, ChevronDown } from "lucide-svelte"
	import { Input } from "$lib/components/ui/input"
	import { fade } from "svelte/transition"

	type IconPickerProps = {
		value: string
		onchange: (icon: string) => void
		placeholder?: string
		initial_search?: string
	}

	let { value = "", onchange, placeholder = "mdi:database", initial_search = "" }: IconPickerProps = $props()

	let open = $state(false)
	let search_query = $state("")
	let icons = $state<string[]>([])
	let loading = $state(false)
	let debounce_timer: ReturnType<typeof setTimeout> | null = null
	let container_el: HTMLDivElement | null = $state(null)
	let input_el: HTMLInputElement | null = $state(null)

	// Limit to clean, consistent icon sets
	const ICON_PREFIXES = ["lucide", "mdi", "tabler", "ph"]

	async function search_icons(query: string) {
		if (!query.trim()) {
			icons = []
			return
		}

		loading = true
		try {
			const response = await fetch(
				`https://api.iconify.design/search?query=${encodeURIComponent(query)}&limit=48&prefixes=${ICON_PREFIXES.join(",")}`
			)
			const data = await response.json()
			icons = data.icons || []
		} catch (err) {
			console.error("Failed to search icons:", err)
			icons = []
		} finally {
			loading = false
		}
	}

	function handle_search_input(e: Event) {
		const input = e.target as HTMLInputElement
		search_query = input.value

		if (debounce_timer) clearTimeout(debounce_timer)
		debounce_timer = setTimeout(() => {
			search_icons(search_query)
		}, 300)
	}

	function select_icon(icon: string) {
		onchange(icon)
		close_picker()
	}

	function toggle_picker() {
		open = !open
		if (open) {
			// Pre-fill search with initial value and auto-search
			if (initial_search && !search_query) {
				search_query = initial_search
				search_icons(initial_search)
			}
			setTimeout(() => input_el?.focus(), 50)
		}
	}

	function close_picker() {
		open = false
		search_query = ""
		icons = []
	}

	// Close on click outside
	function handle_click_outside(e: MouseEvent) {
		if (container_el && !container_el.contains(e.target as Node)) {
			close_picker()
		}
	}

	// Close on escape
	function handle_keydown(e: KeyboardEvent) {
		if (e.key === "Escape") {
			close_picker()
		}
	}

	$effect(() => {
		if (open) {
			document.addEventListener("click", handle_click_outside)
			document.addEventListener("keydown", handle_keydown)
		}
		return () => {
			document.removeEventListener("click", handle_click_outside)
			document.removeEventListener("keydown", handle_keydown)
		}
	})
</script>

<div class="relative" bind:this={container_el}>
	<button
		type="button"
		onclick={toggle_picker}
		class="flex items-center gap-2 h-10 px-3 border border-[var(--builder-border)] rounded-md bg-[var(--builder-bg-primary)] hover:bg-[var(--builder-bg-secondary)] transition-colors cursor-pointer w-full"
	>
		<Icon
			icon={value || placeholder}
			class="w-5 h-5 text-[var(--builder-text-primary)]"
		/>
		<span class="text-sm text-[var(--builder-text-secondary)] truncate flex-1 text-left">
			{value || placeholder}
		</span>
		<ChevronDown class="w-4 h-4 text-[var(--builder-text-secondary)]" />
	</button>

	{#if open}
		<div
			transition:fade={{ duration: 100 }}
			class="absolute top-full left-0 mt-1 w-72 bg-[var(--builder-bg-primary)] border border-[var(--builder-border)] rounded-md shadow-lg z-50"
		>
			<div class="p-2 border-b border-[var(--builder-border)]">
				<div class="relative">
					<Search class="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--builder-text-secondary)]" />
					<input
						bind:this={input_el}
						type="text"
						value={search_query}
						oninput={handle_search_input}
						placeholder="Search icons..."
						class="w-full pl-8 h-9 text-sm bg-[var(--builder-bg-secondary)] border border-[var(--builder-border)] rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-[var(--builder-accent)]"
					/>
				</div>
			</div>

			<div class="p-2 max-h-[280px] overflow-y-auto">
				{#if loading}
					<div class="flex items-center justify-center py-8">
						<div class="w-5 h-5 border-2 border-[var(--builder-accent)] border-t-transparent rounded-full animate-spin"></div>
					</div>
				{:else if icons.length > 0}
					<div class="grid grid-cols-6 gap-1">
						{#each icons as icon (icon)}
							<button
								type="button"
								onclick={() => select_icon(icon)}
								class="p-2 rounded hover:bg-[var(--builder-bg-secondary)] transition-colors flex items-center justify-center {value === icon ? 'bg-[var(--builder-accent)]/20 ring-1 ring-[var(--builder-accent)]' : ''}"
								title={icon}
							>
								<Icon {icon} class="w-5 h-5" />
							</button>
						{/each}
					</div>
				{:else if search_query}
					<p class="text-center text-sm text-[var(--builder-text-secondary)] py-8">
						No icons found
					</p>
				{:else}
					<p class="text-center text-sm text-[var(--builder-text-secondary)] py-8">
						Type to search icons
					</p>
				{/if}
			</div>

			{#if value}
				<div class="p-2 border-t border-[var(--builder-border)] flex items-center justify-between">
					<span class="text-xs text-[var(--builder-text-secondary)] truncate">{value}</span>
					<button
						type="button"
						onclick={() => select_icon("")}
						class="text-xs text-[var(--builder-text-secondary)] hover:text-[var(--builder-text-primary)]"
					>
						Clear
					</button>
				</div>
			{/if}
		</div>
	{/if}
</div>
