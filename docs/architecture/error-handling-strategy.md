# Error Handling Strategy

A standardized error format will be used for all API responses. For render jobs, detailed failure reasons will be communicated back to the client via the WebSocket `RenderProgressMessage`. All backend errors will be logged with a correlation ID (the `jobId` for renders) to simplify support and debugging.
