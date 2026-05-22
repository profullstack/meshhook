# Loop Container Node - Data Structure Specification

## Overview

This document defines the data structures for the loop container node architecture, which transforms the loop node from a simple array extractor into a visual container that can hold and execute child nodes iteratively.

## Core Data Structures

### 1. Loop Container Node

A loop container node is a special node type that acts as a visual container (swimlane) for other nodes.

```javascript
{
  id: 'loop-123',                    // Unique node identifier
  type: 'loopContainer',             // Node type identifier
  position: { x: 100, y: 100 },      // Canvas position
  data: {
    label: 'Loop over items',        // Display label
    type: 'loop',                    // Internal type for backend
    config: {
      items: 'data.items[*]',        // JMESPath expression to extract array
      description: 'Process each item' // Optional description
    },
    // Container-specific properties
    isContainer: true,               // Flag indicating this is a container
    childNodes: [                    // Array of child node IDs
      'node-1',
      'node-2',
      'node-3'
    ],
    dimensions: {                    // Container size
      width: 600,
      height: 400
    },
    style: {                         // Visual styling
      backgroundColor: '#f0f4f8',
      borderColor: '#4075a6',
      borderWidth: 2
    }
  }
}
```

### 2. Child Node (Inside Container)

Nodes inside a container have a reference to their parent container.

```javascript
{
  id: 'node-1',                      // Unique node identifier
  type: 'webhook',                   // Node type (webhook, transform, http, etc.)
  position: { x: 150, y: 200 },      // Absolute canvas position
  data: {
    label: 'Webhook Trigger',
    type: 'webhook',
    config: { /* node-specific config */ },
    // Container relationship
    parentContainer: 'loop-123',     // Reference to parent loop container
    containerPosition: {             // Position relative to container (optional)
      x: 50,
      y: 100
    }
  }
}
```

### 3. Edge Connections

Edges can connect to/from containers or between nodes inside containers.

```javascript
// Edge connecting TO a loop container (becomes input to loop)
{
  id: 'edge-1',
  source: 'http-1',                  // Source node outside container
  target: 'loop-123',                // Target is the container itself
  type: 'smoothstep',
  animated: true
}

// Edge connecting FROM a loop container (receives aggregated results)
{
  id: 'edge-2',
  source: 'loop-123',                // Source is the container
  target: 'output-1',                // Target node outside container
  type: 'smoothstep',
  animated: true
}

// Edge between nodes INSIDE a container
{
  id: 'edge-3',
  source: 'node-1',                  // Source node inside container
  target: 'node-2',                  // Target node inside container
  type: 'smoothstep',
  animated: true,
  data: {
    parentContainer: 'loop-123'      // Optional: track container relationship
  }
}
```

## Workflow Definition Structure

The complete workflow definition includes nodes and edges arrays:

```javascript
{
  nodes: [
    {
      id: 'http-1',
      type: 'http',
      position: { x: 50, y: 100 },
      data: { /* ... */ }
    },
    {
      id: 'loop-123',
      type: 'loopContainer',
      position: { x: 300, y: 100 },
      data: {
        isContainer: true,
        childNodes: ['transform-1', 'http-2'],
        dimensions: { width: 600, height: 400 },
        config: { items: 'data.items[*]' }
      }
    },
    {
      id: 'transform-1',
      type: 'transform',
      position: { x: 350, y: 200 },
      data: {
        parentContainer: 'loop-123',
        /* ... */
      }
    },
    {
      id: 'http-2',
      type: 'http',
      position: { x: 550, y: 200 },
      data: {
        parentContainer: 'loop-123',
        /* ... */
      }
    },
    {
      id: 'output-1',
      type: 'output',
      position: { x: 1000, y: 100 },
      data: { /* ... */ }
    }
  ],
  edges: [
    { id: 'e1', source: 'http-1', target: 'loop-123' },
    { id: 'e2', source: 'loop-123', target: 'output-1' },
    { id: 'e3', source: 'transform-1', target: 'http-2' }
  ]
}
```

## Execution Context

During workflow execution, the loop container maintains execution context:

```javascript
{
  nodeId: 'loop-123',
  type: 'loop',
  input: {
    // Original input to the loop
    data: {
      items: [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
        { id: 3, name: 'Item 3' }
      ]
    }
  },
  extractedArray: [
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2' },
    { id: 3, name: 'Item 3' }
  ],
  iterations: [
    {
      index: 0,
      item: { id: 1, name: 'Item 1' },
      childExecutions: [
        { nodeId: 'transform-1', output: { /* ... */ } },
        { nodeId: 'http-2', output: { /* ... */ } }
      ],
      result: { /* final output from last child node */ }
    },
    {
      index: 1,
      item: { id: 2, name: 'Item 2' },
      childExecutions: [ /* ... */ ],
      result: { /* ... */ }
    },
    {
      index: 2,
      item: { id: 3, name: 'Item 3' },
      childExecutions: [ /* ... */ ],
      result: { /* ... */ }
    }
  ],
  output: [
    { /* result from iteration 0 */ },
    { /* result from iteration 1 */ },
    { /* result from iteration 2 */ }
  ]
}
```

## Helper Functions

### Check if Node is Inside Container

```javascript
/**
 * Check if a node is inside a container
 * @param {Object} node - Node to check
 * @param {Object} container - Container node
 * @returns {boolean}
 */
function isNodeInContainer(node, container) {
  return node.data?.parentContainer === container.id;
}
```

### Get Container Bounds

```javascript
/**
 * Get the bounding box of a container
 * @param {Object} container - Container node
 * @returns {Object} Bounds { x, y, width, height }
 */
function getContainerBounds(container) {
  return {
    x: container.position.x,
    y: container.position.y,
    width: container.data.dimensions.width,
    height: container.data.dimensions.height
  };
}
```

### Check if Position is Inside Container

```javascript
/**
 * Check if a position is inside a container's bounds
 * @param {Object} position - Position { x, y }
 * @param {Object} container - Container node
 * @returns {boolean}
 */
function isPositionInContainer(position, container) {
  const bounds = getContainerBounds(container);
  return (
    position.x >= bounds.x &&
    position.x <= bounds.x + bounds.width &&
    position.y >= bounds.y &&
    position.y <= bounds.y + bounds.height
  );
}
```

### Get Child Nodes

```javascript
/**
 * Get all child nodes of a container
 * @param {Object} container - Container node
 * @param {Array} allNodes - All nodes in the workflow
 * @returns {Array} Child nodes
 */
function getChildNodes(container, allNodes) {
  const childIds = container.data.childNodes || [];
  return allNodes.filter(node => childIds.includes(node.id));
}
```

### Get Container Execution Order

```javascript
/**
 * Get the execution order of nodes inside a container
 * @param {Object} container - Container node
 * @param {Array} allNodes - All nodes in the workflow
 * @param {Array} allEdges - All edges in the workflow
 * @returns {Array} Ordered array of node IDs
 */
function getContainerExecutionOrder(container, allNodes, allEdges) {
  const childNodes = getChildNodes(container, allNodes);
  const childIds = new Set(childNodes.map(n => n.id));
  
  // Filter edges that are inside the container
  const internalEdges = allEdges.filter(edge =>
    childIds.has(edge.source) && childIds.has(edge.target)
  );
  
  // Topological sort to determine execution order
  return topologicalSort(childNodes, internalEdges);
}
```

## Validation Rules

### Container Validation

1. **Container must have dimensions**: `width > 0 && height > 0`
2. **Container must have valid JMESPath expression**: Expression must compile
3. **Child nodes must exist**: All IDs in `childNodes` must reference existing nodes
4. **No circular containment**: A container cannot contain itself (directly or indirectly)

### Edge Validation

1. **No edges from inside to outside**: Edges cannot go from a child node to a node outside the container (except via container output)
2. **Container input/output**: Only one edge can connect to a container as input, multiple edges can connect from container as output
3. **Internal edges**: Edges between child nodes must form a valid DAG (no cycles)

### Position Validation

1. **Child nodes should be visually inside**: Child node positions should be within container bounds (warning, not error)
2. **Container size**: Container should be large enough to contain all child nodes

## Migration Strategy

### Migrating Existing Loop Nodes

Old loop node structure:
```javascript
{
  id: 'loop-1',
  type: 'loop',
  data: {
    config: { items: 'data[*]' }
  }
}
```

New loop container structure:
```javascript
{
  id: 'loop-1',
  type: 'loopContainer',
  data: {
    isContainer: true,
    childNodes: [],  // Empty initially
    dimensions: { width: 600, height: 400 },
    config: { items: 'data[*]' }
  }
}
```

Migration function:
```javascript
function migrateLoopNode(oldNode) {
  return {
    ...oldNode,
    type: 'loopContainer',
    data: {
      ...oldNode.data,
      isContainer: true,
      childNodes: [],
      dimensions: { width: 600, height: 400 }
    }
  };
}
```

## Database Schema Considerations

The workflow definition is stored as JSONB in the database. No schema changes are required, but we should ensure:

1. **Backward compatibility**: Old workflows with simple loop nodes should still load
2. **Version tracking**: Consider adding a `version` field to track data structure version
3. **Validation on save**: Validate container structure before saving to database

## Summary

This data structure provides:

- **Clear separation** between container and child nodes
- **Flexible positioning** with both absolute and relative coordinates
- **Execution context** tracking for debugging and monitoring
- **Validation rules** to ensure workflow integrity
- **Migration path** from old to new structure
- **Helper functions** for common operations

The structure is designed to be:
- **Extensible**: Easy to add new container types or features
- **Performant**: Efficient lookups and traversals
- **Maintainable**: Clear relationships and well-documented
- **Compatible**: Works with existing SvelteFlow patterns