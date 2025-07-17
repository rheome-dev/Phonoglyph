# Deployment Guide for Separate Frontend/Backend

## Environment Variables Configuration

### Backend (API) Environment Variables

Set these in your Vercel backend project:

```bash
# Required
NODE_ENV=production
FRONTEND_URL=https://your-frontend-domain.vercel.app

# Database
DATABASE_URL=your_supabase_database_url
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# AWS/S3 (if using)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=your_aws_region
AWS_S3_BUCKET=your_s3_bucket_name

# Other required variables from your .env file
```

### Frontend (Web) Environment Variables

Set these in your Vercel frontend project:

```bash
# Required
NEXT_PUBLIC_API_URL=https://your-backend-domain.vercel.app
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Other required variables from your .env file
```

## Deployment Steps

1. **Deploy Backend First**
   - Deploy your API project to Vercel
   - Note the deployment URL (e.g., `https://your-api.vercel.app`)

2. **Configure Frontend**
   - Set `NEXT_PUBLIC_API_URL` to your backend URL
   - Deploy your frontend project to Vercel

3. **Update Backend CORS**
   - Set `FRONTEND_URL` in your backend environment variables to your frontend URL

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure `FRONTEND_URL` is set correctly in backend
   - Check that the frontend URL is in the allowed origins list

2. **API Connection Errors**
   - Verify `NEXT_PUBLIC_API_URL` is set correctly in frontend
   - Check that the backend is accessible from the frontend domain

3. **Type Mismatches**
   - Ensure both projects are using the same version of `@phonoglyph/types`
   - Run `pnpm install` in both projects after updating dependencies

### Debug Commands

```bash
# Check if types are properly linked
pnpm list @phonoglyph/types

# Type check both projects
cd apps/web && pnpm type-check
cd apps/api && pnpm type-check

# Build both projects
cd apps/web && pnpm build
cd apps/api && pnpm build
```

## Alternative: Combined Deployment

If you continue having issues with separate deployments, consider combining them:

1. Move the API routes into the Next.js app under `pages/api/` or `app/api/`
2. Use Next.js API routes instead of Express
3. Deploy as a single project

This eliminates CORS and environment variable issues but may require some refactoring.