# MeshHook Web Application

SvelteKit-based frontend for MeshHook workflow engine.

## Tech Stack

- **SvelteKit** - Full-stack framework with SSR
- **Svelte 5** - Latest version with runes API
- **Supabase** - Authentication and database
- **@xyflow/svelte** - Visual DAG editor
- **ESLint + Prettier** - Code quality and formatting

## Setup

### 1. Install Dependencies

```bash
cd apps/web
pnpm install
```

### 2. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:

```env
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Run Development Server

```bash
pnpm dev
```

The app will be available at `http://localhost:5173`

## Project Structure

```
apps/web/
├── src/
│   ├── lib/
│   │   ├── components/     # Reusable Svelte components
│   │   ├── stores/         # Svelte stores for state management
│   │   ├── utils/          # Utility functions
│   │   └── supabase.js     # Supabase client setup
│   ├── routes/
│   │   ├── api/            # API routes
│   │   ├── workflows/      # Workflow management pages
│   │   ├── runs/           # Run monitoring pages
│   │   ├── secrets/        # Secrets management pages
│   │   ├── +layout.svelte  # Root layout
│   │   ├── +layout.server.js # Server-side layout logic
│   │   └── +page.svelte    # Home page
│   ├── app.html            # HTML template
│   └── app.css             # Global styles
├── static/                 # Static assets
├── svelte.config.js        # SvelteKit configuration
├── vite.config.js          # Vite configuration
└── package.json
```

## Key Features

### Authentication Flow (#119)
- Supabase Auth integration
- Server-side session management
- Protected routes with RLS

### Workflow Builder (#120-125)
- Visual DAG editor with drag & drop
- Node palette with available node types
- Connection/edge drawing
- JSON schema-driven node configuration
- Workflow validation
- Save/load workflow definitions

### Workflow Management (#126-129)
- Workflow list view
- Create/edit workflow interface
- Version management (draft/publish)
- Workflow settings

### Run Monitoring (#130-135)
- Run list view
- Run detail view with DAG visualization
- Live logs via Supabase Realtime
- Event timeline
- Resume from step functionality
- Test run feature

### Secrets Management (#136-139)
- Secrets vault UI
- Add/edit/delete secrets
- Secret masking in UI
- Project-scoped secrets

## Development

### Code Quality

```bash
# Run linter
pnpm lint

# Format code
pnpm format

# Type checking
pnpm check
```

### Building for Production

```bash
pnpm build
```

### Preview Production Build

```bash
pnpm preview
```

## Svelte 5 Runes

This project uses Svelte 5's new runes API:

- `$state()` - Reactive state
- `$derived()` - Derived values
- `$effect()` - Side effects
- `$props()` - Component props
- `{@render}` - Render snippets

Example:

```svelte
<script>
	let count = $state(0);
	let doubled = $derived(count * 2);
	
	$effect(() => {
		console.log('Count changed:', count);
	});
</script>

<button onclick={() => count++}>
	Count: {count} (doubled: {doubled})
</button>
```

## Contributing

1. Follow the existing code style
2. Use Svelte 5 runes syntax
3. Write tests for new features
4. Update documentation as needed

## License

See root LICENSE file