# tinykit - Claude Code Documentation

## ⚠️ CRITICAL: SVELTE 5 ONLY

**THIS PROJECT USES SVELTE 5 WITH RUNES. YOU MUST ALWAYS:**

1. **Use `$state()` for reactive variables** - NOT `let foo = 'bar'`
   ```svelte
   ❌ WRONG: let count = 0
   ✅ RIGHT: let count = $state(0)
   ```

2. **Use `$props()` for component props** - NOT `export let`
   ```svelte
   ❌ WRONG: export let title = ''
   ✅ RIGHT: let { title = '' } = $props()
   ```

3. **Use `watch` from runed for watching prop changes** - NOT `$effect()`
   ```svelte
   ❌ WRONG: $effect(() => { if (target_field) doSomething() })
   ✅ RIGHT: watch(() => target_field, (value) => { if (value) doSomething() })
   ```
   - Import: `import { watch } from "runed"`
   - Use `watch` when reacting to specific prop/state changes
   - Use `$effect()` only for setup/cleanup side effects (e.g., event listeners)

4. **Use `$derived()` for computed values** - NOT `$:` assignments
   ```svelte
   ❌ WRONG: $: doubled = count * 2
   ✅ RIGHT: let doubled = $derived(count * 2)
   ```

5. **Use `onclick={handler}` NOT `on:click={handler}`**
   ```svelte
   ❌ WRONG: <button on:click={handler}>Click</button>
   ✅ RIGHT: <button onclick={handler}>Click</button>
   ```

6. **BEFORE writing ANY Svelte component:**
   - Use `mcp__svelte__svelte-autofixer` tool to validate your code
   - Pass `desired_svelte_version: 5` and `async: false` (unless using await in markup)
   - Fix ALL issues the autofixer reports before proceeding

**No exceptions. Svelte 4 syntax will break this codebase.**

## Project Overview

tinykit is an open-source, self-hosted AI development platform—think Lovable, but running on your own server alongside the apps it builds. It provides database, editor, and hosting all at `/tinykit`, enabling you to ship production CRUD apps in an afternoon.

**Core Value Proposition:**
Let the AI handle the boring 80% (routes, auth, CRUD operations, basic UI), then you take over for the last mile—the details that actually matter.

## Current Implementation Status

### ✅ Phase 1: Foundation (COMPLETED)
- [x] SvelteKit setup with TypeScript
- [x] Tailwind CSS configuration
- [x] Project structure
- [x] MVP UI at `/tinykit` with side-by-side panes
- [x] Pocketbase download script
- [x] Pocketbase initialization with collections (`_tk_projects`, `_tk_settings`)
- [x] Pocketbase proxy at `/_pb/` (same port as frontend)
- [x] Database admin UI (Pocketbase iframe)
- [x] Basic layout with tabs
- [x] Lucide icons integration

### ✅ Phase 2: Core Features (COMPLETED)
- [x] CodeMirror editor with syntax highlighting and Emmet
- [x] Live preview iframe with in-browser Svelte compilation
- [x] Build system (server-side compilation to standalone HTML)
- [x] Agent chat UI with message history and streaming
- [x] Pocketbase persistence for conversations
- [x] Clear conversation functionality
- [x] Reset project functionality
- [x] Auto-scroll message history
- [x] Content fields (CMS-like editable values)
- [x] Design fields (CSS variables for theming)
- [x] Pocketbase collections via AI tools
- [x] Snapshots (time travel / undo)
- [x] Data tab with visual record editing
- [x] 6-tab UI (Agent, Code, Content, Design, Data, History)
- [x] Modular panel architecture
- [x] Pocketbase authentication (login)
- [x] Auth guard for admin routes
- [x] SDK-first architecture (direct PB SDK instead of API endpoints)
- [x] Project service layer with all CRUD operations
- [x] ProjectStore class with real-time subscriptions
- [x] VibeZone (fun games/visuals while coding)

### ✅ Phase 3: Domain-Based Routing (COMPLETED)
- [x] Domain field added to `_tk_projects` collection
- [x] Domain resolution in `hooks.server.ts`
- [x] Production apps served at root (`/`) based on domain
- [x] Studio at `/tinykit/studio?id=X`
- [x] Dashboard at `/tinykit/dashboard`
- [x] New project flow with domain awareness (`/tinykit/new?domain=X`)
- [x] Settings page at `/tinykit/settings`
- [x] Setup wizard at `/setup`

### 🚧 Phase 4: Immediate Next Steps
- [ ] Multi-file support (file tree in Code tab)
- [ ] Template marketplace (starter apps)
- [ ] Export/deploy to Vercel, Railway
- [ ] Real-time collaboration

## Tech Stack

### Core Technologies
- **Frontend Framework**: SvelteKit 2.x with TypeScript
- **Database & Storage**: Pocketbase 0.23.8
- **Styling**: Tailwind CSS 3.4.x
- **Icons**: Lucide (via lucide-svelte)
- **Editor**: CodeMirror 6 with Emmet support
- **AI Integration**: Vercel AI SDK (@ai-sdk/openai, @ai-sdk/anthropic, @ai-sdk/google)
- **Version Control**: Snapshots stored in Pocketbase (code-only)

### Architecture
- Self-hosted, single-server deployment
- No external services required (except LLM API)
- **Two Pocketbase collections:**
  - `_tk_projects` - All project data
  - `_tk_settings` - App configuration (LLM keys, etc.)
- Pocketbase proxied through SvelteKit at `/_pb/` (same port)
- Live preview with in-browser Svelte compilation
- Server-side build system for production HTML

### `_tk_projects` Collection Schema
```
- id (auto)
- name (text)
- domain (text, unique, required)
- frontend_code (text, max 10MB)
- backend_code (text, max 10MB)
- custom_instructions (text, max 1MB)
- design (json) - CSS variables array
- content (json) - Content fields array
- snapshots (json) - Time travel history
- agent_chat (json) - Conversation history
- data (json) - App data tables
- settings (json) - Project settings (vibe_zone_enabled, etc.)
- published_html (file) - Built production HTML
- created/updated (auto)
```

### `_tk_settings` Collection Schema
```
- id (text, primary key) - Setting key (e.g., "llm")
- value (json) - Setting value
```

### Domain-Based Routing

Each project is associated with a domain. Users can point multiple domains to a single tinykit server:

```
calculator.myserver.com/                → Serves calculator production app
calculator.myserver.com/tinykit/studio  → Edit calculator app
calculator.myserver.com/tinykit/dashboard → See ALL apps

blog.myserver.com/                      → Serves blog production app
blog.myserver.com/tinykit/studio        → Edit blog app
```

**Route Resolution:**
- `/` - Serve production app for current domain (from `published_html` file)
- `/tinykit/studio` - Edit the project for current domain
- `/tinykit/studio?id=X` - Edit specific project by ID
- `/tinykit/dashboard` - List all projects
- `/tinykit/new?domain=X` - Create new project for domain
- `/tinykit/settings` - LLM configuration
- `/setup` - First-time setup wizard

### Current UI Layout
```
┌───────────────────────────────────────────────────────────┐
│ tinykit · My Project                    [Vibe] [Deploy]   │
├────────────────────────────┬──────────────────────────────┤
│ [Agent] [Code] [Content]   │ Preview                      │
│ [Design] [Data] [History]  │                              │
├────────────────────────────┤                              │
│                            │                              │
│  Left Pane Content         │  Live Preview                │
│  (tabs switchable)         │                              │
│                            │                              │
└────────────────────────────┴──────────────────────────────┘
```

- **Left Pane**: 6 tabs
  - **Agent** (Cmd+1): AI chat interface for building apps
  - **Code** (Cmd+2): CodeMirror editor for manual code editing
  - **Content** (Cmd+3): CMS-like content fields
  - **Design** (Cmd+4): CSS variables for theming (colors, fonts, spacing)
  - **Data** (Cmd+5): Project data tables
  - **History** (Cmd+6): Snapshots for time travel / undo
- **Right Pane**: Live preview iframe with hot reload
- **Split View**: Resizable layout with PaneForge

### VibeZone
Fun mini-games/visuals to enjoy while waiting for AI responses:
- Starfield animation
- Tetris, Snake, 2048, Wordle
- Lo-fi music player (Chillhop, LofiGirl)
- Generative art
- Can be toggled per-project via settings

## Repository Structure

```
tinykit/
├── src/
│   ├── routes/
│   │   ├── login/              # Login page
│   │   │   └── +page.svelte
│   │   ├── setup/              # First-time setup wizard
│   │   │   └── +page.svelte
│   │   ├── tinykit/            # Main admin interface
│   │   │   ├── +layout.svelte  # Auth guard
│   │   │   ├── +page.svelte    # Redirect to dashboard
│   │   │   ├── dashboard/      # Projects list
│   │   │   ├── studio/         # Project editor (main UI)
│   │   │   │   ├── +page.svelte
│   │   │   │   ├── project.svelte.ts  # ProjectStore class
│   │   │   │   ├── panels/     # Tab panels
│   │   │   │   │   ├── agent/AgentPanel.svelte
│   │   │   │   │   ├── code/CodePanel.svelte
│   │   │   │   │   ├── content/ContentPanel.svelte
│   │   │   │   │   ├── design/DesignPanel.svelte
│   │   │   │   │   ├── data/DataPanel.svelte
│   │   │   │   │   └── history/HistoryPanel.svelte
│   │   │   │   └── components/ # UI components
│   │   │   │       ├── Header.svelte
│   │   │   │       ├── VibeZone.svelte
│   │   │   │       ├── CodeEditor.svelte
│   │   │   │       └── vibes/  # VibeZone games
│   │   │   ├── new/            # New project page
│   │   │   ├── settings/       # LLM settings
│   │   │   ├── [id]/           # Legacy redirect
│   │   │   ├── lib/            # Local utilities (api.svelte.ts, storage.ts)
│   │   │   ├── types.ts        # Shared TypeScript types
│   │   │   └── context.ts      # Svelte context helpers
│   │   ├── api/
│   │   │   ├── projects/[id]/
│   │   │   │   ├── agent/+server.ts   # LLM streaming endpoint
│   │   │   │   ├── build/+server.ts   # Svelte compilation
│   │   │   │   ├── export/+server.ts  # Project export
│   │   │   │   └── templates/+server.ts
│   │   │   ├── templates/      # Starter templates
│   │   │   ├── settings/       # LLM settings CRUD
│   │   │   ├── setup/          # Setup endpoint
│   │   │   └── proxy/          # External URL proxy
│   │   ├── _tk/                # Internal data endpoints
│   │   │   ├── data/           # Project data CRUD
│   │   │   └── realtime/       # SSE for realtime updates
│   │   ├── +layout.svelte      # Root layout
│   │   ├── +server.ts          # Root route (serves production apps)
│   │   └── [...path]/+server.ts # Catch-all for production app assets
│   ├── lib/
│   │   ├── pocketbase.svelte.ts  # PB client singleton + auth
│   │   ├── services/
│   │   │   └── project.svelte.ts # Project CRUD via SDK
│   │   ├── stores/
│   │   │   ├── project.svelte.ts # Reactive project store
│   │   │   └── vibe_zone.svelte.ts
│   │   ├── components/         # Shared UI components
│   │   │   ├── ui/             # shadcn-svelte components
│   │   │   └── Preview.svelte  # Live preview iframe
│   │   ├── compiler/           # In-browser Svelte compiler
│   │   ├── server/             # Server-side utilities
│   │   │   ├── pb.ts           # Server PB client
│   │   │   └── data-security.ts
│   │   ├── ai/                 # AI agent implementation
│   │   │   ├── sdk-agent.ts    # Main agent with tools
│   │   │   ├── index.ts
│   │   │   └── types.ts
│   │   ├── templates/          # Starter templates
│   │   ├── themes.ts           # App themes
│   │   ├── builder_themes.ts   # Builder UI themes
│   │   └── utils.ts            # Utility functions
│   ├── hooks.server.ts         # Pocketbase proxy + domain resolution
│   ├── app.html                # HTML template
│   └── app.css                 # Global styles with Tailwind
├── scripts/
│   └── download-pocketbase.js  # Downloads PB binary for platform
├── pocketbase/
│   ├── pocketbase             # Binary (downloaded)
│   ├── pb_data/               # Database & files
│   └── pb_migrations/         # Collection migrations
├── static/                    # Static assets
├── .env.example               # Environment template
├── package.json
├── svelte.config.js
├── vite.config.ts
├── tailwind.config.js
└── claude.md                  # This file
```

## Key Components

### ProjectStore (`src/routes/tinykit/studio/project.svelte.ts`)
Reactive store class that manages project state with real-time Pocketbase subscriptions:

```typescript
import { getProjectStore } from './project.svelte'

const store = getProjectStore()

// Reactive state
store.project      // Full project object
store.code         // frontend_code
store.messages     // agent_chat array
store.content      // content fields
store.design       // design fields
store.data_files   // data table names
store.is_processing // true during AI generation

// Methods
await store.init()
await store.refresh()
await store.loadSnapshots()
```

### Project Service (`src/lib/services/project.svelte.ts`)
SDK-based CRUD operations:

```typescript
import { project_service } from '$lib/services/project.svelte'

const projects = await project_service.list()
const project = await project_service.get(id)
await project_service.create({ name, domain })
await project_service.update(id, { frontend_code: '...' })
await project_service.delete(id)
```

### AI Agent (`src/lib/ai/sdk-agent.ts`)
Uses Vercel AI SDK with tool calling:

**Available Tools:**
- `write_code` - Write/update frontend code
- `create_content_field` - Add CMS content fields
- `update_content_field` - Update content field values
- `create_design_field` - Add CSS variable design fields
- `update_design_field` - Update design field values
- `create_data_table` - Create new data table
- `add_data_record` - Add record to data table
- `update_data_record` - Update data record
- `delete_data_record` - Delete data record

## API Routes

### Active Server Endpoints

**Agent (LLM Integration):**
- `POST /api/projects/[id]/agent` - Stream AI response
  - Server-side for LLM API key security
  - Returns SSE stream with text and tool calls

**Build System:**
- `POST /api/projects/[id]/build` - Compile Svelte to standalone HTML
  - Server-side compilation with Svelte 5
  - Uploads result to `published_html` file field

**Settings:**
- `GET/POST /api/settings` - Get/save LLM configuration
- `POST /api/settings/validate-llm` - Validate LLM API key
- `GET /api/settings/llm-status` - Check if LLM is configured

**Templates:**
- `GET /api/templates` - List available starter templates
- `GET /api/templates/[id]` - Get template details

**Setup:**
- `POST /api/setup` - First-time Pocketbase admin creation

### Pocketbase Direct Access (SDK)
Most operations use the PB SDK directly:

```typescript
import { pb } from '$lib/pocketbase.svelte'

// Projects
const projects = await pb.collection('_tk_projects').getFullList()
const project = await pb.collection('_tk_projects').getOne(id)
await pb.collection('_tk_projects').update(id, { frontend_code: '...' })

// Real-time subscriptions
pb.collection('_tk_projects').subscribe(id, (e) => {
  if (e.action === 'update') {
    // Handle update
  }
})
```

## Development

### Initial Setup
```bash
# Clone the repository
git clone https://github.com/matthewmateo/tinykit.git
cd tinykit

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start dev server (auto-downloads Pocketbase, starts both services)
npm run dev

# Visit http://localhost:5173/setup to complete first-time setup
```

### Common Commands
- `npm run dev` - Start dev server (Pocketbase + Vite)
- `npm run dev:vite` - Start only Vite (if PB already running)
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run check` - Type check
- `npm run pocketbase:serve` - Start only Pocketbase

### Access Points
- Frontend: http://localhost:5173
- Admin UI: http://localhost:5173/tinykit
- Setup: http://localhost:5173/setup
- Settings: http://localhost:5173/tinykit/settings
- Pocketbase Admin: http://localhost:5173/_pb/_
- Pocketbase API: http://localhost:5173/_pb/api/

## Environment Variables

```env
# LLM Configuration (set via /tinykit/settings UI, stored in _tk_settings)
# Not needed in .env - configured through the app

# Pocketbase Configuration
POCKETBASE_URL=http://127.0.0.1:8091

# Server Configuration (optional)
PORT=5173
HOST=0.0.0.0
```

## Security

### Authentication
- Pocketbase's built-in `users` collection
- Admin UI (`/tinykit/*`) requires login
- JWT tokens with automatic refresh
- Collection rules enforce `@request.auth.id != ''`

### Key Files
- `src/lib/pocketbase.svelte.ts` - Auth store
- `src/routes/login/+page.svelte` - Login form
- `src/routes/tinykit/+layout.svelte` - Auth guard

### Security Considerations
1. **LLM API Keys**: Stored encrypted in Pocketbase, never exposed to client
2. **File Access**: Data operations scoped to project
3. **Code Execution**: AI-generated code runs in sandboxed iframe
4. **Auth Required**: All admin routes require authentication

## Troubleshooting

### Pocketbase won't start
- Check if port 8091 is available: `lsof -i :8091`
- Verify file permissions: `chmod +x ./pocketbase/pocketbase`
- Check logs in `pocketbase/pb_data/logs/`

### Hot reload not working
- Clear cache: `rm -rf .svelte-kit node_modules/.vite`
- Restart dev server
- Hard refresh: Cmd+Shift+R (Mac) / Ctrl+Shift+R (Windows)

### AI agent errors
- Visit `/tinykit/settings` to verify LLM configuration
- Check browser console for API errors
- Verify API key is valid and has credits

### Preview not updating
- Check browser console for compilation errors
- Ensure code is valid Svelte 5 syntax
- Try manual refresh of preview pane

## Resources

- [SvelteKit Docs](https://kit.svelte.dev/docs)
- [Pocketbase Docs](https://pocketbase.io/docs/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [CodeMirror Docs](https://codemirror.net/docs/)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)

---

**Last Updated**: 2025-12-14
**Version**: 0.1.0
