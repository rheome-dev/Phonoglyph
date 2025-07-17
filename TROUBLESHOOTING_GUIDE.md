# tRPC Payload Typing Issues - Troubleshooting Guide

## Problem Summary

You were experiencing issues with payloads being sent from the frontend being received as incorrectly typed on the backend when deployed on Vercel with separate frontend and backend projects.

## Root Causes Identified 🔍

### 1. **Environment Variable Configuration**
- `NEXT_PUBLIC_API_URL` not properly set in frontend deployment
- `FRONTEND_URL` not properly configured in backend CORS settings
- Missing environment variables causing connection failures

### 2. **Type Synchronization Issues**
- Frontend and backend using separate type definitions
- Potential version mismatches between shared types
- No centralized type management

### 3. **CORS Configuration**
- Backend CORS not properly configured for production domains
- Missing headers for guest session support

### 4. **Request Headers and Authentication**
- Authentication headers not being passed correctly between deployments
- Guest session headers missing from allowed headers list

## Solutions Implemented ✅

### 1. **Shared Types Package**
- Created `@phonoglyph/types` package for centralized type management
- Both frontend and backend now import from the same source
- Ensures type consistency across deployments

### 2. **Improved CORS Configuration**
- Added fallback domains for Vercel deployments
- Included guest session headers in allowed headers
- Better error handling for CORS issues

### 3. **Enhanced tRPC Links**
- Added better error handling and debugging
- Improved API URL validation
- Better session management

### 4. **Environment Variable Validation**
- Added validation for required environment variables
- Better debugging output for deployment issues

## Deployment Configuration

### Frontend Environment Variables (Vercel)
```bash
NEXT_PUBLIC_API_URL=https://your-backend-domain.vercel.app
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Backend Environment Variables (Vercel)
```bash
NODE_ENV=production
FRONTEND_URL=https://your-frontend-domain.vercel.app
DATABASE_URL=your_supabase_database_url
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## Testing Your Fixes

### 1. **Local Testing**
```bash
# Test type consistency
cd apps/web && pnpm type-check
cd apps/api && pnpm type-check

# Test builds
cd apps/web && pnpm build
cd apps/api && pnpm build
```

### 2. **Deployment Testing**
1. Deploy backend first and note the URL
2. Set `NEXT_PUBLIC_API_URL` in frontend environment variables
3. Deploy frontend
4. Set `FRONTEND_URL` in backend environment variables
5. Test API calls from frontend

### 3. **Debug Commands**
```bash
# Check if types are properly linked
pnpm list @phonoglyph/types

# Check environment variables in browser console
console.log('API URL:', process.env.NEXT_PUBLIC_API_URL)
```

## Alternative: Combined Deployment

If you continue having issues with separate deployments, consider combining them:

### Benefits of Combined Deployment
- No CORS issues
- No environment variable complexity
- Simpler deployment process
- Better performance (no cross-domain requests)

### Migration Steps
1. Move API routes to Next.js `pages/api/` or `app/api/`
2. Convert Express routes to Next.js API routes
3. Update tRPC configuration for single deployment
4. Deploy as single project

## Common Issues and Solutions

### Issue: "Cannot find module 'zod'"
**Solution**: Ensure `@phonoglyph/types` package has zod as a dependency

### Issue: CORS errors in production
**Solution**: Check that `FRONTEND_URL` is set correctly in backend environment variables

### Issue: API connection timeouts
**Solution**: Verify `NEXT_PUBLIC_API_URL` is set correctly in frontend environment variables

### Issue: Type mismatches between frontend and backend
**Solution**: Ensure both projects are using the same version of `@phonoglyph/types`

## Monitoring and Debugging

### Frontend Debug Logs
Check browser console for:
- tRPC API URL debug information
- Authentication header presence
- Network request errors

### Backend Debug Logs
Check server logs for:
- CORS origin validation
- Authentication header processing
- Request/response debugging

## Next Steps

1. **Deploy with new configuration** following the deployment guide
2. **Monitor logs** for any remaining issues
3. **Test all tRPC endpoints** to ensure type consistency
4. **Consider combined deployment** if issues persist

## Files Modified

- `apps/api/src/index.ts` - CORS configuration
- `apps/web/src/lib/trpc-links.ts` - Enhanced error handling
- `packages/types/` - New shared types package
- `apps/api/src/routers/project.ts` - Updated to use shared types
- `apps/web/src/lib/validations.ts` - Updated to use shared types
- `package.json` files - Added shared types dependency