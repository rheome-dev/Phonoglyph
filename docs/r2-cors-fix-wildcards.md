# Fix: R2 CORS Wildcard Issue

## Problem
Your CORS policy includes wildcard patterns:
- `https://*.vercel.app`
- `https://*.rheome.tools`

**Cloudflare R2 does NOT support wildcard patterns in CORS policies.** These wildcards cause the entire CORS policy to be invalid or ignored, which is why you're getting CORS errors even though the policy looks correct.

## Solution

Replace your current CORS policy with this one (exact origins only):

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://phonoglyph.rheome.tools"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "POST",
      "DELETE",
      "HEAD"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": [
      "ETag"
    ],
    "MaxAgeSeconds": 3000
  }
]
```

## Changes Made

1. **Removed wildcards**: `https://*.vercel.app` and `https://*.rheome.tools` - these don't work in R2
2. **Removed API domain**: `https://api.phonoglyph.rheome.tools` - not needed (API doesn't make browser requests to R2)
3. **Simplified headers**: Changed to `"*"` which is simpler and works better

## If You Need Vercel Preview URLs

If you need to support Vercel preview deployments, you'll need to add each preview URL explicitly when you create it, OR use a different approach:

1. **Option 1**: Add preview URLs manually as needed
2. **Option 2**: Use a proxy through your API to serve images (bypasses CORS)
3. **Option 3**: Use Cloudflare Workers to add CORS headers dynamically

## Steps to Fix

1. Go to Cloudflare Dashboard → R2 → `phonoglyph-uploads` → Settings
2. Find CORS Policy section
3. Click Edit
4. Replace the entire JSON with the corrected version above
5. Save
6. Wait 1-2 minutes for propagation
7. Test - CORS errors should be resolved

## Why This Happened

The wildcard patterns were likely added thinking they would work (they work in some other services), but R2's S3-compatible API doesn't support them. The policy was probably being silently ignored, which is why CORS was failing.






