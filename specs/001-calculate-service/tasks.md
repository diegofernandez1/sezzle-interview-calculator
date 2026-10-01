# Tasks 001: Calculate Service

The work to implement [spec.md](spec.md) following [plan.md](plan.md), in order. Each task names the requirements it covers. A box is ticked when the task is done.

## Phase 1: Specification

- [x] T001 Write `spec.md`: requirements and acceptance scenarios.
- [x] T002 Write `contracts/openapi.yaml`: the API contract.
- [x] T003 Write `plan.md`: the technical design.
- [x] T004 Write `tasks.md`: this file.

## Phase 2: Setup

- [x] T005 Create the Go module in `backend/calculate-service/`. (NFR-001)

## Phase 3: Calculator

- [x] T006 Write `internal/calculator/calculator_test.go` from AC-001 to AC-038. (FR-001 to FR-007, FR-015 to FR-019)
- [x] T007 Write `internal/calculator/calculator.go` until T006 passes.

## Phase 4: API

- [x] T008 Write `internal/api/api_test.go` from AC-001 to AC-061. (all FR)
- [x] T009 Write `response.go`: JSON writers, error type, error mapping. (FR-008, FR-009, FR-015 to FR-018, FR-023)
- [x] T010 Write `requests.go`: body decoding, request types, validation. (FR-010 to FR-014)
- [x] T011 Write `handlers.go` and `router.go`: operation handlers, routes, `404`, `405`, health. (FR-001 to FR-007, FR-020, FR-021)
- [x] T012 Write `middleware.go`: logging, panic recovery, CORS. (FR-022, FR-023)

## Phase 5: Server

- [x] T013 Write `cmd/server/main.go`: configuration, timeouts, graceful shutdown. (NFR-002, NFR-003)

## Phase 6: Documentation

- [x] T014 Write the service documentation: run, test, configuration, endpoints, errors.
- [x] T015 Write the root `README.md`: repo layout, workflow, and the service documentation from T014.

## Phase 7: Verification

- [x] T016 `gofmt -l .`, `go vet ./...`, and `go test ./... -race -cover` are clean.
- [x] T017 Run the server and call every endpoint with `curl`; compare with `contracts/openapi.yaml`.
- [x] T018 Fill in the traceability table below.

## Verification results

Recorded on 2026-09-30 with Go 1.27.1.

| Check | Result |
| --- | --- |
| `gofmt -l .` | No files listed |
| `go vet ./...` | No findings |
| `go test ./... -race -cover` | 300 test cases pass, none fail |
| Coverage, `internal/calculator` | 100.0% of statements |
| Coverage, `internal/api` | 96.9% of statements |
| Acceptance scenarios with a test | 61 of 61 |
| `openapi.yaml` | Parses; all 12 `$ref` targets resolve |

The uncovered statements in `internal/api` are defensive paths that no request can reach: a body read failure other than the size limit, a JSON encoding failure, and the default logger.

`cmd/server/main.go` has no automated test. It was verified by running the built server:

| Behavior | How it was checked | Result |
| --- | --- | --- |
| `PORT` (NFR-002) | Started with `PORT=18080` and `PORT=18081` | Served on that port |
| `CORS_ALLOWED_ORIGINS` (NFR-002) | Started with two origins; sent one listed and one unlisted `Origin` | Header set for the listed origin only |
| Graceful shutdown (NFR-003) | Sent `SIGTERM` | Logged `shutting down`, exit code 0 |
| All seven operations and `/health` | `curl` with the bodies from `spec.md` | Responses match `openapi.yaml` |

## Traceability

Tests are in `backend/calculate-service/internal/`. Test case names start with the scenario ID, so `go test ./... -run '/AC-018'` runs the tests for one scenario.

| Requirement | Scenarios | Tests |
| --- | --- | --- |
| FR-001 Add | AC-001 to AC-004 | `calculator`: `TestAdd`. `api`: `TestOperationSuccess`, `TestOperationMathErrors` |
| FR-002 Subtract | AC-005 to AC-008 | `calculator`: `TestSubtract`. `api`: `TestOperationSuccess`, `TestOperationMathErrors` |
| FR-003 Multiply | AC-009 to AC-013 | `calculator`: `TestMultiply`. `api`: `TestOperationSuccess`, `TestOperationMathErrors` |
| FR-004 Divide | AC-014 to AC-019 | `calculator`: `TestDivide`, `TestDivideByZeroNamesPosition`. `api`: `TestOperationSuccess`, `TestOperationMathErrors` |
| FR-005 Exponent | AC-020 to AC-027 | `calculator`: `TestExponent`. `api`: `TestOperationSuccess`, `TestOperationMathErrors` |
| FR-006 Square root | AC-028 to AC-031 | `calculator`: `TestSquareRoot`. `api`: `TestOperationSuccess`, `TestOperationMathErrors` |
| FR-007 Percentage | AC-032 to AC-038 | `calculator`: `TestPercentage`. `api`: `TestOperationSuccess`, `TestOperationMathErrors` |
| FR-008 Success format | Every `200` scenario | `api`: the `assertResult` helper, used by every success test |
| FR-009 Error format | Every error scenario | `api`: the `assertError` helper, used by every error test |
| FR-010 Body format | AC-039 to AC-044 | `api`: `TestBodyValidationAllEndpoints`, `TestBodyValidation` |
| FR-011 Fields | AC-045 to AC-048 | `api`: `TestBodyValidationAllEndpoints`, `TestBodyValidation` |
| FR-012 Operand count | AC-049 to AC-051 | `api`: `TestBodyValidation`, `TestOperandLimit`. `calculator`: `TestTooFewOperands` |
| FR-013 Content type | AC-052, AC-053 | `api`: `TestContentType` |
| FR-014 Body size | AC-054 | `api`: `TestPayloadTooLarge` |
| FR-015 Division by zero | AC-017, AC-018, AC-025, AC-037 | `calculator`: `TestDivide`, `TestExponent`, `TestPercentage`. `api`: `TestOperationMathErrors`, `TestToAPIError` |
| FR-016 Negative square root | AC-031 | `calculator`: `TestSquareRoot`. `api`: `TestOperationMathErrors`, `TestToAPIError` |
| FR-017 Undefined result | AC-026 | `calculator`: `TestExponent`, `TestAdd`. `api`: `TestOperationMathErrors`, `TestToAPIError` |
| FR-018 Result out of range | AC-004, AC-008, AC-013, AC-019, AC-027, AC-038 | `calculator`: all operation tests. `api`: `TestOperationMathErrors`, `TestToAPIError` |
| FR-019 Negative zero | AC-012 | `calculator`: `TestMultiply`, `TestDivide`, `TestSquareRoot`, `TestPercentage`. `api`: `TestNegativeZeroEncoding` |
| FR-020 Not found, wrong method | AC-055, AC-056 | `api`: `TestNotFound`, `TestMethodNotAllowed` |
| FR-021 Health | AC-057 | `api`: `TestHealth` |
| FR-022 CORS | AC-058 to AC-060 | `api`: `TestCORS` |
| FR-023 Internal error | AC-061 | `api`: `TestRecoverPanics`, `TestToAPIError` |
| NFR-001 Standard library only | | `go.mod` has no `require` entries |
| NFR-002 Environment configuration | | Checked by running the server; see the table above |
| NFR-003 Graceful shutdown | | Checked by running the server; see the table above |
| NFR-004 Stateless | | By design: no package-level state, no storage |
| NFR-005 Test names carry scenario IDs | | All 61 scenario IDs appear in test case names |
