# Loop Container Execute Button Fix

## Problem Statement

The Execute button in node modals had unpredictable behavior when working with loop containers:

- **First click**: Executed parent loop to get data
- **Subsequent clicks**: Executed child node with loop data
- **Result**: Users didn't know what would happen when they clicked

This caused issues like:
- Webhook sends `{{street}}, {{city}}` (raw template) when executed without loop context
- Users couldn't reliably test their configurations
- Confusing UX with no clear indication of what the button would do

## Solution

Replaced the single "Execute" button with **two clear buttons** that make the action explicit:

### For Loop Container Modal:
- **"▶ Execute Previous Node"** - Runs the node before the loop to get fresh input data
- **"🔄 Execute Loop"** - Runs the loop with current input to extract array

### For Child Node Modals (nodes inside loop):
- **"▶ Execute Parent Loop"** - Runs the parent loop to get fresh loop data
- **"🧪 Test with Loop Data"** - Tests this node with first item from current loop output

## Implementation Details

### 1. ThreePanelModal.svelte

Added two new props to support dual button modes:
- `isLoopContainer` - Set to `true` for loop nodes themselves
- `isInsideLoop` - Set to `true` for nodes inside a loop container

Added derived button labels that change based on context:
```javascript
const executeButtonLabel = $derived(() => {
  if (isLoopContainer) {
    return executingWorkflow ? 'Executing...' : '▶ Execute Previous Node';
  } else if (isInsideLoop) {
    return executingWorkflow ? 'Executing...' : '▶ Execute Parent Loop';
  }
  return executingWorkflow ? 'Executing...' : '▶️ Execute';
});

const testButtonLabel = $derived(() => {
  if (isLoopContainer) {
    return '🔄 Execute Loop';
  } else if (isInsideLoop) {
    return '🧪 Test with Loop Data';
  }
  return '🧪 Test';
});
```

Updated the Input panel header to show the appropriate button with contextual tooltips.

### 2. LoopNodeModal.svelte

Updated to pass `isLoopContainer={true}` to ThreePanelModal:
```svelte
<ThreePanelModal
  {node}
  {onSave}
  {onCancel}
  {previousNodeOutput}
  {previousNode}
  {onRefreshPreviousNode}
  {onExecuteWorkflow}
  inputRequired={true}
  showInputPanel={true}
  showOutputPanel={true}
  testFunction={testLoop}
  isLoopContainer={true}
>
```

Updated the test button to use the dynamic label from context:
```svelte
<button class="btn-test" onclick={ctx.onTest} disabled={ctx.testingOutput || !config.items}>
  {#if ctx.testingOutput}
    <span class="spinner-small"></span>
    Testing...
  {:else}
    {ctx.testButtonLabel}
  {/if}
</button>
```

### 3. Child Node Modals

Updated all child node modals to accept and pass through the `isInsideLoop` prop:

**WebhookModal.svelte:**
```svelte
let {
  node,
  onSave,
  onCancel,
  previousNodeOutput = {},
  previousNode = null,
  onRefreshPreviousNode = null,
  onExecuteWorkflow = null,
  isInsideLoop = false  // Will be set by parent when node is inside a loop
} = $props();

<ThreePanelModal
  ...
  {isInsideLoop}
>
```

**HttpCallModal.svelte, TransformNodeModal.svelte, XmlJsonTransformModal.svelte:**
- Added `isInsideLoop = false` prop
- Passed it through to ThreePanelModal

### 4. NodeConfigModal.svelte

Updated to determine if a node is inside a loop and pass the prop to child modals:

```svelte
let { 
  node, 
  onSave, 
  onCancel, 
  previousNodeOutput = {}, 
  previousNode = null, 
  onRefreshPreviousNode = null, 
  onExecuteWorkflow = null,
  parentNode = null  // The parent container node (e.g., loop)
} = $props();

// Determine if this node is inside a loop container
const isInsideLoop = $derived(parentNode?.data?.type === 'loop');
```

Then passes `{isInsideLoop}` to all child modal components.

## Benefits

1. **Clear User Intent**: Users now know exactly what will happen when they click a button
2. **Prevents Errors**: No more accidentally sending raw templates like `{{street}}, {{city}}`
3. **Better Testing**: Users can test nodes with proper loop context
4. **Consistent UX**: Same pattern across all node types

## Testing Checklist

- [ ] Loop container modal shows "▶ Execute Previous Node" and "🔄 Execute Loop"
- [ ] Child nodes inside loop show "▶ Execute Parent Loop" and "🧪 Test with Loop Data"
- [ ] Regular nodes (not in loop) show standard "▶️ Execute" and "🧪 Test" buttons
- [ ] Tooltips provide clear explanations of what each button does
- [ ] Buttons are properly disabled during execution
- [ ] Loop execution properly extracts array items
- [ ] Child node testing uses first item from loop data

## Files Modified

1. `apps/web/src/lib/components/ThreePanelModal.svelte` - Added dual button mode support
2. `apps/web/src/lib/components/LoopNodeModal.svelte` - Set isLoopContainer flag
3. `apps/web/src/lib/components/WebhookModal.svelte` - Added isInsideLoop prop
4. `apps/web/src/lib/components/HttpCallModal.svelte` - Added isInsideLoop prop
5. `apps/web/src/lib/components/TransformNodeModal.svelte` - Added isInsideLoop prop
6. `apps/web/src/lib/components/XmlJsonTransformModal.svelte` - Added isInsideLoop prop
7. `apps/web/src/lib/components/NodeConfigModal.svelte` - Detect and pass isInsideLoop

## Future Enhancements

- Add visual indicators (icons/colors) to distinguish button types
- Show preview of what data will be used before execution
- Add keyboard shortcuts for common actions
- Consider adding a "Test All Items" option for child nodes to test with multiple loop items