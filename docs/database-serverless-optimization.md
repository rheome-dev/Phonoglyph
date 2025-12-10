# Database Connection Optimization for Serverless

## Problem
Database connection timeouts in serverless environments (Vercel, AWS Lambda):
```
Connection terminated due to connection timeout
Connection terminated unexpectedly
```

## Root Causes

1. **Cold Start Latency**: Serverless functions take time to initialize, causing connection timeouts
2. **Connection Pool Size**: Too many connections per function invocation
3. **Connection Timeout Too Short**: Default 10s timeout insufficient for cold starts
4. **Supabase Direct Connection Limits**: Direct connection (port 5432) has strict connection limits

## Solutions Implemented

### 1. Serverless-Optimized Connection Pool
- **Pool Size**: Reduced from 20 to 1 for serverless (each function is isolated)
- **Connection Timeout**: Increased from 10s to 30s for cold starts
- **Idle Timeout**: Reduced to 10s to release connections faster
- **Allow Exit on Idle**: Enabled to close connections when function is idle

### 2. Non-Blocking Initialization
- Connection test failures don't block serverless function startup
- Connections are established lazily on first query
- Better error messages for debugging

### 3. Retry Logic
- Automatic retry with exponential backoff (up to 2 retries)
- Helps handle transient network issues during cold starts

## Recommended: Use Supabase Connection Pooler

For production serverless deployments, **use Supabase's connection pooler** instead of direct connection:

### Benefits:
- ✅ Handles connection pooling at Supabase level
- ✅ Better for serverless (designed for many short-lived connections)
- ✅ Higher connection limits
- ✅ Better performance under load

### How to Switch:

1. **Get Connection Pooler URL from Supabase Dashboard**:
   - Go to: Project Settings → Database → Connection Pooling
   - Use the **Transaction** mode URL (recommended for serverless)
   - Port will be **6543** instead of **5432**

2. **Update DATABASE_URL Environment Variable**:
   ```bash
   # Direct connection (current - port 5432)
   DATABASE_URL=postgresql://user:pass@host:5432/db
   
   # Connection pooler (recommended - port 6543)
   DATABASE_URL=postgresql://user:pass@host:6543/db?pgbouncer=true
   ```

3. **Note**: When using connection pooler:
   - Some PostgreSQL features may be limited (e.g., prepared statements)
   - Use `pgbouncer=true` parameter in connection string
   - Transaction mode is recommended for serverless

## Environment Variables

The code automatically detects serverless environments:
- `VERCEL` - Vercel serverless functions
- `AWS_LAMBDA_FUNCTION_NAME` - AWS Lambda

## Monitoring

Watch for these log messages:
- `✅ Database connected successfully` - Connection working
- `⚠️ Database connection test failed (non-blocking in serverless)` - Connection failed but function continues
- `⏳ Database connection attempt X failed, retrying...` - Retry in progress

## Troubleshooting

### Still Getting Timeouts?

1. **Check Supabase Status**: Database might be paused (free tier) or having issues
2. **Use Connection Pooler**: Switch to port 6543 connection pooler URL
3. **Check Network**: Verify Vercel/Lambda can reach Supabase
4. **Increase Timeout**: If needed, increase `connectionTimeoutMillis` further
5. **Check Database URL**: Ensure `DATABASE_URL` is correct and includes SSL parameters

### Database Paused (Supabase Free Tier)

If your Supabase database is paused:
1. Go to Supabase Dashboard
2. Click "Restore" to wake up the database
3. Wait a few seconds for it to come online
4. Retry the connection

### Connection Limits

If you see "too many connections" errors:
- Use connection pooler (port 6543) instead of direct connection
- Reduce pool size (already set to 1 for serverless)
- Ensure connections are properly released after queries

## Performance Tips

1. **Use Connection Pooler**: Essential for serverless
2. **Keep Queries Fast**: Long-running queries hold connections
3. **Release Connections**: Always release clients after use
4. **Monitor Connection Count**: Check Supabase dashboard for connection usage
5. **Consider Connection Warming**: For critical paths, make a dummy query on cold start

## Code Changes

The following optimizations were made:

```typescript
// Serverless detection
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;

// Optimized pool config
max: isServerless ? 1 : 20,
connectionTimeoutMillis: isServerless ? 30000 : 10000,
idleTimeoutMillis: isServerless ? 10000 : 30000,
allowExitOnIdle: isServerless,

// Non-blocking connection test
// Retry logic with exponential backoff
```

## References

- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- [Vercel Serverless Functions Best Practices](https://vercel.com/docs/functions/serverless-functions/runtimes/node-js)
- [pg Pool Configuration](https://node-postgres.com/features/pooling)

