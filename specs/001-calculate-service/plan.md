# Plan 001: Calculate Service

The technical design for [spec.md](spec.md). The spec says what the service does; this document says how it is built.

## Technical context

| | |
| --- | --- |
| Language | Go (minimum 1.24) |
| Dependencies | Standard library only (NFR-001) |
| Location | `backend/calculate-service/` |
| Module | `calculate-service` |
| Tests | `testing` and `net/http/httptest` |

## Structure

```text
backend/calculate-service/
├── go.mod
├── cmd/server/main.go            configuration, server start, graceful shutdown
└── internal/
    ├── calculator/               the arithmetic; no HTTP
    │   ├── calculator.go
    │   └── calculator_test.go
    └── api/                      the HTTP layer
        ├── router.go             routes and middleware chain
        ├── handlers.go           one handler per operation
        ├── requests.go           body decoding, request types, validation
        ├── response.go           JSON writers, error type, error mapping
        ├── middleware.go         request logging, panic recovery, CORS
        └── api_test.go
```

The two packages have one-way dependency: `api` imports `calculator`, never the reverse. The arithmetic can be tested and reused without a server.

## Calculator package

Each operation is a function that returns `(float64, error)`.

```go
func Add(numbers []float64) (float64, error)
func Subtract(numbers []float64) (float64, error)
func Multiply(numbers []float64) (float64, error)
func Divide(numbers []float64) (float64, error)
func Exponent(base, exponent float64) (float64, error)
func SquareRoot(number float64) (float64, error)
func Percentage(value, total float64) (float64, error)
```

Failures are sentinel errors, wrapped with detail where it helps (`fmt.Errorf("%w: numbers[%d] is zero", ErrDivisionByZero, i)`), so callers match them with `errors.Is`.

| Sentinel | Raised when |
| --- | --- |
| `ErrTooFewOperands` | A list has fewer than 2 numbers |
| `ErrDivisionByZero` | A divisor is zero, `total` is zero, or zero is raised to a negative exponent |
| `ErrNegativeSquareRoot` | The square root of a negative number is requested |
| `ErrUndefinedResult` | The result is not a real number (NaN) |
| `ErrResultOutOfRange` | The result is infinite |

The four list operations share one helper that walks the list from left to right. After every step the running value passes through a single check that rejects NaN and infinity and turns negative zero into zero. Checking each step, and not only the end, is what makes FR-018 hold for intermediate results: without it `[1e200, 1e200, 0]` would compute `Inf × 0 = NaN` and report the wrong error.

## API package

### Request flow

Each operation endpoint runs the same steps. The first failure ends the request.

| Step | Check | Failure |
| --- | --- | --- |
| 1 | Router matches path and method | `404 NOT_FOUND`, `405 METHOD_NOT_ALLOWED` |
| 2 | `Content-Type` is `application/json` | `415 UNSUPPORTED_MEDIA_TYPE` |
| 3 | Body is read through `http.MaxBytesReader` (1 MiB) | `413 PAYLOAD_TOO_LARGE` |
| 4 | Body is one JSON object with correctly typed values | `400 INVALID_JSON` |
| 5 | Fields are present, non-null, known, and within size limits | `400 VALIDATION_ERROR` |
| 6 | Calculator computes the result | `422` with the code for the sentinel |
| 7 | Result is written | `200` |

### Decoding

- The body is read in full, then decoded with `json.Decoder` and `DisallowUnknownFields`.
- Before decoding, the first non-space byte must be `{`. This rejects arrays, strings, numbers, and `null` with one clear message.
- After decoding, the decoder must be at end of input. This rejects trailing data.
- Required scalars are `*float64` and the list is `[]*float64`. A missing field or a JSON `null` decodes to a nil pointer and is reported; a plain `float64` would silently become `0`.
- `json.SyntaxError` and `json.UnmarshalTypeError` map to `INVALID_JSON`. The unknown-field error maps to `VALIDATION_ERROR`.

### Handlers

One generic function builds every operation handler, so the decode, validate, compute, respond sequence exists once:

```go
func operation[T any](name string, compute func(T) (float64, error)) http.HandlerFunc
```

`T` is the request type for the endpoint. `compute` validates the request, calls the calculator, and returns the result or an error.

### Errors

A single type, `apiError`, carries the status, code, and message. One function maps any error to an `apiError`: validation errors pass through, calculator sentinels become `422` (or `400` for `ErrTooFewOperands`), and anything else becomes `500 INTERNAL_ERROR` with a generic message.

### Routing

`http.ServeMux` with method patterns. Each route is registered twice: once with its method (`POST /api/v1/add`) and once without. The method-less pattern is less specific, so it only receives requests with the wrong method and answers `405` as JSON with an `Allow` header. A catch-all `/` pattern answers `404` as JSON. This replaces the mux's plain-text defaults (FR-020).

### Middleware

Applied in this order, outermost first:

1. **Request logging** with `log/slog`: method, path, status, duration.
2. **Panic recovery**: logs the panic and stack, responds `500 INTERNAL_ERROR` (FR-023).
3. **CORS**: sets `Access-Control-Allow-Origin` for allowed origins and answers preflight requests with `204` (FR-022).

Logging is outermost so that it records the `500` produced by recovery.

## Configuration

| Variable | Default | Meaning |
| --- | --- | --- |
| `PORT` | `8080` | Port the server listens on |
| `CORS_ALLOWED_ORIGINS` | `*` | Comma-separated list of allowed origins, or `*` for any |

## Server

`http.Server` with read, write, and idle timeouts. `signal.NotifyContext` catches `SIGINT` and `SIGTERM`; the server then calls `Shutdown` with a 10-second deadline (NFR-003).

## Testing

- **Calculator tests** call the functions directly with table-driven cases: normal values, negatives, decimals, zeros, and every sentinel error.
- **API tests** send requests through the real router with `httptest` and assert the status, the `Content-Type`, and the decoded JSON body. Scenarios that apply to every operation endpoint run in a loop over all seven.
- Every test case name starts with the acceptance scenario ID it verifies (NFR-005). The mapping from requirement to test is in [tasks.md](tasks.md).

## Requirement coverage

| Requirements | Implemented in |
| --- | --- |
| FR-001 to FR-007 | `internal/calculator/calculator.go`; routes in `internal/api/router.go` |
| FR-008, FR-009 | `internal/api/response.go` |
| FR-010 to FR-014 | `internal/api/requests.go` |
| FR-015 to FR-019 | `internal/calculator/calculator.go`; status mapping in `internal/api/response.go` |
| FR-020, FR-021 | `internal/api/router.go` |
| FR-022, FR-023 | `internal/api/middleware.go` |
| NFR-002, NFR-003 | `cmd/server/main.go` |
