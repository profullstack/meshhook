# Loading States - Visual Guide

This document describes what users will see when loading states are active in the MeshHook application.

## Component Demonstrations

### 1. LoadingSpinner Component

#### Small Size
```
[16px spinning circular indicator]
```
Used in: LoadingButton component

#### Medium Size (Default)
```
[32px spinning circular indicator]
```
Used in: Inline loading states, LiveLogs component

#### Large Size
```
[48px spinning circular indicator]
```
Used in: Full-screen loading overlays

**Animation**: The spinner consists of a circular SVG that rotates continuously with a smooth easing animation. The stroke animates from a small dash to a larger arc, creating a professional "material design" style loading indicator.

**Colors**: By default, uses the theme's primary color (#4075a6), but can be customized per instance.

---

### 2. LoadingButton Variations

#### Primary Button - Normal State
```
┌─────────────────┐
│  Save Settings  │  ← Blue background, white text
└─────────────────┘
```

#### Primary Button - Loading State
```
┌─────────────────────┐
│ ○  Saving...       │  ← Spinner + text, disabled state
└─────────────────────┘
```

#### Secondary Button - Loading State
```
┌─────────────────────┐
│ ○  Rolling back... │  ← Spinner + text, gray theme
└─────────────────────┘
```

---

## Page-Level Loading States

### 3. Workflows Page - Delete Operation

When a user clicks "Delete" on a workflow:

```
╔══════════════════════════════════════════════╗
║  Semi-transparent dark overlay (50% opacity) ║
║                                              ║
║          ┌──────────────────────┐           ║
║          │                      │           ║
║          │    [Large Spinner]   │  ← White box
║          │                      │           ║
║          │  Deleting workflow...│  ← Message
║          │                      │           ║
║          └──────────────────────┘           ║
║                                              ║
╚══════════════════════════════════════════════╝
```

### 4. Workflows Page - Duplicate Operation

```
╔══════════════════════════════════════════════╗
║  Semi-transparent dark overlay               ║
║                                              ║
║          ┌──────────────────────┐           ║
║          │    [Large Spinner]   │           ║
║          │ Duplicating workflow...│         ║
║          └──────────────────────┘           ║
║                                              ║
╚══════════════════════════════════════════════╝
```

---

### 5. Runs Page - Retry Operation

```
╔══════════════════════════════════════════════╗
║  Semi-transparent dark overlay               ║
║                                              ║
║          ┌──────────────────────┐           ║
║          │    [Large Spinner]   │           ║
║          │   Retrying run...    │           ║
║          └──────────────────────┘           ║
║                                              ║
╚══════════════════════════════════════════════╝
```

---

### 6. LiveLogs Component - Initial Load

**Loading State:**
```
┌─────────────────────────────────────┐
│ Live Logs                           │
│ [Search] [Filter] [Auto-scroll ✓]  │
├─────────────────────────────────────┤
│                                     │
│         [Medium Spinner]            │
│         Loading logs...             │
│                                     │
│                                     │
└─────────────────────────────────────┘
```

**Error State:**
```
┌─────────────────────────────────────┐
│ Live Logs                           │
│ [Search] [Filter] [Auto-scroll ✓]  │
├─────────────────────────────────────┤
│                                     │
│  Failed to load logs: [error msg]  │ ← Red text
│                                     │
│                                     │
└─────────────────────────────────────┘
```

**Success State (with logs):**
```
┌─────────────────────────────────────┐
│ Live Logs                           │
│ [Search] [Filter] [Auto-scroll ✓]  │
├─────────────────────────────────────┤
│ 14:23:01.234 [INFO] Starting run   │
│ 14:23:01.567 [INFO] Node A complete│
│ 14:23:02.123 [INFO] Node B complete│
│ 14:23:02.456 [INFO] Run completed  │
└─────────────────────────────────────┘
```

---

### 7. Test Run Modal - Testing State

**Before Testing:**
```
┌──────────────────────────────────────┐
│ Test Workflow: My Workflow       × │
├──────────────────────────────────────┤
│ Test Inputs (JSON):                  │
│ ┌──────────────────────────────────┐ │
│ │ {                                │ │
│ │   "key": "value"                 │ │
│ │ }                                │ │
│ └──────────────────────────────────┘ │
│                                      │
│           [Close]  [Run Test]        │
└──────────────────────────────────────┘
```

**During Testing:**
```
┌──────────────────────────────────────┐
│ Test Workflow: My Workflow       × │
├──────────────────────────────────────┤
│ Test Inputs (JSON):                  │
│ ┌──────────────────────────────────┐ │
│ │ {                                │ │
│ │   "key": "value"                 │ │
│ │ }                                │ │
│ └──────────────────────────────────┘ │
│                                      │
│      [Close]  [○ Testing...]  ← Disabled │
└──────────────────────────────────────┘
```

---

### 8. Version History - Rollback Operation

**Before Rollback:**
```
┌────────────────────────────────────┐
│ Version History                    │
├────────────────────────────────────┤
│ ┌────────────────────────────────┐ │
│ │ v3 [Current] [Published]       │ │
│ │ 2024-10-10 14:00               │ │
│ │ Nodes: 5  Edges: 4             │ │
│ └────────────────────────────────┘ │
│ ┌────────────────────────────────┐ │
│ │ v2                             │ │
│ │ 2024-10-09 10:30               │ │
│ │ Nodes: 4  Edges: 3             │ │
│ │ [Rollback to this version]     │ │
│ └────────────────────────────────┘ │
└────────────────────────────────────┘
```

**During Rollback (v2):**
```
┌────────────────────────────────────┐
│ Version History                    │
├────────────────────────────────────┤
│ ┌────────────────────────────────┐ │
│ │ v3 [Current] [Published]       │ │
│ │ 2024-10-10 14:00               │ │
│ │ Nodes: 5  Edges: 4             │ │
│ └────────────────────────────────┘ │
│ ┌────────────────────────────────┐ │
│ │ v2                             │ │
│ │ 2024-10-09 10:30               │ │
│ │ Nodes: 4  Edges: 3             │ │
│ │ [○ Rolling back...]  ← Loading │ │
│ └────────────────────────────────┘ │
└────────────────────────────────────┘
```

---

### 9. Workflow Settings - Save Operation

**Before Save:**
```
┌────────────────────────────────────┐
│ Workflow Settings                  │
├────────────────────────────────────┤
│ General                            │
│ Name: [My Workflow            ]    │
│ Description: [                ]    │
│                                    │
│ Execution Settings                 │
│ Timeout: [300000] ms               │
│ Retry Attempts: [3]                │
│                                    │
│                  [Save Settings]   │
└────────────────────────────────────┘
```

**During Save:**
```
┌────────────────────────────────────┐
│ Workflow Settings                  │
├────────────────────────────────────┤
│ General                            │
│ Name: [My Workflow            ]    │
│ Description: [                ]    │
│                                    │
│ Execution Settings                 │
│ Timeout: [300000] ms               │
│ Retry Attempts: [3]                │
│                                    │
│              [○ Saving...]  ← Loading│
└────────────────────────────────────┘
```

---

## User Experience Flow Examples

### Example 1: Deleting a Workflow

1. User navigates to Workflows page
2. User clicks "Delete" on a workflow card
3. Confirmation dialog appears: "Delete workflow 'My Workflow'?"
4. User confirms deletion
5. **Loading overlay appears** with spinner and "Deleting workflow..." message
6. Screen is slightly dimmed, user cannot interact with page
7. After server responds (success):
   - Overlay disappears
   - Workflow card is removed from list
8. After server responds (error):
   - Overlay disappears
   - Alert shows error message

### Example 2: Testing a Workflow

1. User opens Test Run Modal
2. User enters test input JSON
3. User clicks "Run Test" button
4. **Button changes** to show spinner and "Testing..." text
5. Button is disabled to prevent double-clicks
6. After test completes:
   - Button returns to normal "Run Test" state
   - Test results appear in modal

### Example 3: Loading Logs

1. User navigates to a workflow run detail page
2. LiveLogs component mounts
3. **Spinner appears** with "Loading logs..." message
4. After logs load:
   - Spinner disappears
   - Logs display in terminal-style view
5. If error occurs:
   - Spinner disappears
   - Error message displays: "Failed to load logs: [error]"

---

## Accessibility Notes

### Screen Reader Experience

When a loading state activates:

1. **ARIA Live Region** announces: "Loading..."
2. **Status Role** indicates this is a status update
3. **Polite** announcement doesn't interrupt current reading

Example announcement sequence for deleting a workflow:
```
"Deleting workflow... Loading"
[pause during operation]
"Workflow deleted successfully" (from success message)
```

### Keyboard Navigation

During loading states:
- All interactive elements are disabled
- Tab navigation skips disabled buttons
- Overlays prevent accidental clicks
- Escape key can close modals (when applicable)
- Focus is restored after loading completes

---

## Design Consistency

All loading states follow these principles:

1. **Visual Consistency**: Same spinner design across all uses
2. **Color Consistency**: Uses theme colors appropriately
3. **Message Clarity**: Clear, specific messages about what's loading
4. **Predictable Behavior**: Similar operations have similar loading patterns
5. **No Layout Shift**: Loading states don't cause content jumps
6. **Smooth Transitions**: Fade-in/fade-out animations (where applicable)

---

## Performance Impact

**Before Loading States:**
- User clicks button
- No visual feedback
- User might click again (double-submission)
- Confusion about whether action was registered

**After Loading States:**
- User clicks button
- Immediate visual feedback (spinner appears)
- Button disabled (prevents double-submission)
- Clear message about what's happening
- Better perceived performance even if operation takes the same time

**Actual Performance:**
- No measurable impact on load time
- CSS animations are GPU-accelerated
- Total addition to bundle: < 5KB minified
- No additional network requests
- No layout reflows during loading states
