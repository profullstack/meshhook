# Loading States Implementation

This document describes the loading state components and their usage throughout the MeshHook application.

## Components

### LoadingSpinner

A reusable loading spinner component that can be used to indicate loading states throughout the application.

**Location:** `apps/web/src/lib/components/LoadingSpinner.svelte`

**Props:**
- `size`: String - 'small', 'medium', or 'large' (default: 'medium')
- `color`: String - CSS color value (default: 'var(--color-theme-2)')
- `label`: String - Accessibility label for screen readers (default: 'Loading...')

**Accessibility Features:**
- Uses `role="status"` for proper ARIA semantics
- Includes `aria-live="polite"` for screen reader announcements
- Provides `aria-label` for context
- Includes visually-hidden text for screen readers

**Example Usage:**
```svelte
<LoadingSpinner size="medium" label="Loading workflows..." />
```

### LoadingButton

A button component that automatically shows a loading spinner and disables itself during async operations.

**Location:** `apps/web/src/lib/components/LoadingButton.svelte`

**Props:**
- `loading`: Boolean - Shows spinner when true (default: false)
- `disabled`: Boolean - Additional disable state (default: false)
- `variant`: String - 'primary', 'secondary', or 'danger' (default: 'primary')
- `type`: String - Button type attribute (default: 'button')
- `onclick`: Function - Click handler (optional for submit buttons)
- `loadingText`: String - Text to show when loading (default: 'Loading...')
- `class`: String - Additional CSS classes

**Example Usage:**
```svelte
<LoadingButton 
  variant="primary" 
  loading={saving} 
  loadingText="Saving..."
  onclick={handleSave}
>
  Save Changes
</LoadingButton>
```

## Integration Points

### 1. LiveLogs Component
**File:** `apps/web/src/lib/components/LiveLogs.svelte`

Shows a loading spinner while fetching initial logs from the database. Includes error state handling.

**Features:**
- Loading state during initial log fetch
- Error state with clear error messaging
- Empty state when no logs exist

### 2. TestRunModal Component
**File:** `apps/web/src/lib/components/TestRunModal.svelte`

Uses LoadingButton for the test execution action.

**Features:**
- Button shows spinner during test execution
- Button is disabled during loading
- Custom loading text: "Testing..."

### 3. Workflows Page
**File:** `apps/web/src/routes/workflows/+page.svelte`

Shows a full-screen loading overlay during delete and duplicate operations.

**Features:**
- Modal overlay with loading spinner
- Contextual messages (e.g., "Deleting workflow...", "Duplicating workflow...")
- Prevents interaction during async operations

### 4. Runs Page
**File:** `apps/web/src/routes/runs/+page.svelte`

Shows a full-screen loading overlay during retry and cancel operations.

**Features:**
- Modal overlay with loading spinner
- Contextual messages (e.g., "Retrying run...", "Cancelling run...")
- Prevents interaction during async operations

### 5. VersionHistory Component
**File:** `apps/web/src/lib/components/VersionHistory.svelte`

Uses LoadingButton for rollback operations.

**Features:**
- Individual loading state per version
- Only the clicked version shows loading state
- Custom loading text: "Rolling back..."

### 6. WorkflowSettings Component
**File:** `apps/web/src/lib/components/WorkflowSettings.svelte`

Uses LoadingButton for save operations.

**Features:**
- Submit button with loading state
- Works with form submission
- Custom loading text: "Saving..."

### 7. Secrets Page
**File:** `apps/web/src/routes/secrets/+page.svelte`

Shows a full-screen loading overlay during delete operations.

**Features:**
- Modal overlay with loading spinner
- Contextual message: "Deleting secret..."
- Prevents interaction during async operations

## Design Patterns

### Loading Overlay Pattern
Used for operations that affect the entire page or list:

```svelte
{#if loading}
  <div class="loading-overlay" role="status" aria-live="polite">
    <div class="loading-content">
      <LoadingSpinner size="large" label={loadingMessage} />
      <p class="loading-message">{loadingMessage}</p>
    </div>
  </div>
{/if}
```

### Inline Loading Pattern
Used for individual actions within components:

```svelte
<LoadingButton 
  loading={isLoading} 
  loadingText="Processing..."
  onclick={handleAction}
>
  Action Label
</LoadingButton>
```

### Conditional Content Pattern
Used for data fetching with multiple states:

```svelte
{#if loading}
  <LoadingSpinner />
{:else if error}
  <ErrorMessage />
{:else if data.length === 0}
  <EmptyState />
{:else}
  <Content />
{/if}
```

## Accessibility Compliance

All loading states follow WCAG 2.1 guidelines:

1. **Perceivable**: 
   - Visual spinner animations
   - Color contrast meets AA standards
   - Screen reader announcements via ARIA

2. **Operable**:
   - Buttons are keyboard accessible
   - Focus management during loading states
   - No keyboard traps

3. **Understandable**:
   - Clear loading messages
   - Consistent behavior across the app
   - Error states with actionable feedback

4. **Robust**:
   - Proper ARIA roles and labels
   - Semantic HTML elements
   - Works with assistive technologies

## Performance Considerations

1. **Lightweight Animations**: CSS-based spinner animations use GPU acceleration
2. **No External Dependencies**: Pure SVG spinner, no icon libraries needed
3. **Minimal Re-renders**: Uses Svelte 5's reactive primitives efficiently
4. **Optimized Overlays**: Fixed positioning prevents layout thrashing

## Testing Recommendations

### Manual Testing
1. Verify loading spinners appear during async operations
2. Check that buttons are disabled during loading
3. Ensure screen readers announce loading states
4. Test keyboard navigation during loading states
5. Verify loading states clear on success and error

### Automated Testing
Consider adding tests for:
- LoadingSpinner renders with correct props
- LoadingButton shows spinner when loading=true
- LoadingButton disables when loading=true
- Overlay prevents interaction during loading

## Future Enhancements

Potential improvements for future iterations:

1. **Progress Indicators**: Show progress percentage for long operations
2. **Skeleton Screens**: Replace spinners with skeleton UI for initial loads
3. **Toast Notifications**: Add success/error toasts after operations
4. **Optimistic Updates**: Update UI before server confirmation
5. **Request Cancellation**: Allow users to cancel long-running operations
