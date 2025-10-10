# GitHub Copilot Instructions for MeshHook

## Project Overview

MeshHook is a webhook-first, deterministic, Postgres-native workflow engine that delivers n8n's visual simplicity and Temporal's durability without restrictive licensing.

### Core Features
- Webhook triggers with signature verification
- Visual DAG builder using SvelteKit/Svelte 5
- Durable, replayable runs via event sourcing
- Live logs via Supabase Realtime
- Multi-tenant RLS security

## Technology Stack

### Backend
- **Runtime**: Node.js 20+
- **Module System**: ECMAScript Modules (ESM) - NO TypeScript
- **Database**: PostgreSQL (via Supabase)
- **Queue System**: PGMQ (Postgres Message Queue)
- **Package Manager**: pnpm (NOT npm or yarn)

### Frontend
- **Framework**: SvelteKit with Svelte 5
- **Flow Editor**: @xyflow/svelte
- **Styling**: CSS (no Tailwind or CSS-in-JS)
- **State Management**: Svelte 5 runes ($state, $derived, $effect)

## Code Style Guidelines

### JavaScript/Node.js

```javascript
// ✅ CORRECT - Modern ESM with ES2024+ features
export async function processWorkflow(workflowId) {
  const workflow = await fetchWorkflow(workflowId);
  const result = workflow?.nodes?.map(node => ({
    id: node.id,
    type: node.type,
    config: node.data?.config ?? {}
  }));
  return result;
}

// ❌ WRONG - CommonJS or TypeScript
const processWorkflow = require('./workflow');
function processWorkflow(workflowId: string): Promise<Result> { }
```

### Key Principles

1. **Always use ESM imports/exports** - Never use `require()` or `module.exports`
2. **Use modern JavaScript** - Optional chaining (`?.`), nullish coalescing (`??`), destructuring
3. **Async/await over promises** - Prefer `async/await` for asynchronous code
4. **No TypeScript** - Pure JavaScript only
5. **Descriptive error messages** - Always provide context in error handling

### Error Handling

```javascript
// ✅ CORRECT - Descriptive error handling
try {
  const result = await supabase
    .from('workflows')
    .select('*')
    .eq('id', workflowId)
    .single();
    
  if (result.error) {
    throw new Error(`Failed to fetch workflow ${workflowId}: ${result.error.message}`);
  }
  
  return result.data;
} catch (error) {
  console.error('Error in fetchWorkflow:', error);
  throw error;
}

// ❌ WRONG - Silent failures or generic errors
try {
  return await supabase.from('workflows').select('*').eq('id', workflowId).single();
} catch (e) {
  throw new Error('Error');
}
```

## Svelte 5 Guidelines

### Component Structure

```svelte
<script>
  // ✅ CORRECT - Svelte 5 runes
  let { workflow, onSave } = $props();
  let nodes = $state(workflow?.definition?.nodes || []);
  let isValid = $derived(nodes.length > 0);
  
  $effect(() => {
    console.log('Nodes changed:', nodes.length);
  });
  
  function handleSave() {
    onSave(nodes);
  }
</script>

<!-- ❌ WRONG - Svelte 4 syntax -->
<script>
  export let workflow;
  export let onSave;
  let nodes = workflow?.definition?.nodes || [];
  $: isValid = nodes.length > 0;
</script>
```

### Key Svelte 5 Patterns

1. **Use `$props()` for component props** - Not `export let`
2. **Use `$state()` for reactive state** - Not plain `let` for reactive values
3. **Use `$derived()` for computed values** - Not `$:` reactive statements
4. **Use `$effect()` for side effects** - Not `$:` for side effects
5. **Use `bind:` for two-way binding** - `bind:value={variable}`

## Database Patterns

### Supabase Client Usage

```javascript
// ✅ CORRECT - Proper error handling and RLS
export async function createWorkflow(projectId, userId, workflowData) {
  const supabase = createServerSupabaseClient(event);
  
  const { data, error } = await supabase
    .from('workflow_definitions')
    .insert({
      project_id: projectId,
      user_id: userId,
      slug: workflowData.slug,
      name: workflowData.name,
      version: 1,
      definition: workflowData.definition,
      status: 'draft'
    })
    .select()
    .single();
    
  if (error) {
    throw new Error(`Failed to create workflow: ${error.message}`);
  }
  
  return data;
}
```

### Version Management

When publishing workflows, always increment the version:

```javascript
// Get max version for workflow slug
const { data: maxVersionData } = await supabase
  .from('workflow_definitions')
  .select('version')
  .eq('project_id', projectId)
  .eq('slug', slug)
  .order('version', { ascending: false })
  .limit(1)
  .single();

const newVersion = (maxVersionData?.version || 0) + 1;

// Create new version entry
await supabase
  .from('workflow_definitions')
  .insert({
    ...workflowData,
    version: newVersion,
    status: 'published'
  });
```

## API Endpoint Patterns

### SvelteKit Server Routes

```javascript
// apps/web/src/routes/api/workflows/[id]/+server.js

/**
 * GET /api/workflows/[id] - Get a specific workflow
 */
export async function GET(event) {
  const supabase = createServerSupabaseClient(event);
  const { id } = event.params;
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { data, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') {
        return json({ error: 'Workflow not found' }, { status: 404 });
      }
      throw error;
    }
    
    return json({ workflow: data });
  } catch (error) {
    console.error('Error fetching workflow:', error);
    return json({ error: error.message }, { status: 500 });
  }
}
```

## Testing Guidelines

### Test Structure (Mocha + Chai)

```javascript
// src/nodes/transform.test.js
import { expect } from 'chai';
import { transformNode } from './transform.js';

describe('transformNode', () => {
  it('should transform data using JMESPath expression', () => {
    const input = {
      data: { items: [{ id: 1, name: 'Test' }] }
    };
    const config = {
      expression: 'data.items[0].name'
    };
    
    const result = transformNode(input, config);
    
    expect(result).to.equal('Test');
  });
  
  it('should handle invalid expressions gracefully', () => {
    const input = { data: {} };
    const config = { expression: 'invalid..expression' };
    
    expect(() => transformNode(input, config)).to.throw();
  });
});
```

## File Organization

```
meshhook/
├── apps/
│   └── web/                    # SvelteKit frontend
│       ├── src/
│       │   ├── lib/
│       │   │   ├── components/ # Svelte components
│       │   │   └── utils/      # Utility functions
│       │   └── routes/         # SvelteKit routes
│       └── static/
├── packages/
│   ├── cli/                    # CLI tool
│   └── shared/                 # Shared utilities
├── src/
│   ├── nodes/                  # Node implementations
│   ├── queue/                  # Queue service
│   └── workers/                # Background workers
├── scripts/                    # Build/deployment scripts
├── supabase/
│   └── migrations/             # Database migrations
└── docs/                       # Documentation
```

## Common Patterns

### Workflow Node Structure

```javascript
export const nodeDefinition = {
  type: 'httpCall',
  label: 'HTTP Call',
  description: 'Make an HTTP request',
  inputs: ['trigger'],
  outputs: ['success', 'error'],
  config: {
    url: { type: 'string', required: true },
    method: { type: 'select', options: ['GET', 'POST', 'PUT', 'DELETE'] },
    headers: { type: 'object' },
    body: { type: 'object' }
  }
};

export async function execute(input, config) {
  const { url, method, headers, body } = config;
  
  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
    
    const data = await response.json();
    
    return {
      output: 'success',
      data
    };
  } catch (error) {
    return {
      output: 'error',
      error: error.message
    };
  }
}
```

## Security Considerations

1. **Always use RLS policies** - Never bypass Row Level Security
2. **Validate user input** - Sanitize and validate all user-provided data
3. **Use parameterized queries** - Prevent SQL injection
4. **Mask secrets in logs** - Never log sensitive data
5. **Verify webhook signatures** - Validate incoming webhook requests

## Performance Guidelines

1. **Use indexes** - Add indexes for frequently queried columns
2. **Batch operations** - Use bulk inserts/updates when possible
3. **Implement pagination** - Limit query results
4. **Cache when appropriate** - Use caching for expensive operations
5. **Monitor query performance** - Use `EXPLAIN ANALYZE` for slow queries

## Documentation Standards

### Function Documentation

```javascript
/**
 * Process a workflow run by executing nodes in topological order
 * 
 * @param {string} runId - The workflow run ID
 * @param {Object} context - Execution context with initial data
 * @returns {Promise<Object>} Run result with status and output
 * @throws {Error} If workflow execution fails
 */
export async function processWorkflowRun(runId, context) {
  // Implementation
}
```

## Commit Message Format

```
feat: add webhook signature verification
fix: resolve node configuration modal not opening
docs: update API documentation for workflows
refactor: simplify queue service error handling
test: add integration tests for workflow execution
```

## When in Doubt

1. **Check existing code** - Look for similar patterns in the codebase
2. **Refer to docs/** - Check project documentation
3. **Follow conventions** - Maintain consistency with existing code
4. **Ask for clarification** - Better to ask than assume

## Prohibited Patterns

❌ **Never use:**
- TypeScript syntax
- CommonJS (`require`, `module.exports`)
- `npm` or `yarn` (use `pnpm`)
- Svelte 4 syntax (`export let`, `$:` for effects)
- Inline styles or CSS-in-JS
- Global state management libraries (use Svelte stores if needed)
- Synchronous file operations in request handlers
- Hardcoded credentials or secrets

## Helpful Commands

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Run tests
pnpm test

# Run linter
pnpm lint

# Format code
pnpm format

# Database migrations
pnpm db:migrate

# Generate PRDs for GitHub issues
node scripts/generate-issue-prds.mjs --use-ai --diagrams --force