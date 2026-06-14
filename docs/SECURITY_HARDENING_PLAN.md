# Security Hardening Plan

## Access Token Storage

Current state: the frontend stores the short-lived access token in `localStorage`.
This works, but it increases impact if an XSS bug reaches the application.

Progressive migration:

1. Keep the refresh token in the existing HTTP-only cookie.
2. Move the access token to in-memory frontend state only.
3. On page reload, call the refresh endpoint to restore a new access token.
4. Update guards/interceptors to tolerate a short "session restore" state.
5. Remove `jb_access_token` from `localStorage` after the new flow is verified.
6. Add E2E tests for login, reload while logged in, logout, refresh expiry, and role redirects.

Do not switch this in one deploy without the tests above. A direct switch can log users out or break guarded pages after refresh.

## Production Rate Limiting

Current state: `express-rate-limit` uses the in-memory store.
That is acceptable for one Node process, but not for multiple instances or high traffic.

Progressive migration:

1. Keep the memory limiter as the default fallback.
2. Add Redis-backed rate limit store behind an env flag.
3. Use local Redis on the VPS: `redis://127.0.0.1:6379`.
4. Enable Redis only after confirming Redis is supervised and not publicly exposed.
5. Monitor 429 rates and API latency after enabling.

Suggested future env:

```env
RATE_LIMIT_STORE=redis
REDIS_URL=redis://127.0.0.1:6379
```
