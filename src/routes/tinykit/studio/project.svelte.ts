import { setContext, getContext } from 'svelte';
import { pb } from '$lib/pocketbase.svelte';
import * as api from '../lib/api.svelte';
import type { Project, Snapshot } from '../types';

const PROJECT_KEY = Symbol('PROJECT');

export class ProjectStore {
    project = $state<Project | null>(null);
    snapshots = $state<Snapshot[]>([]);
    snapshots_loading = $state(false);
    loading = $state(true);
    error = $state<string | null>(null);

    // Derived state helpers
    messages = $derived(this.project?.agent_chat || []);
    content = $derived(this.project?.content || []);
    design = $derived(this.project?.design || []);
    data_files = $derived(Object.keys(this.project?.data || {}));
    table_icons = $derived.by(() => {
        const icons: Record<string, string> = {};
        const data = this.project?.data || {};
        for (const file of Object.keys(data)) {
            icons[file] = data[file]?.icon || 'mdi:database';
        }
        return icons;
    });
    code = $derived(this.project?.frontend_code || '');

    // UI state that might be shared
    is_processing = $derived.by(() => {
        const msgs = this.messages;
        const last = msgs[msgs.length - 1];
        return last?.role === 'assistant' && last?.status === 'running';
    });

    constructor(public project_id: string) { }

    async init() {
        this.loading = true;
        try {
            this.project = await api.get_project_details(this.project_id);
            this.subscribe();
        } catch (e: any) {
            console.error('[ProjectStore] Failed to load project:', e);
            this.error = e.message || 'Failed to load project';
        } finally {
            this.loading = false;
        }
    }

    subscribe() {
        pb.collection('_tk_projects')
            .subscribe(this.project_id, (e) => {
                if (e.action === 'update') {
                    // Update the full project record
                    this.project = e.record as unknown as Project;
                    // Dispatch event for components that still rely on it (like Preview)
                    // We might remove this later if Preview uses the store directly
                    if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('tinykit:config-updated'));
                    }
                }
            })
            .catch((err) => {
                console.warn('[ProjectStore] Failed to subscribe to realtime:', err);
            });
    }

    async refresh() {
        // simple re-fetch if needed
        try {
            this.project = await api.get_project_details(this.project_id);
        } catch (e) {
            console.error('[ProjectStore] Failed to refresh:', e);
        }
    }

    async loadSnapshots() {
        if (this.snapshots_loading) return;
        this.snapshots_loading = true;
        try {
            this.snapshots = await api.load_snapshots(this.project_id);
        } catch (e) {
            console.error('[ProjectStore] Failed to load snapshots:', e);
        } finally {
            this.snapshots_loading = false;
        }
    }
}

export function setProjectStore(store: ProjectStore) {
    setContext(PROJECT_KEY, store);
}

export function getProjectStore(): ProjectStore {
    const store = getContext<ProjectStore>(PROJECT_KEY);
    if (!store) throw new Error('ProjectStore not found in context');
    return store;
}
