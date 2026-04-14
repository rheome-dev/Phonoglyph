# AUTOSAVE SYSTEM - SESSION CONTEXT FILE

**Created**: 2026-02-03
**Purpose**: Hand off autosave/rehydration fix to another agent
**Status**: DEPLOYED - awaiting verification

---

## THE PROBLEM

**Issue**: Old projects fail to hydrate correctly on reload. After some time (days), reloading a project returns an incomplete/old state instead of the latest saved version.

**Specific Example**: Project "asfasef" returns version 1 (1 layer) instead of version 8 (4 layers). Effects and stem mappings disappear on reload.

**Root Cause**: The `is_current` boolean flag in the database became unreliable as the single source of truth for determining the latest saved state. Multiple concurrent saves could leave stale `is_current` flags pointing to outdated versions.

---

## THE SOLUTION

**Approach**: Make timestamp the single source of truth, ignore `is_current` flag entirely.

### Backend Changes (`apps/api/src/routers/auto-save.ts`)

**Location**: Lines 101-133, `getCurrentState` procedure

**Before**:
- Query 1: Try to find state with `is_current = true`
- Query 2 (fallback): If query 1 fails, find latest by timestamp

**After**:
```typescript
getCurrentState: protectedProcedure
  .input(z.object({ projectId: z.string().min(1, 'Project ID is required') }))
  .query(async ({ input, ctx }) => {
    try {
      // FIXED: Ignore 'is_current' flag which can be unreliable.
      // Always return the absolute latest state by timestamp.
      const { data: latestState, error } = await ctx.supabase
        .from('edit_states')
        .select('*')
        .eq('project_id', input.projectId)
        .eq('user_id', ctx.user.id)
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle(); // Use maybeSingle to return null instead of error if empty

      if (error) {
        logger.error('Database error fetching current state:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch current state',
        });
      }

      return latestState;
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      logger.error('[autoSave] getCurrentState: unexpected error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch current state',
      });
    }
  }),
```

### Frontend Changes (`apps/web/src/hooks/use-auto-save.ts`)

**Location**: Lines 76-84 (query definition) and 211-244 (getCurrentState function)

**Before**: Direct fetch bypassing React Query with manual tRPC batch format parsing

**After**:
```typescript
// Get current state query
const getCurrentStateQuery = trpc.autoSave.getCurrentState.useQuery(
  { projectId },
  {
    enabled: !!projectId && isAuthenticated,
    staleTime: 0,
    refetchOnWindowFocus: true
  }
)

// Get current state function - clean implementation using tRPC refetch
const getCurrentState = useCallback(async (): Promise<EditState | null> => {
  console.log('🔄 AUTOSAVE: getCurrentState called, projectId:', projectId)

  if (!projectId || !isAuthenticated) {
    return null
  }

  try {
    // Force a hard refresh from the server
    const { data, isError } = await getCurrentStateQuery.refetch()

    if (isError || !data) {
      console.log('🔄 AUTOSAVE: No state found or error')
      return null
    }

    console.log('🔄 AUTOSAVE: getCurrentState - version:', data.version)

    // Map the database response to EditState format (handling dates)
    return {
      id: data.id,
      userId: data.user_id,
      projectId: data.project_id,
      timestamp: new Date(data.timestamp),
      data: data.data,
      version: data.version,
      isCurrent: data.is_current
    }
  } catch (error) {
    console.error('🔄 AUTOSAVE: getCurrentState - error:', error)
    return null
  }
}, [projectId, isAuthenticated, getCurrentStateQuery])
```

**Removed**: Supabase import (no longer needed for direct fetch)

---

## VERIFICATION CHECKLIST

- [ ] Deploy completes on Vercel (check: https://phonoglyph.com)
- [ ] Navigate to project "asfasef" in dashboard
- [ ] Verify version number shows 8 (not 1)
- [ ] Verify 4 layers appear in timeline (not 1)
- [ ] Verify effects and stem mappings are restored
- [ ] Test with a different old project to confirm consistency
- [ ] Verify autosave still works for new changes

---

## RELATED FILES

### Backend
- `apps/api/src/routers/auto-save.ts` - Main autosave router
- `apps/api/src/routers/index.ts` - Root router (auto-saveRouter registered here)

### Frontend
- `apps/web/src/hooks/use-auto-save.ts` - Main autosave hook
- `apps/web/src/components/auto-save/auto-save-provider.tsx` - Provider component, handles hydration
- `apps/web/src/components/auto-save/auto-save-top-bar.tsx` - UI indicator
- `apps/web/src/lib/trpc-links.ts` - tRPC link configuration

### Stores (State Hydrated From Saved State)
- `apps/web/src/stores/timelineStore.ts` - Layers, duration, zoom
- `apps/web/src/stores/projectSettingsStore.ts` - Background color, visibility
- `apps/web/src/stores/visualizerStore.ts` - Effects, mappings, parameters

---

## DATABASE SCHEMA

Table: `edit_states`
```sql
Columns:
- id: string (UUID)
- user_id: string (UUID)
- project_id: string (UUID)
- data: jsonb (visualizationParams, stemMappings, effectSettings, timelineState)
- version: integer (auto-incrementing per project)
- is_current: boolean (now IGNORED)
- timestamp: timestamptz (ORDER BY this for latest)
```

---

## KEY TECHNICAL DECISIONS

1. **`ORDER BY timestamp DESC LIMIT 1`** instead of filtering by `is_current`
   - Reason: Timestamp is immutable and always reflects actual save order
   - `is_current` flag was getting stale due to race conditions

2. **`maybeSingle()` instead of `single()`**
   - Reason: `single()` throws an error on empty result, `maybeSingle()` returns null
   - Cleaner error handling for new projects with no saved states

3. **Standard tRPC `refetch()` instead of direct fetch**
   - Reason: Works with React Query's caching/invalidation patterns
   - Cleaner code, fewer edge cases

4. **Query enabled only when authenticated**
   - Reason: Backend protectedProcedure returns 401 for unauthenticated
   - More explicit control on frontend

---

## DEBUGGING COMMANDS

```bash
# Check if Vercel deployed
git log --oneline -1

# Local development
cd apps/web && pnpm dev

# Test API directly
curl "https://api.phonoglyph.rheome.tools/api/trpc/autoSave.getCurrentState?batch=1&input={\"0\":{\"json\":{\"projectId\":\"asfasef\"}}}"

# Check Supabase directly (requires credentials)
# Query: SELECT id, version, is_current, timestamp FROM edit_states WHERE project_id = 'asfasef' ORDER BY timestamp DESC
```

---

## COMMIT HISTORY

- `38d9779b2` - fix: make timestamp the single source of truth for getCurrentState
- `cfc5a51f9` - fix: add backend fallback for getCurrentState with logging
- `c2e20f38e` - fix: direct fetch bypass for getCurrentState to bypass React Query

The most recent commit (38d9779b2) is the clean fix that should remain.

---

## WHAT WORKED

- ✅ Identified root cause: `is_current` flag was unreliable
- ✅ Cleaned up frontend to use standard tRPC patterns
- ✅ Simplified backend to single query
- ✅ Reduced code complexity (removed ~50 lines)

---

## WHAT NEEDS TESTING

- [ ] Old project "asfasef" loads with version 8 (4 layers)
- [ ] Other old projects load correctly
- [ ] New projects still autosave correctly
- [ ] Restore from history still works
- [ ] Clear history still works

---

## NOTES FOR NEXT AGENT

1. The key insight was that `is_current` was a derived/optimistic flag, not a reliable source of truth
2. Timestamp is the actual source of truth for "what was saved last"
3. If issues persist, check:
   - Are there multiple user_id lookups in the query?
   - Is the ORDER BY correctly descending (latest first)?
   - Is the frontend calling getCurrentState with correct projectId?

4. If you need to add more logging:
   - Backend: Edit `apps/api/src/routers/auto-save.ts`
   - Frontend: Edit `apps/web/src/hooks/use-auto-save.ts`
   - Logs appear in Vercel function logs and browser console
