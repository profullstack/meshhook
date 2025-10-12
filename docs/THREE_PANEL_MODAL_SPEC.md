# Three-Panel Modal UI Specification

## Overview

This document specifies the implementation of a DRY (Don't Repeat Yourself) three-panel modal system for MeshHook workflow nodes, providing an n8n-style user experience with input/output visualization and template variable support.

## Architecture

### Component Hierarchy

```
ThreePanelModal.svelte (Base Component)
├── HttpCallModal.svelte (HTTP-specific)
├── WebhookModal.svelte (Webhook-specific)
└── TransformNodeModal.svelte (Refactored to use base)
```

## 1. ThreePanelModal.svelte (Base Component)

### Purpose
Reusable base component providing the three-panel layout and shared functionality for all node types that need input/output visualization.

### Props
```javascript
{
  node: Object,              // Node configuration
  onSave: Function,          // Save callback
  onCancel: Function,        // Cancel callback
  previousNodeOutput: Object, // Input data from previous node
  previousNode: Object,      // Previous node reference
  onRefreshPreviousNode: Function, // Refresh callback
  inputRequired: Boolean,    // Whether input is required (default: false)
  showInputPanel: Boolean,   // Whether to show input panel (default: true)
  showOutputPanel: Boolean,  // Whether to show output panel (default: true)
  testFunction: Function,    // Custom test function for output preview
  outputComponent: Component // Custom output component (optional)
}
```

### Layout Structure
```
┌─────────────────────────────────────────────────────────────┐
│                     Modal Overlay                            │
│  ┌──────────┬─────────────────────┬──────────────────────┐ │
│  │  Input   │   Configuration     │      Output          │ │
│  │  Panel   │      Modal          │      Panel           │ │
│  │ (350px)  │     (flexible)      │     (350px)          │ │
│  │          │                     │                      │ │
│  │ Schema   │  ┌───────────────┐  │   Preview/JSON      │ │
│  │ Table    │  │ Node Config   │  │                      │ │
│  │ JSON     │  │ Form Fields   │  │   Test Results      │ │
│  │          │  │               │  │                      │ │
│  │ Variable │  │ [Save/Cancel] │  │                      │ │
│  │ Picker   │  └───────────────┘  │                      │ │
│  └──────────┴─────────────────────┴──────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Shared Functionality

#### Input Panel Features
- **Tab System**: Schema / Table / JSON views
- **Schema View**: 
  - Hierarchical tree structure
  - Expandable/collapsible nodes
  - Type icons (📝 string, 🔢 number, ✓ boolean, 📋 array, 📦 object)
  - Click to insert variable
  - Drag-and-drop support
- **Table View**: Flattened key-value pairs
- **JSON View**: Raw JSON display
- **Execute Previous Node**: Button to refresh input data
- **Empty States**: Helpful prompts when no data available

#### Shared Utilities
```javascript
// Schema extraction
function extractSchemaTree(obj, prefix = '', level = 0)

// Path-based value retrieval
function getValueByPath(obj, path)

// Table data conversion
function dataToTable(obj)

// Variable insertion
function insertVariable(path, targetFieldId)

// Type icon mapping
function getTypeIcon(type)

// Expand/collapse management
function toggleExpand(path)
```

#### Output Panel Features
- **Tab System**: Preview / JSON views (configurable)
- **Custom Output Component**: Slot for specialized output rendering
- **Empty States**: Prompts to test/execute

### Slots
```svelte
<slot name="config">
  <!-- Node-specific configuration form -->
</slot>

<slot name="output" let:testResult>
  <!-- Custom output rendering (optional) -->
</slot>

<slot name="footer-left">
  <!-- Additional footer buttons (e.g., Test button) -->
</slot>
```

### Styling
- Consistent with existing TransformNodeModal
- Responsive grid layout
- Smooth transitions
- Accessible (ARIA labels, keyboard navigation)

## 2. HttpCallModal.svelte

### Purpose
HTTP-specific configuration modal using ThreePanelModal base.

### Unique Features
- HTTP method selector (GET, POST, PUT, DELETE, PATCH)
- URL field with template support
- Headers editor (JSON)
- Body editor (JSON) with template support
- Query parameters support
- Timeout configuration
- Test Request button
- Response viewer in output panel

### Configuration Form Fields
```javascript
[
  { id: 'url', label: 'URL', type: 'text', required: true, 
    placeholder: 'https://api.example.com/users/{{userId}}',
    helpText: 'Use {{variable}} syntax' },
  { id: 'method', label: 'Method', type: 'select', required: true,
    options: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
  { id: 'headers', label: 'Headers (JSON)', type: 'textarea',
    placeholder: '{"Authorization": "Bearer {{token}}"}' },
  { id: 'body', label: 'Body (JSON)', type: 'textarea',
    placeholder: '{"name": "{{user.name}}"}',
    helpText: 'Leave empty to use input directly' },
  { id: 'timeout', label: 'Timeout (ms)', type: 'number',
    placeholder: '30000' }
]
```

### Test Function
```javascript
async function testHttpCall(config) {
  const response = await fetch('/api/test-http', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  });
  return await response.json();
}
```

### Output Component
Uses `HttpResponseViewer.svelte` to display:
- Response status and headers
- Response body (formatted JSON or text)
- Request details
- Error messages

## 3. WebhookModal.svelte

### Purpose
Webhook-specific configuration modal using ThreePanelModal base.

### Unique Features
- Webhook type selector (incoming/outgoing)
- Input required for outgoing webhooks
- URL field with template support
- HTTP method selector (POST, PUT, PATCH)
- Headers editor with template support
- Body template editor
- Webhook-specific validation

### Configuration Form Fields
```javascript
[
  { id: 'webhookType', label: 'Webhook Type', type: 'select', required: true,
    options: ['incoming', 'outgoing'] },
  { id: 'url', label: 'Webhook URL', type: 'text', required: true,
    placeholder: 'https://api.example.com/webhook/{{webhookId}}' },
  { id: 'method', label: 'HTTP Method', type: 'select', required: true,
    options: ['POST', 'PUT', 'PATCH'] },
  { id: 'headers', label: 'Headers (JSON)', type: 'textarea',
    placeholder: '{"Authorization": "Bearer {{token}}"}' },
  { id: 'bodyTemplate', label: 'Body Template', type: 'textarea', required: true,
    placeholder: '{\n  "title": "{{title}}",\n  "user": "{{user.name}}"\n}',
    rows: 8 }
]
```

### Input Panel Behavior
- **Outgoing Webhooks**: Input panel shown, input optional
- **Incoming Webhooks**: Input panel hidden or shows sample webhook payload

## 4. TransformNodeModal.svelte (Refactored)

### Changes Required
- Extract shared logic into ThreePanelModal
- Keep transform-specific template editor
- Maintain existing functionality
- Reduce code duplication by ~60%

### Unique Features to Retain
- Template editor with syntax highlighting
- Real-time output preview
- Template syntax help

## Implementation Plan

### Phase 1: Base Component (Priority: High)
1. Create `ThreePanelModal.svelte`
2. Extract shared utilities from `TransformNodeModal.svelte`
3. Implement input panel with all views
4. Implement output panel structure
5. Add slot system for customization

### Phase 2: HTTP Call Modal (Priority: High)
1. Create `HttpCallModal.svelte`
2. Implement HTTP-specific form
3. Add test functionality
4. Integrate with `HttpResponseViewer`
5. Update routing in `NodeConfigModal.svelte`

### Phase 3: Webhook Modal (Priority: Medium)
1. Create `WebhookModal.svelte`
2. Implement webhook-specific form
3. Add webhook type logic
4. Handle input required/optional
5. Update routing in `NodeConfigModal.svelte`

### Phase 4: Refactor Transform (Priority: Low)
1. Refactor `TransformNodeModal.svelte` to use `ThreePanelModal`
2. Test existing functionality
3. Remove duplicated code

## File Structure

```
apps/web/src/lib/components/
├── ThreePanelModal.svelte          (~800 lines) [NEW]
├── HttpCallModal.svelte            (~300 lines) [NEW]
├── WebhookModal.svelte             (~300 lines) [NEW]
├── TransformNodeModal.svelte       (~600 lines) [REFACTOR from ~1179]
├── NodeConfigModal.svelte          [UPDATE routing]
└── HttpResponseViewer.svelte       [EXISTING]
```

## Routing Logic Update

### NodeConfigModal.svelte
```svelte
<script>
  import HttpCallModal from './HttpCallModal.svelte';
  import WebhookModal from './WebhookModal.svelte';
  import TransformNodeModal from './TransformNodeModal.svelte';
  
  // ... existing code ...
</script>

{#if editedNode.data?.type === 'httpCall'}
  <HttpCallModal
    {node}
    {onSave}
    {onCancel}
    {previousNodeOutput}
    {previousNode}
    {onRefreshPreviousNode}
  />
{:else if editedNode.data?.type === 'webhook'}
  <WebhookModal
    {node}
    {onSave}
    {onCancel}
    {previousNodeOutput}
    {previousNode}
    {onRefreshPreviousNode}
  />
{:else if editedNode.data?.type === 'transform'}
  <TransformNodeModal
    {node}
    {onSave}
    {onCancel}
    {previousNodeOutput}
    {previousNode}
    {onRefreshPreviousNode}
  />
{:else}
  <!-- Standard modal for other node types -->
  <div class="modal-overlay">
    <!-- ... existing standard modal code ... -->
  </div>
{/if}
```

## Testing Strategy

### Unit Tests
- Test shared utilities in isolation
- Test variable insertion logic
- Test schema extraction
- Test path-based value retrieval

### Integration Tests
- Test each modal with mock data
- Test routing logic
- Test save/cancel flows
- Test input/output data flow

### E2E Tests
- Test complete workflow creation
- Test variable insertion from input panel
- Test output preview updates
- Test node execution

## Performance Considerations

1. **Lazy Loading**: Load modals only when needed
2. **Memoization**: Cache schema extraction results
3. **Virtual Scrolling**: For large input datasets
4. **Debouncing**: For real-time output preview
5. **Code Splitting**: Separate modal bundles

## Accessibility

1. **Keyboard Navigation**: Full keyboard support
2. **ARIA Labels**: Proper labeling for screen readers
3. **Focus Management**: Trap focus in modal
4. **Color Contrast**: WCAG AA compliance
5. **Error Messages**: Clear, actionable error text

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile: iOS Safari, Chrome Android

## Estimated Effort

- **ThreePanelModal**: 2-3 days
- **HttpCallModal**: 1 day
- **WebhookModal**: 1 day
- **Transform Refactor**: 1 day
- **Testing & Polish**: 1-2 days
- **Total**: 6-8 days

## Success Criteria

1. ✅ All three modals use shared base component
2. ✅ Code duplication reduced by >60%
3. ✅ Consistent UX across all node types
4. ✅ Input/output visualization working
5. ✅ Variable insertion functional
6. ✅ Test functionality working
7. ✅ All existing features preserved
8. ✅ Performance acceptable (<100ms render)
9. ✅ Accessibility requirements met
10. ✅ All tests passing

## Future Enhancements

1. **Variable Autocomplete**: Suggest variables as you type
2. **Template Validation**: Real-time template syntax checking
3. **Output Diff View**: Compare before/after
4. **History**: Undo/redo for configuration changes
5. **Favorites**: Save commonly used templates
6. **Export/Import**: Share configurations