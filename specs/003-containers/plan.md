# Plan 003: Containers

The technical design for [spec.md](spec.md).

## Files

```text
docker-compose.yml                         builds and runs both containers
backend/calculate-service/
├── Dockerfile                             Go build, then a minimal runtime image
└── .dockerignore
frontend/
├── Dockerfile                             Node build, then nginx
├── nginx.conf.template                    static files, /api proxy, SPA fallback
└── .dockerignore
```

## How a request travels

```text
browser ──> localhost:3000 ──> frontend container (nginx :80)
                                 ├── /            static files of the built application
                                 └── /api/...  ──> calculate-service container (:8080)

curl ─────> localhost:8080 ──────────────────────> calculate-service container (:8080)
```

The frontend is built with `VITE_API_URL` empty, so the browser calls `/api` on the address that served the page. nginx forwards those requests to the service over the Compose network, where the service is reachable by its name, `calculate-service`. The page and the API share one origin, so the browser makes no cross-origin request (FR-003). This is the same arrangement as the Vite proxy in development.

## Service image

| Stage | Base | Does |
| --- | --- | --- |
| `build` | `golang:1.24-alpine` | Copies `go.mod` and downloads modules, then copies the source and builds a static binary with `CGO_ENABLED=0` |
| final | `alpine:3` | Holds the binary only; runs as user `app` (uid 10001) |

Alpine is used for the final image, and not an empty or distroless base, because the health check needs a program inside the container to call `/health`. Alpine includes `wget`.

## Frontend image

| Stage | Base | Does |
| --- | --- | --- |
| `build` | `node:22-alpine` | Copies `package.json` and the lock file and runs `npm ci`, then copies the source and runs `npm run build` |
| final | `nginx:stable-alpine` | Holds the contents of `dist/` and the nginx configuration |

`npm run build` type checks before it builds, so an image cannot be built from code that fails the type check.

The nginx configuration is a template. The official nginx image substitutes environment variables into files under `/etc/nginx/templates` when the container starts, so the address of the service (`CALC_SERVICE_URL`) is set at run time and not baked into the image.

| Location | Behavior |
| --- | --- |
| `/api/` | Forwarded to the service, with the original host and client address in headers |
| `/assets/` | Built files, which have a content hash in their name; cached for a year |
| `/` | The requested file if it exists, otherwise `index.html` (FR-007); not cached, so a new release is picked up |

## Compose

| Service | Build context | Host port | Depends on |
| --- | --- | --- | --- |
| `calculate-service` | `backend/calculate-service` | `BACKEND_PORT`, default 8080 | nothing |
| `frontend` | `frontend` | `FRONTEND_PORT`, default 3000 | `calculate-service`, healthy |

nginx resolves the service's name once, when it starts. `depends_on` with `condition: service_healthy` makes sure the service is up first (FR-006).

Both services use `restart: unless-stopped`.

## Requirement coverage

| Requirements | Implemented in |
| --- | --- |
| FR-001, FR-005, FR-006, FR-008 | `docker-compose.yml` |
| FR-002, FR-003, FR-007 | `frontend/Dockerfile`, `frontend/nginx.conf.template` |
| FR-004 | `docker-compose.yml`, `backend/calculate-service/Dockerfile` |
| NFR-001, NFR-003, NFR-004 | Both Dockerfiles |
| NFR-002 | `backend/calculate-service/Dockerfile` |
