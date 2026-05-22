# Loop Container Node - Architecture Design

## Problem Statement

The current loop node cannot properly execute child nodes in a loop because it's designed as a single node that extracts an array, with no way to define which downstream nodes should execute per-item vs. once after the loop.

## Solution: Loop Container Node

Redesign the loop node as a **visual container** (swimlane) that can contain child nodes, similar to how n8n or other workflow tools handle loops.

## Visual Design

```
┌─────────────────────────────────────────────┐
│ Loop: data.data[*]                    [⚙️]  │
│ ┌─────────────────────────────────────────┐ │
│ │                                         │ │
│ │  [Webhook]  →  [Transform]  →  [HTTP]  │ │
│ │                                         │ │
│ │  (Drag nodes here to add to loop)      │ │
│ │                                         │ │
│ └─────────────────────────────────────────┘ │
│ Output: Array of results                    │
└─────────────────────────────────────────────┘
```

## Data Structure

### Loop Node
```javascript
{
  id: 'loop-123',
  type: 'loop',
  position: { x: 100, y: 100 },
  data: {
    label: 'Loop over items',
    type: 'loop',
    config: {
      items: 'data.data[*]',  // JMESPath expression
      description: 'Loop description'
    },
    // NEW: Container properties
    isContainer: true,
    childNodes: ['node-1', 'node-2', 'node-3'],  // IDs of nodes inside loop
    dimensions: { width: 600, height: 400 }  // Container size
  }
}
```

### Child Nodes
```javascript
{
  id: 'node-1',
  type: 'webhook',
  position: { x: 120, y: 150 },  // Relative to canvas, not container
  data: {
    parentContainer: 'loop-123',  // Reference to parent loop
    ...
  }
}
```

## UX Interactions

### 1. Adding Loop Node
- Drag "Loop" from palette → Appears as large container box
- Default size: 600x400px
- Shows placeholder text: "Drag nodes here"

### 2. Adding Nodes to Loop
- **Drag from palette** → Drop inside loop container → Node added to `childNodes`
- **Drag existing node** → Drop inside loop → Node moved to `childNodes`, position updated
- Visual feedback: Container highlights when dragging over it

### 3. Removing Nodes from Loop
- **Drag node out** → Removed from `childNodes`, `parentContainer` cleared
- **Delete node** → Removed from `childNodes` array

### 4. Resizing Loop Container
- Drag handles on corners/edges
- Auto-resize to fit child nodes
- Minimum size: 400x300px

### 5. Connecting Nodes
- **Into loop**: Edge connects to loop container (becomes input to first child node)
- **Out of loop**: Edge from loop container (receives aggregated results)
- **Inside loop**: Normal edges between child nodes

## Execution Flow

### Testing (Modal)
```
1. User configures loop expression: data.data[*]
2. User clicks "Test Expression"
3. Loop extracts array: [item1, item2, item3]
4. Preview shows:
   - Input: Full HTTP response
   - Output: "Will execute 3 times with items: [preview of item1]"
5. Does NOT actually execute child nodes
```

### Workflow Execution
```
1. Loop node receives input (HTTP response)
2. Extracts array using JMESPath: [item1, item2, item3]
3. For each item:
   a. Set item as input to first child node
   b. Execute all child nodes in sequence
   c. Collect output from last child node
4. Aggregate all outputs: [result1, result2, result3]
5. Pass aggregated results to next node after loop
```

## React Flow Implementation

### Custom Node Type
```javascript
// LoopContainerNode.svelte
- Renders as large box with border
- Shows loop expression at top
- Renders child nodes inside
- Handles drop events for adding nodes
- Provides resize handles
```

### Node Positioning
- Child nodes have absolute positions on canvas
- Loop container has position + dimensions
- Check if node position is within container bounds
- Visual grouping with background color/border

### Edge Handling
- Edges to loop container → Connect to loop input
- Edges from loop container → Connect from loop output
- Edges between child nodes → Normal internal connections
- Validate: No edges from inside loop to outside (except via loop output)

## Data Model Changes

### Nodes Array
```javascript
nodes = [
  {
    id: 'loop-1',
    type: 'loop',
    data: {
      isContainer: true,
      childNodes: ['webhook-1', 'transform-1'],
      dimensions: { width: 600, height: 400 }
    }
  },
  {
    id: 'webhook-1',
    type: 'webhook',
    data: {
      parentContainer: 'loop-1'
    }
  }
]
```

### Edges Array
```javascript
edges = [
  { source: 'http-1', target: 'loop-1' },  // Into loop
  { source: 'loop-1', target: 'output-1' },  // Out of loop
  { source: 'webhook-1', target: 'transform-1' }  // Inside loop
]
```

## Migration Strategy

### Phase 1: Add Container Support (This Task)
- [ ] Update loop node data structure to support `childNodes`
- [ ] Create LoopContainerNode custom React Flow node
- [ ] Implement drag-and-drop to add nodes to container
- [ ] Update edge validation for container nodes
- [ ] Update execution logic to handle loop scope

### Phase 2: Visual Polish
- [ ] Add resize handles
- [ ] Auto-layout child nodes
- [ ] Visual grouping/highlighting
- [ ] Collapse/expand container

### Phase 3: Advanced Features
- [ ] Nested loops (loop inside loop)
- [ ] Parallel execution option
- [ ] Break/continue logic
- [ ] Result aggregation options

## Open Questions

1. **How to handle existing loop nodes?** 
   - Auto-migrate to container format?
   - Show migration prompt?
   - Support both formats temporarily?

2. **What if user connects edge from inside loop to outside?**
   - Block it with validation error?
   - Allow but show warning?
   - Auto-create loop output edge?

3. **How to show loop iteration count in UI?**
   - Badge on container showing "3 iterations"?
   - Progress indicator during execution?
   - Execution history per iteration?

4. **Should loop have multiple outputs?**
   - One output with aggregated array?
   - Separate outputs for success/failure?
   - Output per iteration?