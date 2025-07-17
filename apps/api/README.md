# API Server

## Debug Logging

To control the amount of logging output in your terminal, you can set the `DEBUG_LOGGING` environment variable:

```bash
# Enable verbose debug logging
DEBUG_LOGGING=true npm run dev

# Disable debug logging (default)
DEBUG_LOGGING=false npm run dev
```

### What gets logged when DEBUG_LOGGING=true:

- HTTP request headers and authentication details
- Database connection status
- Stem separation progress
- R2 storage operations
- User authentication flow

### What always gets logged (regardless of DEBUG_LOGGING):

- Server startup messages
- Error messages
- Critical system events

## Development

```bash
npm run dev
```

The server will start on port 3001 by default. # Wed Jul 16 17:24:53 PDT 2025
