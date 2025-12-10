# Cloudflare R2 CORS Configuration Guide

## Problem
If you're seeing CORS errors like:
```
Access to fetch at 'https://...r2.cloudflarestorage.com/...' from origin 'https://phonoglyph.rheome.tools' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present
```

This means the R2 bucket CORS policy needs to be configured.

## Solution: Manual CORS Configuration in Cloudflare Dashboard

The API may not have permissions to set CORS automatically. Configure it manually:

### Steps:

1. **Log into Cloudflare Dashboard**
   - Go to https://dash.cloudflare.com
   - Navigate to **R2** in the sidebar

2. **Select Your Bucket**
   - Click on your bucket: `phonoglyph-uploads` (or whatever your bucket name is)

3. **Go to Settings**
   - Click on the **Settings** tab

4. **Configure CORS Policy**
   - Scroll down to **CORS Policy** section
   - Click **Edit CORS Policy** or **Add CORS Policy**

5. **Add CORS Configuration**
   Use this JSON configuration:

```json
[
  {
    "AllowedOrigins": [
      "https://phonoglyph.rheome.tools",
      "http://localhost:3000"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "POST",
      "DELETE",
      "HEAD"
    ],
    "AllowedHeaders": [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
      "Cache-Control",
      "x-amz-date",
      "x-amz-security-token"
    ],
    "ExposeHeaders": [
      "ETag"
    ],
    "MaxAgeSeconds": 3000
  }
]
```

6. **Save the Configuration**
   - Click **Save** or **Update**

### Alternative: Using Cloudflare API

If you prefer to use the API, you can use the Cloudflare API directly (not the S3-compatible API):

```bash
curl -X PUT "https://api.cloudflare.com/client/v4/accounts/{account_id}/r2/buckets/{bucket_name}/cors" \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "cors_rules": [
      {
        "allowed_origins": ["https://phonoglyph.rheome.tools", "http://localhost:3000"],
        "allowed_methods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
        "allowed_headers": ["*"],
        "max_age_seconds": 3000
      }
    ]
  }'
```

## Verification

After configuring CORS, test by:

1. Opening browser DevTools on https://phonoglyph.rheome.tools
2. Try loading an image from R2
3. Check Network tab - the request should succeed without CORS errors
4. Check Response Headers - you should see `Access-Control-Allow-Origin: https://phonoglyph.rheome.tools`

## Troubleshooting

### Still seeing CORS errors?

1. **Check the exact origin** - Make sure the origin in the error matches exactly what's in your CORS policy (no trailing slashes, exact protocol match)

2. **Clear browser cache** - CORS headers might be cached

3. **Check bucket name** - Verify you're configuring CORS on the correct bucket

4. **Wait a few minutes** - CORS changes can take a minute or two to propagate

5. **Check API logs** - Look for CORS configuration errors in your API startup logs

## Why This Happened

If CORS was working before and suddenly stopped:

1. **Cloudflare service changes** - Recent Cloudflare outages (Dec 2024) may have reset configurations
2. **Bucket settings reset** - Someone may have modified bucket settings
3. **API permissions changed** - The R2 API token permissions may have been modified
4. **Manual configuration was removed** - If CORS was set manually before, it may have been cleared

## Prevention

- Document your CORS configuration
- Consider using Infrastructure as Code (Terraform, Pulumi) to manage R2 CORS
- Set up monitoring/alerts for CORS errors
- Keep a backup of your CORS configuration

