# Loop Container - User Guide

## How to Use Loop Containers

### Step 1: Add a Loop Container to Your Workflow

1. Open the workflow editor
2. Drag the "Loop" node from the palette onto the canvas
3. A large container box will appear (600x400px)
4. The container shows:
   - Header with loop icon and expression
   - Empty state: "Drag nodes here to add to loop"
   - Footer: "Output: Array of results"

### Step 2: Add Nodes to the Loop Container

1. Drag a node from the palette (e.g., Webhook, Transform, HTTP Call)
2. Drop it **inside** the loop container box
3. The node should appear inside the container
4. The container's child count badge will update

**Troubleshooting:**
- Make sure you're dropping the node inside the container's bounds
- Check browser console for "=== Node Drop ===" logs
- If logs don't appear, the drop event isn't firing

### Step 3: Configure the Loop Expression

1. Click on the loop container to open its configuration modal
2. Enter a JMESPath expression (e.g., `data.data[*]`)
3. Click "Test Expression" to preview the array extraction
4. Save the configuration

### Step 4: Connect the Workflow

1. Connect an HTTP node (or other data source) to the loop container's **input** (top handle)
2. Connect the loop container's **output** (bottom handle) to the next node
3. Child nodes inside the container can be connected to each other

### Step 5: Execute the Workflow

1. Click "Execute" button in the loop container's modal
2. The workflow will:
   - Execute HTTP node → get data
   - Execute branch node → pass through data
   - Execute loop container:
     - Extract array using JMESPath
     - For each item in array:
       - Execute child nodes in sequence
       - Collect result
     - Return array of all results
   - Pass results to next node

## Example Workflow

```
HTTP Call (fetch addresses)
  ↓
Branch (conditional logic)
  ↓
Loop Container [data.data[*]]
  ├─ Webhook (send each address)
  └─ Transform (format response)
  ↓
Output (aggregated results)
```

## Current Limitations

1. **Drag-and-drop may not work** - This is being debugged
2. **No visual feedback** - Child nodes don't show inside container visually
3. **No resize handles** - Container size is fixed
4. **No nested containers** - Containers can't contain other containers

## Workaround for Testing

Since drag-and-drop isn't working yet, you can manually edit the workflow JSON to add child nodes:

1. Save the workflow
2. Edit the database directly or use the API
3. Add `childNodes: ['node-id-1', 'node-id-2']` to the loop container's data
4. Add `parentContainer: 'loop-container-id'` to each child node's data
5. Reload the workflow

## Next Steps

The development team is working on:
- Fixing drag-and-drop functionality
- Adding visual rendering of child nodes inside containers
- Implementing resize handles
- Improving UX feedback