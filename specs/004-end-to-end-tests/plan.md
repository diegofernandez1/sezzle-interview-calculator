# Plan 004: End-to-End Tests

The technical design for [spec.md](spec.md).

## Files

```text
frontend/
├── playwright.config.ts                 browsers, servers to start, what to keep on failure
└── e2e/
    ├── calculatorPage.ts                the page as a person uses it; shared by every test
    ├── operations.spec.ts               E2E-01, E2E-02
    ├── results-and-errors.spec.ts       E2E-03, E2E-04, E2E-05
    ├── keyboard-and-cursor.spec.ts      E2E-06, E2E-07, E2E-10
    └── accessibility-and-layout.spec.ts E2E-08, E2E-09
```

Dependencies added to `frontend/`: `@playwright/test`, and `@axe-core/playwright` for the accessibility scan.

## How a run works

```text
npm run e2e
  └── Playwright
        ├── starts  go run ./cmd/server            on port 18080, waits for /health
        ├── starts  npm run dev                    on port 15173, proxying /api to 18080
        ├── runs the tests in Chromium, Firefox, WebKit, and a phone-sized Chromium
        └── stops both servers
```

The ports differ from the usual 8080 and 5173, so a run does not collide with servers started by hand. Outside CI, a server already listening on those ports is reused, which makes repeated runs faster.

When `E2E_BASE_URL` is set, Playwright starts nothing and tests that address (FR-005). This is how the Docker containers are tested.

## The page object

`calculatorPage.ts` holds everything the tests know about the page, so the tests read like the scenarios in the spec:

```ts
await calculator.press('2 + 3 × 4 =');
await expect(calculator.display).toHaveText('14');
expect(calculator.calls).toEqual([
  { operation: 'multiply', body: { numbers: [3, 4] } },
  { operation: 'add', body: { numbers: [2, 12] } },
]);
```

| Member | What it is |
| --- | --- |
| `press(labels)` | Clicks keypad buttons by the labels used in the spec, separated by spaces. After each click it waits until the calculator is not busy |
| `tap(labels)` | The same with touch taps |
| `type(keys)`, `key(name)` | Keyboard input with nothing focused |
| `display`, `message`, `keypad`, `calculator` | Locators by role: `status`, `alert`, `group`, `region` |
| `button(label)` | One keypad button, found by its accessible name |
| `calls` | Every request the page sent to the service, in order, recorded by listening to the page's network traffic |
| `displayWithCursor()`, `expectCursor(text)` | The display text with `‸` at the cursor, as written in spec 002 |

It is provided to each test as a fixture named `calculator`, which opens a fresh page first (NFR-001).

## Real service, and the three exceptions

Requests go to the real calculate service, and `calls` is read from real network traffic, so a test that checks a request and a result checks the whole path: page, proxy, service, and back.

Three situations cannot be produced by the real service and use Playwright's request routing (FR-003):

| Situation | How |
| --- | --- |
| The service cannot be reached | The request is aborted |
| An unexpected response | The response is replaced: a `500`, an unknown error code, an HTML error page, a success without a result |
| A slow response | The request is held until the test releases it, then continues to the real service |

## Browsers

| Project | Runs | Purpose |
| --- | --- | --- |
| `chromium`, `firefox`, `webkit` | Every test not tagged `@touch` | The same behavior in the three browser engines |
| `mobile` | The tests tagged `@touch` | A Pixel 7 profile: small screen and touch input |

Screen sizes are a separate matter from browsers: the responsive tests set the viewport themselves, to the four sizes of spec 002 and a desktop size, and run in all three engines.

One test is skipped in WebKit: moving between buttons with Tab. Safari does that only with a macOS setting turned on, so the test would check the setting and not the application.

## Accessibility scan

`@axe-core/playwright` runs the axe rules for WCAG 2.1 levels A and AA on three states of the page (empty, a result, a message), in light and in dark. A test fails on any violation and prints the rule that was broken.

## Failures

For a failing test Playwright keeps a trace, a screenshot, and a video under `frontend/test-results/`, and writes an HTML report to `frontend/playwright-report/` (FR-007). Both folders are ignored by Git and by the Docker build. `npm run e2e:report` opens the report.

## Separation from the unit tests

Vitest is configured to exclude `e2e/`, and Playwright only looks in `e2e/` (FR-008). TypeScript checks both.
