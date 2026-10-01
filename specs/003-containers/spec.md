# Spec 003: Containers

| | |
| --- | --- |
| Status | Implemented |
| Created | 2026-09-30 |
| Depends on | [Spec 001: Calculate Service](../001-calculate-service/spec.md), [Spec 002: Calculator Frontend](../002-calculator-frontend/spec.md) |
| Design | [plan.md](plan.md) |
| Tasks | [tasks.md](tasks.md) |

This document says what the container setup must do. The design is in [plan.md](plan.md).

## 1. Purpose

Let anyone run the whole application, service and frontend, with one command and nothing installed but Docker.

## 2. Scope

In scope: one image per project, and a Compose file that builds and runs both together.

Out of scope: a development setup with live reload, deployment to a cloud or cluster, TLS, and publishing images to a registry.

## 3. Functional requirements

| ID | Requirement |
| --- | --- |
| FR-001 | `docker compose up --build`, run at the repository root, builds both projects and starts them. It needs neither Go nor Node on the host. |
| FR-002 | The calculator is served at `http://localhost:3000`. The page loads, and a calculation entered in it returns a result. |
| FR-003 | The browser reaches the service through the frontend's own address, under `/api`. No CORS configuration is needed. |
| FR-004 | The service is also reachable directly at `http://localhost:8080`, so the `curl` examples of the README work. |
| FR-005 | Both host ports can be changed without editing any file. |
| FR-006 | The frontend starts only after the service reports healthy. |
| FR-007 | A path that is not a file, such as `/anything`, returns the application page, as a single-page application needs. |
| FR-008 | `docker compose down` stops and removes both containers. |

## 4. Non-functional requirements

| ID | Requirement |
| --- | --- |
| NFR-001 | Each image is built in stages, so the final image holds the built application and not the toolchain or source code. |
| NFR-002 | The service runs as a user that is not root. |
| NFR-003 | Each container has a health check. |
| NFR-004 | Dependency downloads are cached in their own image layer, so a change to source code does not download them again. |

## 5. Acceptance scenarios

Each row reads: **given** `docker compose up --build -d` has finished at the repository root, **when** the request shown is made from the host, **then** the outcome is as shown.

| ID | When | Then |
| --- | --- | --- |
| AC-001 | `docker compose ps` | Both containers are running and healthy |
| AC-002 | `GET http://localhost:3000/` | `200`, and the body is the application page |
| AC-003 | `POST http://localhost:3000/api/v1/add` with `{"numbers": [1, 2, 3]}` | `200` with `{"operation":"add","result":6}` |
| AC-004 | `POST http://localhost:3000/api/v1/divide` with `{"numbers": [1, 0]}` | `422` with code `DIVISION_BY_ZERO`; the service's error passes through unchanged |
| AC-005 | `GET http://localhost:8080/health` | `200` with `{"status":"ok"}` |
| AC-006 | `GET http://localhost:3000/anything` | `200`, and the body is the application page |
| AC-007 | The application is opened in a browser at `http://localhost:3000` and `2 + 3 × 4 =` is typed | The display shows `14` |
| AC-008 | The stack is started with `FRONTEND_PORT=3100 BACKEND_PORT=8180` | The same requests succeed on ports 3100 and 8180 |
| AC-009 | `docker compose exec calculate-service id -u` | A number other than `0` |
| AC-010 | `docker compose down` | Both containers are removed |

## 6. Assumptions

- "Runs both projects" means one container per project, started together, and not two processes in one container. One process per container is the standard practice: each can be restarted, scaled, and logged on its own.
- The images are for running the application, not for developing it. For development, run the two projects on the host as the README describes.
