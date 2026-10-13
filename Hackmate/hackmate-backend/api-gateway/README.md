# API Gateway

Central entry point for all HackMate backend services. Routes incoming requests to the appropriate microservice and enforces cross-cutting concerns like authentication, rate limiting, and maintenance mode.

## Structure

```
api-gateway/
├── main.py               # FastAPI app, middleware registration
├── routes.py             # Proxy routing to downstream services
├── config.py             # Environment config
├── requirements.txt
├── Dockerfile
└── middleware/
    ├── auth_middleware.py    # JWT validation & role enforcement
    ├── rate_limiter.py       # Per-IP rate limiting (Upstash Redis)
    └── maintenance.py        # Maintenance mode toggle
```

## Responsibilities

- Reverse-proxies requests to all downstream microservices
- Validates JWT tokens on every request via `auth_middleware`
- Enforces per-IP rate limits using Upstash Redis
- Blocks all traffic when maintenance mode is enabled
- Handles CORS for the frontend origins

## Middleware Stack (outermost → innermost)

| Layer | Purpose |
|---|---|
| CORS | Allow frontend origins |
| Rate Limiter | Throttle requests per IP |
| Maintenance | Block traffic during downtime |
| Auth | Validate JWT, inject user context |

## Tech Stack

- **FastAPI** 0.111.0
- **httpx** — async HTTP proxying
- **python-jose** — JWT decoding
- **slowapi** — rate limiting
- **Upstash Redis** — distributed rate limit state

## Environment Variables

| Variable | Description |
|---|---|
| `JWT_SECRET` | Secret key for JWT verification |
| `UPSTASH_REDIS_URL` | Redis URL for rate limiting |
| `*_SERVICE_URL` | Base URLs for each downstream service |

## Running

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```
 