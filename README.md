# Sezzle Calculator

A calculator application, built spec-first.

## Quick start

With Docker installed, run this one command from the repository root. It builds and starts both the calculate service and the calculator frontend:

```sh
docker compose up --build
```

Then open <http://localhost:3000>.

To stop it, press Ctrl+C and run:

```sh
docker compose down
```

Ports, background mode, and running without Compose are covered in [Run with Docker](#run-with-docker). To run the projects directly on your machine for development, see [Run without Docker](#run-without-docker).

## Tests at a glance

| Suite | Where | Command | What it is |
| --- | --- | --- | --- |
| Service tests | `backend/calculate-service` | `go test ./... -race -cover` | Go tests of the arithmetic and the HTTP API. See [Test](#test) |
| Frontend unit tests | `frontend` | `npm test` | Vitest and React Testing Library, for every component, hook, and module. See [Frontend tests](#frontend-tests) |
| End-to-end tests | `frontend` | `npm run e2e` | Playwright, in Chromium, Firefox, and WebKit, against the real service. See [End-to-End Tests (Playwright)](#end-to-end-tests-playwright) |

## Layout

| Folder | Contents |
| --- | --- |
| [specs/](specs/) | Specifications. Each feature has a numbered folder with its requirements, API contract, design, and tasks |
| [backend/calculate-service/](backend/calculate-service/) | Go microservice that does the arithmetic over HTTP |
| [frontend/](frontend/) | React single-page application: the calculator people use |
| [frontend/e2e/](frontend/e2e/) | End-to-end tests of the whole application, written with Playwright |
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
| [004 End-to-End Tests](specs/004-end-to-end-tests/spec.md) | Implemented |

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
| `⌫` | `Backspace` | Remove the digit or item left of the cursor |
| `◀` and `▶` | `ArrowLeft` and `ArrowRight` | Move the cursor one step |
| | `Home` and `End` | Move the cursor to the start and to the end |
| `AC` | `Escape` or `Delete` | Clear everything |

Keys work without clicking anything first. Buttons can also be reached with Tab and pressed with Enter or Space.

### Editing with the cursor

The blue bar in the display is the cursor: what you type goes there, and backspace removes what is on its left. It starts at the end. Move it with the `◀` and `▶` buttons, with the arrow, Home, and End keys, or by clicking or tapping the place in the display where you want it.

| Starting from | Do this | You get |
| --- | --- | --- |
| `12 + 3` | Move left twice, press `5` | `125 + 3` |
| `123` | Move left once, press `+` | `12 + 3` |
| `12 + 3` | Move left once, press `⌫` | `123` |
| `2 + 3` | Move to just after the `2`, press `×` | `2 × 3` |

The cursor can go inside a number you typed. An operator typed next to another operator replaces it. If an edit leaves something that cannot be calculated, `=` shows `Incomplete expression` and you can keep editing.

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
| `npm run e2e` | Runs the [end-to-end tests](#end-to-end-tests-playwright) in real browsers; starts the service and the frontend itself |
| `npm run e2e:ui` | Opens Playwright's interactive runner |
| `npm run e2e:report` | Opens the report of the last end-to-end run |
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

## End-to-End Tests (Playwright)

The end-to-end tests open the calculator in real browsers, use it as a person does, and check both what is on screen and what is sent to the service. They are written with [Playwright](https://playwright.dev) and use the real calculate service. The requirements, design, and recorded results are in [specs/004-end-to-end-tests](specs/004-end-to-end-tests/).

### Run the end-to-end tests

One-time setup, in `frontend/`:

```sh
npm install
npx playwright install chromium firefox webkit
```

Then:

```sh
npm run e2e
```

Nothing needs to be running first. Playwright starts the calculate service on port 18080 and the frontend on port 15173, runs the tests, and stops both. Go must be installed, because the service is started with `go run`.

The suite has 373 tests: 123 in each of Chromium, Firefox, and WebKit, and 4 touch tests on a phone-sized screen. A run takes about a minute and a half.

```sh
npx playwright test --project=firefox        # one browser
npx playwright test -g AC-016                # the tests for one scenario
npx playwright test --headed                 # watch the browser
npm run e2e:ui                               # interactive runner, with time travel
npm run e2e:report                           # open the report of the last run
```

To test the Docker containers instead, start them and give their address. Playwright then starts nothing itself:

```sh
docker compose up --build -d --wait
E2E_BASE_URL=http://localhost:3000 npm run e2e
```

### What the end-to-end tests cover

| File | What it covers |
| --- | --- |
| [e2e/operations.spec.ts](frontend/e2e/operations.spec.ts) | Each of the seven operations; chained expressions, with the requests sent and their order |
| [e2e/results-and-errors.spec.ts](frontend/e2e/results-and-errors.spec.ts) | Results and continuing from them; every error message; an unreachable service; input disabled while waiting |
| [e2e/keyboard-and-cursor.spec.ts](frontend/e2e/keyboard-and-cursor.spec.ts) | Every key; moving the cursor by button, key, click, and tap; editing in the middle |
| [e2e/accessibility-and-layout.spec.ts](frontend/e2e/accessibility-and-layout.spec.ts) | Names and roles; Tab and Enter; an automated WCAG 2.1 AA scan in light and dark; four phone screen sizes |

Each test name starts with the acceptance scenario of [spec 002](specs/002-calculator-frontend/spec.md) it verifies, such as `AC-016 multiplication before addition`.

### How the end-to-end tests are built

```text
frontend/
├── playwright.config.ts          browsers, servers to start, what to keep on failure
└── e2e/
    ├── calculatorPage.ts         the page as a person uses it; shared by every test
    └── *.spec.ts                 the tests
```

**Configuration.** [playwright.config.ts](frontend/playwright.config.ts) defines four projects and two servers:

| Project | Runs | Purpose |
| --- | --- | --- |
| `chromium`, `firefox`, `webkit` | Every test not tagged `@touch` | The same behavior in the three browser engines |
| `mobile` | The tests tagged `@touch` | A Pixel 7 profile: small screen and touch input |

| Server | Command | Port | Ready when |
| --- | --- | --- | --- |
| Calculate service | `go run ./cmd/server` in `backend/calculate-service` | 18080 | `/health` answers |
| Frontend | `npm run dev` | 15173 | The page answers |

The ports differ from the usual 8080 and 5173, so a run does not collide with servers you started by hand. When `E2E_BASE_URL` is set, no server is started.

**Page object.** [calculatorPage.ts](frontend/e2e/calculatorPage.ts) holds everything the tests know about the page. Each test receives it as a fixture named `calculator`, with a freshly loaded page, so tests do not depend on each other. A test then reads like the scenario it verifies:

```ts
import { expect, test } from './calculatorPage';

test('AC-016 multiplication before addition', async ({ calculator }) => {
  await calculator.press('2 + 3 × 4 =');

  await expect(calculator.display).toHaveText('14');
  expect(calculator.calls).toEqual([
    { operation: 'multiply', body: { numbers: [3, 4] } },
    { operation: 'add', body: { numbers: [2, 12] } },
  ]);
});
```

| Member | What it does |
| --- | --- |
| `press('2 + 3 =')` | Clicks keypad buttons by their labels, separated by spaces, and waits for each evaluation to finish |
| `tap(...)` | The same with touch taps |
| `type('2+3')`, `key('Enter')` | Keyboard input with nothing focused |
| `display`, `message`, `keypad` | The display line, the error message, and the button group, found by role |
| `button('×')` | One keypad button, found by its accessible name |
| `calls` | Every request the page sent to the service, in order, read from the real network traffic |
| `expectCursor('12‸ + 3')` | Checks the display text and where the cursor is |

Elements are found by role and name, the way a screen reader finds them, never by CSS class. Tests wait for what they expect to appear; none waits for a fixed time.

**Real service, with three exceptions.** Requests go to the real service, so a test that checks a request and a result checks the whole path. Three situations cannot be produced by the real service and use Playwright's request routing instead:

| Situation | How it is produced |
| --- | --- |
| The service cannot be reached | The request is aborted |
| An unexpected response | The response is replaced with a `500`, an unknown error code, an HTML error page, or a success without a result |
| A slow response | The request is held until the test releases it, then continues to the real service |

**Accessibility scan.** `@axe-core/playwright` runs the axe rules for WCAG 2.1 levels A and AA on the empty calculator, a result, and an error message, in light and in dark. Any violation fails the test and names the rule.

**Responsive layout.** The layout tests set the screen size themselves, to 320 × 568, 375 × 667, 667 × 375, 568 × 320, and a desktop size, and check that the display and every button are in view, that the page does not scroll, and that a long expression keeps its cursor in view.

**Failures.** For a failing test, Playwright keeps a trace, a screenshot, and a video in `frontend/test-results/` and links them from the report. Open the report with `npm run e2e:report`, or a single trace with `npx playwright show-trace <path to trace.zip>`.

### Add an end-to-end test

1. Add or find the scenario in [spec 002](specs/002-calculator-frontend/spec.md); the test name starts with its ID.
2. Add a `test(...)` to the `*.spec.ts` file for that area, importing `test` and `expect` from `./calculatorPage`.
3. Use `calculator.press`, `calculator.type`, and the locators above. Add a helper to `calculatorPage.ts` if several tests need the same new step.
4. Tag a test `@touch` to run it only on the phone profile.
5. Run it with `npx playwright test -g "<part of the name>"`.

One test is skipped in WebKit: moving between buttons with Tab. Safari does that only with a macOS setting turned on, so the test would check the setting and not the application.
