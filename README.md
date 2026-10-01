# Sezzle Calculator

A calculator application, built spec-first.

## Layout

| Folder | Contents |
| --- | --- |
| [specs/](specs/) | Specifications. Each feature has a numbered folder with its requirements, API contract, design, and tasks |
| [backend/calculate-service/](backend/calculate-service/) | Go microservice that does the arithmetic over HTTP |
| `frontend/` | The client application (not started) |

## How work is done here

Development is spec-driven. For each feature, in this order:

1. **Specify.** Write `spec.md`: numbered requirements (`FR-001`) and acceptance scenarios (`AC-001`). It says what is built, not how.
2. **Contract.** Write the API contract under `contracts/`.
3. **Plan.** Write `plan.md`: the technical design.
4. **Tasks.** Write `tasks.md`: an ordered checklist that names the requirements each task covers.
5. **Implement.** For each task, write the tests from the acceptance scenarios, then the code that makes them pass. Test names carry the scenario ID.
6. **Verify.** Fill in the requirement-to-test table in `tasks.md`.

The spec is the source of truth. If the code and the spec disagree, fix the code, or change the spec first and then the code.

## Features

| Spec | Status |
| --- | --- |
| [001 Calculate Service](specs/001-calculate-service/spec.md) | Implemented |

## Calculate Service

A Go microservice that does calculator arithmetic over HTTP. It has seven operations: add, subtract, multiply, divide, exponent, square root, and percentage. Each one is a `POST` endpoint that takes JSON and returns JSON.

The service uses only the Go standard library. The code is in [backend/calculate-service/](backend/calculate-service/):

```text
cmd/server/main.go        configuration, server start, graceful shutdown
internal/calculator/      the arithmetic; no HTTP
internal/api/             routing, validation, JSON responses, middleware
```

### Where things are defined

The documents in [specs/001-calculate-service](specs/001-calculate-service/) are the source of truth:

| Document | Contents |
| --- | --- |
| [spec.md](specs/001-calculate-service/spec.md) | Requirements and acceptance scenarios |
| [contracts/openapi.yaml](specs/001-calculate-service/contracts/openapi.yaml) | Full API reference (OpenAPI 3.0) |
| [plan.md](specs/001-calculate-service/plan.md) | Technical design |
| [tasks.md](specs/001-calculate-service/tasks.md) | Task list and the requirement-to-test table |

To browse the API reference, paste `openapi.yaml` into [Swagger Editor](https://editor.swagger.io) or import it into Postman.

### Run

Requires Go 1.24 or later.

```sh
cd backend/calculate-service
go run ./cmd/server
```

The server listens on port 8080. Check it with:

```sh
curl http://localhost:8080/health
```

```json
{"status":"ok"}
```

### Configuration

| Variable | Default | Meaning |
| --- | --- | --- |
| `PORT` | `8080` | Port to listen on |
| `CORS_ALLOWED_ORIGINS` | `*` | Comma-separated origins allowed to call the service from a browser, or `*` for any |

```sh
PORT=9000 CORS_ALLOWED_ORIGINS=http://localhost:3000 go run ./cmd/server
```

### Test

```sh
cd backend/calculate-service
go test ./... -race -cover
```

Each test case name starts with the ID of the acceptance scenario it verifies, such as `AC-018 divide by zero in third position`. To run the tests for one scenario:

```sh
go test ./... -run '/AC-018'
```

### Endpoints

All operation endpoints are `POST`, need the header `Content-Type: application/json`, and take a JSON object.

| Endpoint | Body | Returns |
| --- | --- | --- |
| `/api/v1/add` | `{"numbers": [...]}` | The sum |
| `/api/v1/subtract` | `{"numbers": [...]}` | The first number minus each following number, left to right |
| `/api/v1/multiply` | `{"numbers": [...]}` | The product |
| `/api/v1/divide` | `{"numbers": [...]}` | The first number divided by each following number, left to right |
| `/api/v1/exponent` | `{"base": n, "exponent": n}` | `base` raised to `exponent` |
| `/api/v1/square_root` | `{"number": n}` | The square root |
| `/api/v1/percentage` | `{"value": n, "total": n}` | The percentage of `total` that `value` represents |
| `GET /health` | none | `{"status": "ok"}` |

`numbers` must hold between 2 and 1000 numbers.

A successful response has status `200` and this shape:

```json
{"operation":"add","result":6}
```

#### Add

```sh
curl -X POST http://localhost:8080/api/v1/add \
  -H 'Content-Type: application/json' \
  -d '{"numbers": [1, 2, 3]}'
```

```json
{"operation":"add","result":6}
```

#### Subtract

`[10, 3, 2]` is computed as `10 - 3 - 2`.

```sh
curl -X POST http://localhost:8080/api/v1/subtract \
  -H 'Content-Type: application/json' \
  -d '{"numbers": [10, 3, 2]}'
```

```json
{"operation":"subtract","result":5}
```

#### Multiply

```sh
curl -X POST http://localhost:8080/api/v1/multiply \
  -H 'Content-Type: application/json' \
  -d '{"numbers": [2, 3, 4]}'
```

```json
{"operation":"multiply","result":24}
```

#### Divide

`[100, 5, 2]` is computed as `100 / 5 / 2`. No number after the first may be zero.

```sh
curl -X POST http://localhost:8080/api/v1/divide \
  -H 'Content-Type: application/json' \
  -d '{"numbers": [100, 5, 2]}'
```

```json
{"operation":"divide","result":10}
```

#### Exponent

```sh
curl -X POST http://localhost:8080/api/v1/exponent \
  -H 'Content-Type: application/json' \
  -d '{"base": 2, "exponent": 10}'
```

```json
{"operation":"exponent","result":1024}
```

#### Square root

```sh
curl -X POST http://localhost:8080/api/v1/square_root \
  -H 'Content-Type: application/json' \
  -d '{"number": 9}'
```

```json
{"operation":"square_root","result":3}
```

#### Percentage

`value` is the amount whose percentage is wanted. `total` is the amount that represents 100%.

```sh
curl -X POST http://localhost:8080/api/v1/percentage \
  -H 'Content-Type: application/json' \
  -d '{"value": 25, "total": 200}'
```

```json
{"operation":"percentage","result":12.5}
```

### Errors

Every error has the same shape. Branch on `code`; `message` is for people and its wording may change.

```sh
curl -X POST http://localhost:8080/api/v1/divide \
  -H 'Content-Type: application/json' \
  -d '{"numbers": [10, 2, 0]}'
```

```json
{"error":{"code":"DIVISION_BY_ZERO","message":"division by zero: numbers[2] is zero"}}
```

| Status | Code | Cause |
| --- | --- | --- |
| 400 | `INVALID_JSON` | The body is empty, malformed, not a single JSON object, or has a value of the wrong type or too large to represent |
| 400 | `VALIDATION_ERROR` | A field is missing, `null`, or unknown; or `numbers` has fewer than 2 or more than 1000 elements |
| 404 | `NOT_FOUND` | The path does not exist |
| 405 | `METHOD_NOT_ALLOWED` | The path exists but not for this method; the `Allow` header gives the right one |
| 413 | `PAYLOAD_TOO_LARGE` | The body is larger than 1 MiB |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | `Content-Type` is not `application/json` |
| 422 | `DIVISION_BY_ZERO` | A divisor is zero, `total` is zero, or zero is raised to a negative exponent |
| 422 | `NEGATIVE_SQUARE_ROOT` | The square root of a negative number was requested |
| 422 | `UNDEFINED_RESULT` | The result is not a real number, such as a negative base with a fractional exponent |
| 422 | `RESULT_OUT_OF_RANGE` | The result is too large for a 64-bit float |
| 500 | `INTERNAL_ERROR` | An unexpected failure |

`400` means the request is not well-formed. `422` means the request is well-formed but the math has no valid answer.

### Number precision

Numbers are 64-bit floats, the same as JSON numbers in JavaScript. Decimal fractions are not always exact, and the service returns results as computed without rounding:

```sh
curl -X POST http://localhost:8080/api/v1/add \
  -H 'Content-Type: application/json' \
  -d '{"numbers": [0.1, 0.2]}'
```

```json
{"operation":"add","result":0.30000000000000004}
```

Round for display in the client.
