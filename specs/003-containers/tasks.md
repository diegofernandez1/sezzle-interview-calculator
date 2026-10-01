# Tasks 003: Containers

The work to implement [spec.md](spec.md) following [plan.md](plan.md), in order.

- [x] T001 Write `spec.md`, `plan.md`, and `tasks.md`.
- [x] T002 Write `backend/calculate-service/Dockerfile` and `.dockerignore`. (FR-004, NFR-001 to NFR-004)
- [x] T003 Write `frontend/Dockerfile`, `nginx.conf.template`, and `.dockerignore`. (FR-002, FR-003, FR-007, NFR-001, NFR-003, NFR-004)
- [x] T004 Write `docker-compose.yml`. (FR-001, FR-005, FR-006, FR-008)
- [x] T005 Run every acceptance scenario against the running containers.
- [x] T006 Add the container instructions to the root `README.md`.

## Verification results

Recorded on 2026-09-30 with Docker 29.4 and Compose 5.1 on macOS. These scenarios are run by hand; there is no automated test for the container setup.

| Scenario | How it was checked | Result |
| --- | --- | --- |
| AC-001 | `docker compose up --build -d --wait`, then `docker compose ps` | Both containers running and healthy; the frontend started after the service was healthy |
| AC-002 | `curl http://localhost:3000/` | `200`, `text/html`, title `Calculator` |
| AC-003 | `curl -X POST http://localhost:3000/api/v1/add` with `{"numbers":[1,2,3]}` | `200`, `{"operation":"add","result":6}` |
| AC-004 | `curl -X POST http://localhost:3000/api/v1/divide` with `{"numbers":[1,0]}` | `422`, code `DIVISION_BY_ZERO`, body unchanged |
| AC-005 | `curl http://localhost:8080/health` | `200`, `{"status":"ok"}` |
| AC-006 | `curl http://localhost:3000/anything` | `200`, the same bytes as `/` |
| AC-007 | Headless Chrome opened `http://localhost:3000`, typed `2+3*4` and Enter | The display showed `14`; also checked at the four screen sizes of spec 002 |
| AC-008 | `FRONTEND_PORT=3100 BACKEND_PORT=8180 docker compose up -d --wait` | The add request succeeded on 3100 and `/health` on 8180 |
| AC-009 | `docker compose exec calculate-service id -u` | `10001` |
| AC-010 | `docker compose down`, then `docker compose ps -q` | No containers left |

Also observed:

| | |
| --- | --- |
| Service image size | 21.5 MB |
| Frontend image size | 92.6 MB |
| `Cache-Control` on `/assets/*` | `public, max-age=31536000, immutable` |
| `Cache-Control` on `/` | `no-cache` |

Not checked: Linux and Windows hosts, and processor architectures other than the one of the machine used.
