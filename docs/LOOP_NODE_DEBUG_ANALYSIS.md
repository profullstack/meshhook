# Loop Node Debug Analysis

## Current State

**Workflow**: HTTP → Branch → Loop

**Problem**: 
- Input panel is blank
- Output throws error: "Loop expression must return an array, got null"

## Data Flow Analysis

### 1. When You Click "Execute" Button

```
+page.svelte: handleExecuteWorkflow(loop-node-id)
  ↓
Builds execution path: [HTTP node, Branch node, Loop node]
  ↓
Executes HTTP node:
  - Calls /api/test-http
  - Gets response: {status, headers, data: {data: [...]}, timing}
  - Sets lastOutput = HTTP response
  - Updates HTTP node: testResult = HTTP response ✅
  ↓
Executes Branch node:
  - NEW: Pass-through logic added
  - Sets branch node: testResult = lastOutput (HTTP response) ✅
  - lastOutput unchanged (still HTTP response)
  ↓
Executes Loop node:
  - Calls /api/test-loop with input = lastOutput (HTTP response)
  - Loop extracts array: [item1, item2]
  - Sets loop node: testResult = loopInput (HTTP response) ✅
  - Sets loop node: loopOutput = extracted array
  - lastOutput = extracted array (for next node)
  ↓
Returns: {success: true, output: extracted array}
  ↓
handleExecuteWorkflow in ThreePanelModal:
  - REMOVED: refreshedOutput = result.output
  - Just sets hasExecutedPreviousNode = true
```

### 2. When Modal Opens for Loop Node

```
+page.svelte: handleNodeClick(loop-node)
  ↓
Calls getPreviousNodeOutput(loop-node)
  ↓
Finds previous node: Branch node
  ↓
Checks: branch.data.testResult?
  - If YES: returns branch.data.testResult (should be HTTP response)
  - If NO: returns {} ← THIS IS THE PROBLEM
  ↓
Sets previousNodeOutput = result
  ↓
Opens modal with previousNodeOutput
```

### 3. In ThreePanelModal

```
$effect watches: refreshedOutput, previousNodeOutput
  ↓
currentPreviousOutput = refreshedOutput || previousNodeOutput || {}
  ↓
If array detected: THROW ERROR
  ↓
Otherwise: currentPreviousOutput = the value
```

### 4. When You Click "Test Expression"

```
handleTest() called
  ↓
Calls testLoop(config, currentPreviousOutput)
  ↓
testLoop sends to /api/test-loop
  ↓
Loop node executes JMESPath on input
  ↓
Returns result
```

## The Issue

The logs show:
```
Previous node has testResult? false
No testResult, returning empty
```

This means the **branch node doesn't have a testResult** when the modal opens.

## Why Branch Node Has No testResult

Possible reasons:
1. **Workflow not executed yet** - You haven't clicked "Execute" before opening the loop modal
2. **Branch node testResult not persisting** - The update in handleExecuteWorkflow isn't saving
3. **Modal opening before execution completes** - Race condition
4. **Node state not reactive** - The nodes array update isn't triggering re-render

## Solution

The branch node needs to have its testResult set BEFORE you open the loop modal. This happens when you click "Execute" in the loop modal.

But the logs show the branch node has `testResult: false`, which means either:
- The execution hasn't run yet
- The execution ran but didn't update the branch node
- The update happened but got lost

## Next Steps

1. Add logging to `handleExecuteWorkflow` to confirm branch node is being updated
2. Add logging to `getPreviousNodeOutput` to show the actual branch node data
3. Check if the nodes array is being updated correctly