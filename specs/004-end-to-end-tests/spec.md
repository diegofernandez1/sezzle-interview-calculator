# Spec 004: End-to-End Tests

| | |
| --- | --- |
| Status | Implemented |
| Created | 2026-10-01 |
| Depends on | [Spec 001: Calculate Service](../001-calculate-service/spec.md), [Spec 002: Calculator Frontend](../002-calculator-frontend/spec.md) |
| Design | [plan.md](plan.md) |
| Tasks | [tasks.md](tasks.md) |

This document says what the end-to-end test suite must do. The design is in [plan.md](plan.md).

## 1. Purpose

The component tests of spec 002 run in a simulated browser against a stand-in for the service. They cannot show that the real application works in a real browser with the real service. This suite does: it opens the calculator in real browsers, uses it the way a person does, and checks what appears on screen and what is sent to the service.

It replaces the one-off browser script used to verify spec 002 by hand.

## 2. Scope

In scope: the behavior a person sees, tested through the page in Chromium, Firefox, and WebKit, with the real calculate service.

Out of scope: visual comparison against stored screenshots, performance and load testing, and re-testing every input rule (the component tests of spec 002 cover those exhaustively and faster).

## 3. Functional requirements

| ID | Requirement |
| --- | --- |
| FR-001 | The suite is written with Playwright and lives in `frontend/e2e/`. |
| FR-002 | One command runs the suite. It starts the calculate service and the frontend itself and stops them afterwards; nothing has to be started by hand. |
| FR-003 | The tests use the real calculate service. A response is replaced only where the real service cannot be made to produce the situation: an unreachable service, an unexpected response, and a slow response. |
| FR-004 | The suite runs in Chromium, Firefox, and WebKit, and in a phone-sized Chromium with touch input. |
| FR-005 | The suite can also run against an application that is already running, such as the Docker containers of spec 003, given its address. |
| FR-006 | Each test names the acceptance scenario of spec 002 that it verifies, so a failure points at a line of that spec. |
| FR-007 | A failing test leaves a trace, a screenshot, and a video that show what happened. |
| FR-008 | The suite does not run as part of the unit tests, and the unit tests do not run as part of the suite. |

## 4. What the suite covers

Each row is a group of tests. The scenario IDs are those of [spec 002](../002-calculator-frontend/spec.md).

| ID | Area | What is checked | Scenarios of spec 002 |
| --- | --- | --- | --- |
| E2E-01 | Operations | Each of the seven operations, entered with the buttons, shows the right result and sends the right request to the right endpoint | AC-013, AC-015, AC-018 to AC-021, AC-052 |
| E2E-02 | Chained operations | Expressions with several operations send one request per operation, in the order of operations, with the result of one feeding the next; a run of one operation is one request | AC-014, AC-016, AC-017, AC-022 to AC-025, AC-058 |
| E2E-03 | Results | The evaluated expression is shown above the result; a result is rounded for display; the next calculation continues from the exact result or starts again | AC-027 to AC-033 |
| E2E-04 | Errors | Each service error shows its message and keeps the expression; an incomplete expression sends nothing; an unreachable service and an unexpected response show their messages; the calculator recovers | AC-026, AC-034 to AC-040 |
| E2E-05 | Waiting | While the service has not answered, the buttons are disabled, the calculator is marked busy, and keys do nothing | AC-041 |
| E2E-06 | Keyboard | Every key works without focusing anything; modifier combinations are left to the browser | AC-042 to AC-047 |
| E2E-07 | Cursor | The cursor moves with the buttons, the keys, and a click in the display; input and backspace act at the cursor; an edited expression is what is evaluated | AC-059 to AC-075 |
| E2E-08 | Accessibility | Buttons have names and are in a labelled group; results are a status and messages an alert; Tab and Enter work on buttons; a mouse click leaves focus alone; an automated accessibility scan finds no violations in light or dark | AC-048 to AC-051, AC-054 |
| E2E-09 | Responsive layout | At 320 × 568, 375 × 667, 667 × 375, and 568 × 320 the display and every button are in view and the page does not scroll; the display is beside the keypad on short, wide screens; a long expression keeps its cursor in view; a long message is not cut off | AC-055 to AC-057; FR-034 and FR-035, which had no automated test |
| E2E-10 | Touch | On a phone-sized screen with touch input, tapping buttons calculates and tapping the display places the cursor | AC-013, AC-066 |

## 5. Non-functional requirements

| ID | Requirement |
| --- | --- |
| NFR-001 | Tests do not depend on each other or on their order; each starts from a freshly loaded page. |
| NFR-002 | Tests find elements the way a person or a screen reader does, by role and name, and not by CSS class or page structure. |
| NFR-003 | Tests wait for what they expect to appear; none waits for a fixed time. |

## 6. Acceptance

| ID | When | Then |
| --- | --- | --- |
| AC-001 | `npm run e2e` is run in `frontend/` with nothing else running | The service and the frontend start, every test passes in every browser, and both stop |
| AC-002 | `npm test` is run | The unit tests run and the end-to-end tests do not |
| AC-003 | The Docker containers of spec 003 are running and `E2E_BASE_URL=http://localhost:3000 npm run e2e` is run | The suite runs against the containers and passes, without starting anything itself |
| AC-004 | A test is made to fail | The report contains a trace, a screenshot, and a video for it |
