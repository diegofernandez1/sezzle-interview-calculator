# Spec 001: Calculate Service

| | |
| --- | --- |
| Status | Implemented |
| Created | 2026-09-30 |
| Contract | [contracts/openapi.yaml](contracts/openapi.yaml) |
| Design | [plan.md](plan.md) |
| Tasks | [tasks.md](tasks.md) |

This document says what the service must do. It does not say how; the design is in [plan.md](plan.md). When this document and the code disagree, this document is right and the code is fixed, or this document is changed first.

## 1. Purpose

Provide the arithmetic for a calculator application as an HTTP service. A client sends the operands for one operation and receives the result as JSON.

## 2. Scope

In scope: seven arithmetic operations, input validation, a consistent JSON error format, a health check, and cross-origin access for a browser client.

Out of scope: authentication, rate limiting, persistence, expression parsing (for example `"2 + 3 * 4"`), and arbitrary-precision arithmetic.

## 3. Functional requirements

### Operations

Every operation is a `POST` under `/api/v1` with a JSON object as the body.

| ID | Requirement |
| --- | --- |
| FR-001 | `POST /api/v1/add` receives `numbers`, a list of numbers, and returns their sum. |
| FR-002 | `POST /api/v1/subtract` receives `numbers` and returns the first number minus each following number, in order from left to right. |
| FR-003 | `POST /api/v1/multiply` receives `numbers` and returns their product. |
| FR-004 | `POST /api/v1/divide` receives `numbers` and returns the first number divided by each following number, in order from left to right. |
| FR-005 | `POST /api/v1/exponent` receives `base` and `exponent` and returns `base` raised to `exponent`. |
| FR-006 | `POST /api/v1/square_root` receives `number` and returns its non-negative square root. |
| FR-007 | `POST /api/v1/percentage` receives `value` and `total` and returns the percentage of `total` that `value` represents, where `total` is 100%. |

### Responses

| ID | Requirement |
| --- | --- |
| FR-008 | A successful operation returns status `200` and the body `{"operation": <name>, "result": <number>}`, where the name is the last path segment of the endpoint. |
| FR-009 | Every failure returns the body `{"error": {"code": <string>, "message": <string>}}`. The `code` is a stable identifier that clients may branch on. The `message` is for people and may change. |
| FR-019 | A result of negative zero is returned as `0`. |

Every response with a body has the header `Content-Type: application/json`.

### Input validation

| ID | Requirement |
| --- | --- |
| FR-010 | The body must be exactly one well-formed JSON object whose values have the right type and are representable as 64-bit floats. Otherwise the response is `400` with code `INVALID_JSON`. |
| FR-011 | Every field named in FR-001 to FR-007 is required and must not be `null`, list elements must not be `null`, and no other field may be present. Otherwise the response is `400` with code `VALIDATION_ERROR`, and the message names the offending field. |
| FR-012 | `numbers` must contain at least 2 and at most 1000 elements. Otherwise the response is `400` with code `VALIDATION_ERROR`. |
| FR-013 | The request `Content-Type` must be `application/json`, with or without parameters such as `charset`. Otherwise the response is `415` with code `UNSUPPORTED_MEDIA_TYPE`. |
| FR-014 | The body must not exceed 1 MiB (1,048,576 bytes). Otherwise the response is `413` with code `PAYLOAD_TOO_LARGE`. |

### Mathematical edge cases

A request that is well-formed but has no valid answer returns `422`.

| ID | Requirement |
| --- | --- |
| FR-015 | Division by zero returns `422` with code `DIVISION_BY_ZERO`. This covers a zero divisor in `divide` (any element after the first), a `total` of zero in `percentage`, and zero raised to a negative exponent. For `divide`, the message gives the position of the zero. |
| FR-016 | The square root of a negative number returns `422` with code `NEGATIVE_SQUARE_ROOT`. |
| FR-017 | A result that is not a real number returns `422` with code `UNDEFINED_RESULT`. This covers a negative base raised to a fractional exponent. |
| FR-018 | A result too large for a 64-bit float returns `422` with code `RESULT_OUT_OF_RANGE`. For list operations this applies to every intermediate result, even if later operands would bring the value back into range. |

### Service behavior

| ID | Requirement |
| --- | --- |
| FR-020 | A request to an unknown path returns `404` with code `NOT_FOUND`. A request to a known path with the wrong method returns `405` with code `METHOD_NOT_ALLOWED` and an `Allow` header listing the accepted method. |
| FR-021 | `GET /health` returns `200` and `{"status": "ok"}`. |
| FR-022 | The service answers CORS preflight requests and sets `Access-Control-Allow-Origin` for allowed origins. The allowed origins are configurable; the default allows any origin. |
| FR-023 | An unexpected internal failure returns `500` with code `INTERNAL_ERROR` and a generic message that reveals no internal detail. |

## 4. Non-functional requirements

| ID | Requirement |
| --- | --- |
| NFR-001 | The service depends only on the Go standard library. |
| NFR-002 | The listening port and the allowed CORS origins are set through environment variables. |
| NFR-003 | On `SIGINT` or `SIGTERM` the service stops accepting connections and lets in-flight requests finish. |
| NFR-004 | The service is stateless; requests are independent. |
| NFR-005 | Every acceptance scenario in section 6 is verified by an automated test whose name carries the scenario ID. |

## 5. Number semantics

Numbers are IEEE 754 64-bit floats, the same as JSON numbers in most clients.

- Decimal fractions are not always exact: `0.1 + 0.2` is `0.30000000000000004`. Results are returned as computed, not rounded. Rounding for display is the client's job.
- A result too small to represent rounds to `0`.
- `0` raised to `0` is `1`.
- For `percentage`, a negative `value` or a `value` greater than `total` is valid and gives a result below 0 or above 100.

## 6. Acceptance scenarios

Each row reads: **given** the service is running, **when** the request shown is sent with `Content-Type: application/json` (unless the row says otherwise), **then** the response is as shown. A bare number in the last column means status `200` with that `result`. A status and code means an error response with that `error.code`.

### Add (FR-001)

Endpoint: `POST /api/v1/add`

| ID | Body | Then |
| --- | --- | --- |
| AC-001 | `{"numbers": [1, 2, 3]}` | `6` |
| AC-002 | `{"numbers": [-1.5, 2.5, -3]}` | `-2` |
| AC-003 | `{"numbers": [0.1, 0.2]}` | `0.30000000000000004` |
| AC-004 | `{"numbers": [1.7976931348623157e308, 1.7976931348623157e308]}` | `422 RESULT_OUT_OF_RANGE` |

### Subtract (FR-002)

Endpoint: `POST /api/v1/subtract`

| ID | Body | Then |
| --- | --- | --- |
| AC-005 | `{"numbers": [10, 3, 2]}` | `5` |
| AC-006 | `{"numbers": [3, 10]}` | `-7` |
| AC-007 | `{"numbers": [5, -3]}` | `8` |
| AC-008 | `{"numbers": [-1.7976931348623157e308, 1.7976931348623157e308]}` | `422 RESULT_OUT_OF_RANGE` |

### Multiply (FR-003)

Endpoint: `POST /api/v1/multiply`

| ID | Body | Then |
| --- | --- | --- |
| AC-009 | `{"numbers": [2, 3, 4]}` | `24` |
| AC-010 | `{"numbers": [-2, 3]}` | `-6` |
| AC-011 | `{"numbers": [5, 0, 7]}` | `0` |
| AC-012 | `{"numbers": [-1, 0]}` | `0`, written as `0` and not `-0` (FR-019) |
| AC-013 | `{"numbers": [1e200, 1e200, 0]}` | `422 RESULT_OUT_OF_RANGE` (the intermediate result overflows) |

### Divide (FR-004)

Endpoint: `POST /api/v1/divide`

| ID | Body | Then |
| --- | --- | --- |
| AC-014 | `{"numbers": [100, 5, 2]}` | `10` |
| AC-015 | `{"numbers": [1, 4]}` | `0.25` |
| AC-016 | `{"numbers": [0, 5]}` | `0` |
| AC-017 | `{"numbers": [10, 0]}` | `422 DIVISION_BY_ZERO`; message contains `numbers[1]` |
| AC-018 | `{"numbers": [10, 2, 0]}` | `422 DIVISION_BY_ZERO`; message contains `numbers[2]` |
| AC-019 | `{"numbers": [1e308, 1e-308]}` | `422 RESULT_OUT_OF_RANGE` |

### Exponent (FR-005)

Endpoint: `POST /api/v1/exponent`

| ID | Body | Then |
| --- | --- | --- |
| AC-020 | `{"base": 2, "exponent": 10}` | `1024` |
| AC-021 | `{"base": 2, "exponent": -2}` | `0.25` |
| AC-022 | `{"base": 9, "exponent": 0.5}` | `3` |
| AC-023 | `{"base": -8, "exponent": 3}` | `-512` |
| AC-024 | `{"base": 0, "exponent": 0}` | `1` |
| AC-025 | `{"base": 0, "exponent": -1}` | `422 DIVISION_BY_ZERO` |
| AC-026 | `{"base": -8, "exponent": 0.5}` | `422 UNDEFINED_RESULT` |
| AC-027 | `{"base": 10, "exponent": 400}` | `422 RESULT_OUT_OF_RANGE` |

### Square root (FR-006)

Endpoint: `POST /api/v1/square_root`

| ID | Body | Then |
| --- | --- | --- |
| AC-028 | `{"number": 9}` | `3` |
| AC-029 | `{"number": 2}` | `1.4142135623730951` |
| AC-030 | `{"number": 0}` | `0` |
| AC-031 | `{"number": -4}` | `422 NEGATIVE_SQUARE_ROOT` |

### Percentage (FR-007)

Endpoint: `POST /api/v1/percentage`

| ID | Body | Then |
| --- | --- | --- |
| AC-032 | `{"value": 25, "total": 200}` | `12.5` |
| AC-033 | `{"value": 50, "total": 50}` | `100` |
| AC-034 | `{"value": 300, "total": 200}` | `150` |
| AC-035 | `{"value": -25, "total": 200}` | `-12.5` |
| AC-036 | `{"value": 0, "total": 200}` | `0` |
| AC-037 | `{"value": 25, "total": 0}` | `422 DIVISION_BY_ZERO` |
| AC-038 | `{"value": 1e308, "total": 1}` | `422 RESULT_OUT_OF_RANGE` |

### Body format (FR-010)

AC-039 to AC-042 apply to every operation endpoint.

| ID | Body | Then |
| --- | --- | --- |
| AC-039 | Malformed JSON, such as a valid body with its closing brace removed, or `{not json}` | `400 INVALID_JSON` |
| AC-040 | Empty, or whitespace only | `400 INVALID_JSON` |
| AC-041 | JSON that is not an object: `[1, 2]`, `"abc"`, `5`, `null` | `400 INVALID_JSON` |
| AC-042 | A valid body followed by more data, such as a second object | `400 INVALID_JSON` |
| AC-043 | A value of the wrong type: `{"numbers": "abc"}`, `{"numbers": [1, "2"]}`, `{"base": "2", "exponent": 3}`, `{"number": true}` | `400 INVALID_JSON`; message names the field |
| AC-044 | A number too large to represent: `{"number": 1e999}` | `400 INVALID_JSON` |

### Fields (FR-011, FR-012)

AC-045 and the `{}` case of AC-046 apply to every operation endpoint.

| ID | Body | Then |
| --- | --- | --- |
| AC-045 | A valid body with an extra field, such as `{"numbers": [1, 2], "extra": 1}` | `400 VALIDATION_ERROR`; message names `extra` |
| AC-046 | A required field is missing: `{}`, `{"base": 2}`, `{"exponent": 2}`, `{"value": 25}`, `{"total": 200}` | `400 VALIDATION_ERROR`; message names the missing field |
| AC-047 | A required field is `null`: `{"numbers": null}`, `{"number": null}`, `{"base": 2, "exponent": null}` | `400 VALIDATION_ERROR`; message names the field |
| AC-048 | A list element is `null`: `{"numbers": [1, null, 3]}` | `400 VALIDATION_ERROR`; message contains `numbers[1]` |
| AC-049 | Fewer than 2 numbers: `{"numbers": []}`, `{"numbers": [5]}` | `400 VALIDATION_ERROR` |
| AC-050 | 1001 numbers | `400 VALIDATION_ERROR` |
| AC-051 | Exactly 1000 numbers, each `1`, sent to `add` | `1000` |

### Transport (FR-013, FR-014, FR-020)

| ID | When | Then |
| --- | --- | --- |
| AC-052 | A valid body is sent with `Content-Type: text/plain`, or with no `Content-Type` | `415 UNSUPPORTED_MEDIA_TYPE` |
| AC-053 | A valid body is sent with `Content-Type: application/json; charset=utf-8` | `200` |
| AC-054 | A body larger than 1 MiB is sent | `413 PAYLOAD_TOO_LARGE` |
| AC-055 | Any request is sent to a path that does not exist, such as `/api/v1/modulo` | `404 NOT_FOUND` |
| AC-056 | `GET`, `PUT`, or `DELETE` is sent to an operation endpoint | `405 METHOD_NOT_ALLOWED` with header `Allow: POST` |

### Service (FR-021, FR-022, FR-023)

| ID | When | Then |
| --- | --- | --- |
| AC-057 | `GET /health` | `200` with body `{"status": "ok"}` |
| AC-058 | `OPTIONS` to an operation endpoint with `Origin` and `Access-Control-Request-Method: POST` | `204` with `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, and `Access-Control-Allow-Headers` |
| AC-059 | A valid `POST` with an `Origin` header, default configuration | `200` with `Access-Control-Allow-Origin: *` |
| AC-060 | The allowed origins are set to `https://app.example.com`. One request arrives with that origin and one with `https://other.example.com` | The first response has `Access-Control-Allow-Origin: https://app.example.com`; the second has no `Access-Control-Allow-Origin` header |
| AC-061 | A request handler fails unexpectedly | `500 INTERNAL_ERROR`; the message does not contain the failure detail |

## 7. Assumptions

These were decided without a stated requirement. Changing one means changing this spec first.

- A list operation with fewer than 2 numbers is an error, not an identity result.
- The limits of 1000 numbers and 1 MiB are safety limits chosen to be far above what a calculator needs.
- The route is `/subtract`, the standard spelling.
- CORS allows any origin by default because the service holds no data and uses no credentials.
