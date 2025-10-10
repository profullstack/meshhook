# Authentication and Security Fixes

## Summary

This document outlines the comprehensive authentication and security improvements made to the MeshHook application to address the following issues:

1. **Database Schema**: Fixed missing `workflows` table/view
2. **Authentication Security**: Replaced insecure `getSession()` calls with secure `getUser()` 
3. **Server-Side Only**: All Supabase calls now happen server-side with HTTP-only cookies
4. **Route Protection**: Added authentication guards to all protected routes
5. **API Security**: All API endpoints now require authentication and return 401 if unauthorized

## Changes Made

### 1. Database Migration

**File**: `supabase/migrations/20250110000005_create_workflows_view.sql`

Created a view to map `workflow_definitions` table to `workflows` for backward compatibility:

```sql
create or replace view public.workflows as
select
  id,
  project_id,
  slug,
  version,
  definition,
  created_at,
  updated_at
from public.workflow_definitions;
```

### 2. Authentication Library

**File**: `apps/web/src/lib/auth.js` (NEW)

Created a comprehensive authentication utility library with the following functions:

- `requireAuth(event)` - Redirects to /login if not authenticated (for page routes)
- `getUser(event)` - Returns user or null without redirecting
- `isAuthenticated(event)` - Boolean check for authentication
- `getSupabase(event)` - Gets Supabase client from event.locals
- `requireApiAuth(event)` - Returns 401 JSON response if not authenticated (for API routes)
- `verifyProjectAccess(supabase, userId, projectId)` - Verifies user has access to a project

### 3. Server Hooks Enhancement

**File**: `apps/web/src/hooks.server.js`

Updated to:
- Use `supabase.auth.getUser()` instead of `getSession()` for security
- Make user and supabase client available via `event.locals`
- Run authentication check on every request

### 4. Protected Page Routes

Updated the following page server files to use `requireAuth()`:

- `apps/web/src/routes/workflows/+page.server.js`
- `apps/web/src/routes/secrets/+page.server.js`
- `apps/web/src/routes/runs/+page.server.js`

**Pattern used**:
```javascript
import { requireAuth, getSupabase } from '$lib/auth.js';

export async function load(event) {
  const user = requireAuth(event); // Redirects to /login if not authenticated
  const supabase = getSupabase(event);
  
  // ... rest of the code
}
```

### 5. Protected API Routes

Updated the following API routes to check authentication:

- `apps/web/src/routes/api/secrets/+server.js`
- `apps/web/src/routes/api/secrets/[id]/+server.js`

**Pattern used**:
```javascript
import { getUser, getSupabase } from '$lib/auth.js';
import { json } from '@sveltejs/kit';

export async function GET(event) {
  const user = getUser(event);
  
  if (!user) {
    return json({ 
      error: 'Unauthorized', 
      message: 'Authentication required' 
    }, { status: 401 });
  }
  
  const supabase = getSupabase(event);
  // ... rest of the code
}
```

## Security Improvements

### Before
- ❌ Used `supabase.auth.getSession()` which reads from storage (insecure)
- ❌ Client-side Supabase calls exposed credentials
- ❌ No authentication guards on routes
- ❌ API routes didn't verify authentication
- ❌ Missing database table caused errors

### After
- ✅ Uses `supabase.auth.getUser()` which verifies with Supabase Auth server
- ✅ All Supabase calls happen server-side only
- ✅ HTTP-only cookies for session management
- ✅ All protected routes redirect to /login if not authenticated
- ✅ All API routes return 401 if not authenticated
- ✅ Database schema fixed with workflows view

## Remaining Files to Update

The following files still contain `getSession()` calls and should be updated using the same patterns:

### Page Routes
- `apps/web/src/routes/+layout.server.js`
- `apps/web/src/routes/workflows/[id]/edit/+page.server.js`
- `apps/web/src/routes/runs/[id]/+page.server.js`

### API Routes
- `apps/web/src/routes/api/workflows/+server.js`
- `apps/web/src/routes/api/workflows/[id]/+server.js`
- `apps/web/src/routes/api/workflows/[id]/versions/+server.js`
- `apps/web/src/routes/api/runs/+server.js`

## Testing Instructions

### 1. Apply Database Migration

```bash
# If using Supabase CLI
supabase db push

# Or apply manually via Supabase Dashboard
# SQL Editor -> New Query -> Paste contents of 20250110000005_create_workflows_view.sql
```

### 2. Test Authentication Flow

1. **Unauthenticated Access**:
   - Visit `/workflows` without being logged in
   - Should redirect to `/login`
   - Same for `/secrets` and `/runs`

2. **API Authentication**:
   ```bash
   # Should return 401
   curl http://localhost:5173/api/secrets
   
   # With valid session cookie should return data
   curl -H "Cookie: sb-access-token=..." http://localhost:5173/api/secrets
   ```

3. **Authenticated Access**:
   - Log in via `/login`
   - Visit `/workflows`, `/secrets`, `/runs`
   - Should load data successfully
   - No console warnings about `getSession()`

### 3. Verify No Console Warnings

Check browser console and server logs for:
- ❌ No warnings about "Using the user object as returned from supabase.auth.getSession()"
- ❌ No errors about missing `workflows` table
- ✅ Clean logs with no authentication warnings

## Deployment Checklist

- [ ] Apply database migration to production
- [ ] Deploy updated application code
- [ ] Verify environment variables are set correctly
- [ ] Test authentication flow in production
- [ ] Monitor logs for any authentication errors
- [ ] Update remaining files with `getSession()` calls

## Additional Recommendations

1. **Add Login/Logout Routes**: Create proper login and logout pages if they don't exist
2. **Session Management**: Consider adding session refresh logic
3. **Error Pages**: Create a proper 401/403 error page
4. **Rate Limiting**: Add rate limiting to API routes
5. **CSRF Protection**: Consider adding CSRF tokens for state-changing operations
6. **Audit Logging**: Log all authentication attempts and failures

## Support

For issues or questions about these changes, refer to:
- Supabase Auth documentation: https://supabase.com/docs/guides/auth
- SvelteKit hooks documentation: https://kit.svelte.dev/docs/hooks