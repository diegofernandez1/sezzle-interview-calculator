# Sezzle Calculator

A calculator application, built spec-first.

## Layout

| Folder | Contents |
| --- | --- |
| [specs/](specs/) | Specifications. Each feature has a numbered folder with its requirements, API contract, design, and tasks |
| [backend/calculate-service/](backend/calculate-service/) | Go microservice that does the arithmetic over HTTP |
| [frontend/](frontend/) | React single-page application: the calculator people use |
| [docker-compose.yml](docker-compose.yml) | Builds and runs both projects in containers |

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
| [002 Calculator Frontend](specs/002-calculator-frontend/spec.md) | Implemented |
| [003 Containers](specs/003-containers/spec.md) | Implemented |

## Run with Docker

Requires only Docker. From the repository root:

```sh
docker compose up --build
```

Open <http://localhost:3000>. To stop, press Ctrl+C, then remove the containers:

```sh
docker compose down
```

This builds one image per project and runs them together:

| Container | Address | What it is |
| --- | --- | --- |
| `frontend` | <http://localhost:3000> | nginx serving the built application. It forwards `/api` to the service, so the browser uses a single address |
| `calculate-service` | <http://localhost:8080> | The Go service. Published so the `curl` examples below work |

The frontend starts once the service reports healthy.

| Variable | Default | Meaning |
| --- | --- | --- |
| `FRONTEND_PORT` | `3000` | Host port of the application |
| `BACKEND_PORT` | `8080` | Host port of the service |
| `CORS_ALLOWED_ORIGINS` | `*` | Origins allowed to call the service directly from a browser |

```sh
FRONTEND_PORT=3100 BACKEND_PORT=8180 docker compose up --build
```

To run in the background, add `-d`; then `docker compose logs -f` shows the logs.

### With docker run

The same two containers can be built and started without Compose. From the repository root:

```sh
# Build one image per project
docker build -t calculate-service backend/calculate-service
docker build -t calculator-frontend frontend

# A network, so the frontend can reach the service by name
docker network create calculator

# Start the service, then the frontend
docker run -d --name calculate-service --network calculator -p 8080:8080 calculate-service
docker run -d --name calculator-frontend --network calculator -p 3000:80 calculator-frontend
```

Open <http://localhost:3000>.

The service container must be named `calculate-service`, because that is the address the frontend forwards `/api` to. To use another name or address, pass it to the frontend:

```sh
docker run -d --name calculator-frontend --network calculator -p 3000:80 \
  -e CALC_SERVICE_URL=http://my-service:8080 calculator-frontend
```

To use other host ports, change the number before the colon, as in `-p 3100:80`.

| Command | What it does |
| --- | --- |
| `docker ps` | Lists the running containers and their health |
| `docker logs -f calculate-service` | Follows the service's request log |
| `docker logs -f calculator-frontend` | Follows the nginx log |

To stop and remove everything:

```sh
docker rm -f calculator-frontend calculate-service
docker network rm calculator
```

To run the service alone, without the frontend, no network is needed:

```sh
docker run --rm -p 8080:8080 calculate-service
```

### Docker files

The files are [docker-compose.yml](docker-compose.yml), [backend/calculate-service/Dockerfile](backend/calculate-service/Dockerfile), [frontend/Dockerfile](frontend/Dockerfile), and [frontend/nginx.conf.template](frontend/nginx.conf.template); the design is in [specs/003-containers/plan.md](specs/003-containers/plan.md).

## Run without Docker

Use this for development. Requires Go 1.24 or later and Node 20 or later. Use two terminals.

```sh
cd backend/calculate-service
go run ./cmd/server
```

```sh
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173>. The dev server forwards `/api` to the service on port 8080.

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

## Calculator Frontend

A React single-page application built with MUI. It looks like the calculator in a Google search and uses the calculate service for all arithmetic; the application does none itself.

The code is in [frontend/](frontend/):

```text
src/
├── App.tsx               theme, page layout, heading
├── theme.ts              MUI theme, light and dark
├── api/                  one function per service endpoint
├── calculator/           the logic, with no React: input rules, parser, evaluator
├── hooks/                useCalculator (state and evaluation), useKeyboard
├── components/           Calculator, Display, Keypad, CalcButton
└── test/                 test setup and an in-memory stand-in for the service
```

The requirements, design, and requirement-to-test table are in [specs/002-calculator-frontend](specs/002-calculator-frontend/).

### Using the calculator

Build an expression with the buttons or the keyboard, then press `=`.

| Button | Key | What it does |
| --- | --- | --- |
| `0` to `9` | `0` to `9` | Digit |
| `.` | `.` or `,` | Decimal point |
| `+` | `+` | Add |
| `−` | `-` | Subtract, or a negative sign at the start or after `×`, `÷`, `xʸ`, `% of`, `(`, `√` |
| `×` | `*` or `x` | Multiply |
| `÷` | `/` | Divide |
| `xʸ` | `^` | Exponent |
| `√` | `r` | Square root of what follows |
| `% of` | `%` | What percentage the left side is of the right side: `25 % of 200` is `12.5` |
| `(` and `)` | `(` and `)` | Parentheses |
| `=` | `Enter` or `=` | Evaluate |
| `⌫` | `Backspace` | Remove the last digit or item |
| `AC` | `Escape` or `Delete` | Clear everything |

Keys work without clicking anything first. Buttons can also be reached with Tab and pressed with Enter or Space.

After a result, pressing an operator continues from that result, pressing a digit starts again, and pressing `√` takes the square root of the result.

### Chained operations

An expression can hold several operations. They follow the standard order of operations in arithmetic:

| Order | Operations | Direction | Example |
| --- | --- | --- | --- |
| 1 | Parentheses | Innermost first | `2 × (3 + 4)` is `14` |
| 2 | Square root | | `2 + √16 × 3` is `14` |
| 3 | Exponent | Right to left | `2 ^ 3 ^ 2` is `512`; `−3 ^ 2` is `−9` |
| 4 | Multiply, divide, `% of` | Left to right | `8 ÷ 2 × 4` is `16` |
| 5 | Add, subtract | Left to right | `10 − 3 + 2` is `9` |

So `2 + 3 × 4` is `14`, not `20`, and `100 − 2 ^ 3 × 5 + √81 ÷ 3` is `63`.

Each operation is one request to the service, sent in that order. A run of the same operation is sent as a single request, because the service takes a list.

| Expression | Requests, in order | Result |
| --- | --- | --- |
| `1 + 2 + 3` | add `[1, 2, 3]` | `6` |
| `10 − 3 − 2` | subtract `[10, 3, 2]` | `5` |
| `2 + 3 × 4` | multiply `[3, 4]`, then add `[2, 12]` | `14` |
| `(2 + 3) × 4` | add `[2, 3]`, then multiply `[5, 4]` | `20` |
| `√(9 + 7)` | add `[9, 7]`, then square root `16` | `4` |
| `2 ^ 3 ^ 2` | exponent `3, 2`, then exponent `2, 9` | `512` |

If a request fails, the calculator stops, shows a message such as `Can't divide by zero`, and keeps the expression so it can be corrected.

Results are shown rounded to 12 significant digits, so `0.1 + 0.2` shows `0.3`. The exact value is used if the calculation continues.

### Screen sizes

The layout adapts to the screen. It was checked at 320 × 568, 375 × 667, 667 × 375, and 568 × 320: the display and every button are in view without scrolling at each.

- On a narrow screen the calculator fills the width.
- On a short screen the buttons are shorter and the keyboard hint is hidden.
- On a short, wide screen, such as a phone held sideways, the display sits beside the keypad.
- A long expression is set in smaller text. If it is still too long, the display shows its end and can be scrolled sideways.

The colors follow the system light or dark setting.

### Commands

Run these in `frontend/`.

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the dev server on port 5173 |
| `npm test` | Runs the tests once |
| `npm run test:watch` | Runs the tests on every change |
| `npm run coverage` | Runs the tests and reports coverage |
| `npm run typecheck` | Checks the types |
| `npm run build` | Type checks, then builds for production into `dist/` |
| `npm run preview` | Serves the production build |

### Frontend configuration

| Variable | Default | Used by | Meaning |
| --- | --- | --- | --- |
| `VITE_API_URL` | empty | The build | Address of the calculate service. Empty means the page's own origin |
| `CALC_SERVICE_URL` | `http://localhost:8080` | The dev server | Where the dev server forwards `/api` |
| `CALC_SERVICE_URL` | unset | The tests | When set, the live-service tests run against this address |

In development leave `VITE_API_URL` empty: the browser calls the dev server, which forwards to the service. For a production build served from another origin, set it and allow that origin in the service:

```sh
VITE_API_URL=https://calc.example.com npm run build
CORS_ALLOWED_ORIGINS=https://app.example.com go run ./cmd/server
```

### Frontend tests

The tests use Vitest and React Testing Library. Every source file has a test file beside it.

| Tests | What they cover |
| --- | --- |
| `calculator/*.test.ts` | Input rules, parsing, evaluation order, formatting, messages, key map |
| `api/calculatorApi.test.ts` | The request each operation sends, and how failures are reported, with `fetch` stubbed |
| `hooks/*.test.ts(x)` | Evaluation flow and the keyboard listener |
| `components/*.test.tsx` | Each component; `Calculator.test.tsx` runs the acceptance scenarios by clicking and typing |
| `App.test.tsx` | The whole page with the real service client and `fetch` stubbed |
| `api/live.integration.test.ts` | A few expressions against a running service; skipped unless `CALC_SERVICE_URL` is set |

Each test name starts with the ID of the acceptance scenario it verifies. To run the tests for one scenario:

```sh
npx vitest run -t AC-016
```

To include the live-service tests, start the service and run:

```sh
CALC_SERVICE_URL=http://localhost:8080 npm test
```
