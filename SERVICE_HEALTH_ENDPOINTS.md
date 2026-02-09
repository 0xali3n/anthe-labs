# Service Health Endpoints

## Quick Reference

| Service | Endpoint | Port | URL |
|---------|----------|------|-----|
| **API** | `GET /api/health` | 4001 | `http://localhost:4001/api/health` |
| **WS** | `GET /health` | 4002 | `http://localhost:4002/health` |
| **Trade** | `GET /health` | 4003 | `http://localhost:4003/health` |

## Response Format

All endpoints return:
```json
{
  "ok": true,
  "message": "✅ [Service] is running!",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Port Configuration

Default ports (override with `PORT` env var):
- API: `4001`
- WS: `4002`
- Trade: `4003`

## Quick Test

```bash
curl http://localhost:4001/api/health  # API
curl http://localhost:4002/health      # WS
curl http://localhost:4003/health       # Trade
```
