# Tasks 004: End-to-End Tests

The work to implement [spec.md](spec.md) following [plan.md](plan.md), in order.

- [x] T001 Write `spec.md`, `plan.md`, and `tasks.md`.
- [x] T002 Add Playwright and the axe checker to `frontend/`; install Chromium, Firefox, and WebKit. (FR-001, FR-004)
- [x] T003 Write `playwright.config.ts`: projects, the two servers, failure artifacts, `E2E_BASE_URL`. (FR-002, FR-004, FR-005, FR-007)
- [x] T004 Keep the two test runners apart: exclude `e2e/` from Vitest; ignore the report folders. (FR-008)
- [x] T005 Write `e2e/calculatorPage.ts`. (FR-006, NFR-001 to NFR-003)
- [x] T006 Write `operations.spec.ts`. (E2E-01, E2E-02)
- [x] T007 Write `results-and-errors.spec.ts`. (E2E-03, E2E-04, E2E-05)
- [x] T008 Write `keyboard-and-cursor.spec.ts`. (E2E-06, E2E-07, E2E-10)
- [x] T009 Write `accessibility-and-layout.spec.ts`. (E2E-08, E2E-09)
- [x] T010 Fix the two defects the suite found; see below.
- [x] T011 Run the acceptance checks of the spec.
- [x] T012 Add the suite to the root `README.md`.

## Defects found by the suite

The first full run failed four tests. Both causes were defects in the application, not in the tests, and were invisible to the unit tests, which do not render colors or run Firefox.

| Defect | Found by | Fix |
| --- | --- | --- |
| In dark mode the error message had a contrast ratio of 4.37 to 1 against the card. WCAG 2.1 AA requires 4.5 | The accessibility scan, in all three browsers | The dark scheme's error color is now `#f28b82`. Spec 002 FR-031 now states the contrast requirement |
| In Firefox the first Tab landed on the display and not on the first button. Firefox makes any scrollable element a Tab stop; the other browsers do not | The Tab-order test, in Firefox | The display line has `tabindex="-1"`. Spec 002 FR-029 now says the display is not a Tab stop. A unit test was added |

## Verification results

Recorded on 2026-10-01 with Playwright 1.63 on macOS: Chromium 153, Firefox 155, WebKit 26.6.

| Scenario | How it was checked | Result |
| --- | --- | --- |
| AC-001 | `npm run e2e` with nothing running | Both servers started; 372 tests passed, 1 skipped; afterwards nothing was listening on ports 18080 and 15173 |
| AC-002 | `npm test` | 14 unit test files ran (493 tests); no file from `e2e/` |
| AC-003 | `docker compose up --build -d --wait`, then `E2E_BASE_URL=http://localhost:3000 npm run e2e` | 372 passed, 1 skipped, against the containers |
| AC-004 | The first run, where four tests failed | Each failure had a screenshot, a video, and a trace in `test-results/` |

Tests per project:

| Project | Tests | Result |
| --- | --- | --- |
| `chromium` | 123 | 123 passed |
| `firefox` | 123 | 123 passed |
| `webkit` | 123 | 122 passed, 1 skipped |
| `mobile` | 4 | 4 passed |
| Total | 373 | 372 passed, 1 skipped |

A full run takes about a minute and a half.

The skipped test is "buttons are reached with Tab" in WebKit. Safari moves between buttons with Tab only when a macOS setting is on, so the test would check that setting.

Not checked: Windows and Linux, real phones, and a screen reader. The accessibility scan finds what can be detected automatically, which is a part of WCAG and not all of it.

## Coverage of spec 002

Each test name starts with the scenario of [spec 002](../002-calculator-frontend/spec.md) it verifies.

| Group | File | Scenarios of spec 002 |
| --- | --- | --- |
| E2E-01 Operations | `operations.spec.ts` | AC-013, AC-015, AC-018 to AC-021, AC-052 |
| E2E-02 Chained operations | `operations.spec.ts` | AC-014, AC-016, AC-017, AC-019, AC-020, AC-022 to AC-025, AC-058 |
| E2E-03 Results | `results-and-errors.spec.ts` | AC-012, AC-027 to AC-033 |
| E2E-04 Errors | `results-and-errors.spec.ts` | AC-026, AC-034 to AC-040 |
| E2E-05 Waiting | `results-and-errors.spec.ts` | AC-041 |
| E2E-06 Keyboard | `keyboard-and-cursor.spec.ts` | AC-016, AC-039, AC-042 to AC-047 |
| E2E-07 Cursor | `keyboard-and-cursor.spec.ts` | AC-059 to AC-073 |
| E2E-08 Accessibility | `accessibility-and-layout.spec.ts` | AC-048 to AC-051, AC-054; FR-027, FR-028 by the scan |
| E2E-09 Responsive layout | `accessibility-and-layout.spec.ts` | AC-055 to AC-057; FR-034, FR-035 |
| E2E-10 Touch | `keyboard-and-cursor.spec.ts` | AC-013, AC-060, AC-066; FR-034 |

Left to the unit tests of spec 002, on purpose: the full set of input rules (AC-001 to AC-011), the service address setting (AC-053), and the cursor while waiting (AC-074, checked here only as part of AC-041).
