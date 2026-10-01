# Tasks 002: Calculator Frontend

The work to implement [spec.md](spec.md) following [plan.md](plan.md), in order. Each task names the requirements it covers. A box is ticked when the task is done.

## Phase 1: Specification

- [x] T001 Write `spec.md`: requirements and acceptance scenarios.
- [x] T002 Write `plan.md`: the technical design.
- [x] T003 Write `tasks.md`: this file.

## Phase 2: Setup

- [x] T004 Create the Vite, React, TypeScript, and MUI project in `frontend/`, with Vitest and React Testing Library. (NFR-001, NFR-002)

## Phase 3: Logic

- [x] T005 Write the tests for `calculator/` and `api/`, and the fake service.
- [x] T006 Write `types.ts`, `keys.ts`, and `format.ts`. (FR-001 to FR-003, FR-018, FR-025)
- [x] T007 Write `state.ts`: the reducer. (FR-004 to FR-009, FR-017, FR-019, FR-022, FR-024)
- [x] T008 Write `parser.ts` and `evaluate.ts`. (FR-010 to FR-016, FR-023)
- [x] T009 Write `calculatorApi.ts` and `messages.ts`. (FR-020, FR-021, FR-032, FR-033)

## Phase 4: Interface

- [x] T010 Write the tests for the hooks and components.
- [x] T011 Write `useCalculator.ts` and `useKeyboard.ts`. (FR-024 to FR-026, FR-029)
- [x] T012 Write `CalcButton.tsx`, `Keypad.tsx`, and `Display.tsx`. (FR-001 to FR-003, FR-027, FR-028, FR-030)
- [x] T013 Write `Calculator.tsx`, `App.tsx`, `theme.ts`, and `main.tsx`. (FR-031)

## Phase 5: Responsive layout

Added after a change to the spec: FR-034 to FR-037 and AC-055 to AC-057.

- [x] T014 Add the requirements and scenarios to `spec.md` and the design to `plan.md`.
- [x] T015 Write the display tests for text size, scrolling, and message wrapping. (AC-055 to AC-057)
- [x] T016 Make the display fit long text; add the media queries for narrow and short screens. (FR-034 to FR-037)

## Phase 5b: Order of operations

Added to confirm FR-011 with expressions that mix every level. No code changed; the parser already followed the standard order.

- [x] T016b Add AC-058 to `spec.md` and its 24 expressions to `evaluate.test.ts`, with a selection in `Calculator.test.tsx` and `live.integration.test.ts`. (FR-011)

## Phase 5c: Cursor

Added after a change to the spec: FR-038 to FR-045 and AC-059 to AC-075.

- [x] T016c Add the requirements and scenarios to `spec.md` and the design to `plan.md`.
- [x] T016d Track the cursor in `state.ts` and edit at it; split the display text into items in `format.ts`. (FR-038, FR-040 to FR-045)
- [x] T016e Add the `◀` and `▶` buttons and the arrow, Home, and End keys in `keys.ts`. The keypad becomes a full 5 by 5 grid; `0` and `=` no longer span two cells. (FR-039)
- [x] T016f Draw the caret in `Display.tsx`, place it on click, and keep it in view. (FR-036, FR-038, FR-039)
- [x] T016g Write the cursor tests in `state.test.ts`, `Display.test.tsx`, `Calculator.test.tsx`, `keys.test.ts`, and `useKeyboard.test.tsx`.

## Phase 6: Documentation

- [x] T017 Add the frontend to the root `README.md`.

## Phase 7: Verification

- [x] T018 Type check, tests, and production build are clean.
- [x] T019 Run the application in a real browser against the real service, at the four screen sizes of FR-034.
- [x] T020 Fill in the traceability table below.

## Verification results

Recorded on 2026-09-30 with Node 22.14, Vitest 5, React 19, and MUI 9.

| Check | Result |
| --- | --- |
| `npm run typecheck` | No errors |
| `npm test` | 493 test cases pass; the 21 live-service cases are skipped |
| `CALC_SERVICE_URL=... npm test` | 514 test cases pass, including 21 against the running service |
| Coverage | 100% of statements, lines, and functions; 99.2% of branches |
| Acceptance scenarios with a test | 75 of 75 |
| `npm run build` | Succeeds |

The two uncovered branches are defensive: a service error without a message text, and a parser failure that is not an incomplete expression.

### Real browser

The application was opened in headless Chrome from the Vite dev server, with the real calculate service behind the proxy. At each screen size the keys `2+3*4 Enter`, a 36-character expression, and `r-4 Enter` were typed, and the page was measured. The run was repeated after the cursor was added; the table shows that run.

| Screen | Scheme | Layout | Display and all 25 buttons in view | Page scrolls | Smallest button | `2 + 3 × 4` | End of long expression in view | Long message fully visible |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 320 × 568 | Light | Stacked | Yes | No | 50 × 47 px | `14` | Yes | Yes, on two lines |
| 375 × 667 | Dark | Stacked | Yes | No | 61 × 52 px | `14` | Yes | Yes |
| 667 × 375 | Light | Side by side | Yes | No | 66 × 36 px | `14` | Yes | Yes |
| 568 × 320 | Dark | Side by side | Yes | No | 56 × 36 px | `14` | Yes | Yes, on two lines |

This also confirms the dev-server proxy, the light and dark schemes, and keyboard input in a real browser.

The cursor was checked in the same run, at each of the four sizes:

| Step | Result |
| --- | --- |
| Nothing entered | `0‸` |
| Keys `12+3`, `ArrowLeft` twice, `5` | `125‸ + 3` |
| Mouse click on the right half of the `+` | `125 + ‸3` |
| `Enter` | `128‸` |
| 36-character expression, then `Home` | The line scrolled back to its start; the caret was in view |

Not checked: a physical phone and a screen reader. Firefox and WebKit, and these screen-size checks as repeatable tests, are covered by the end-to-end suite of [spec 004](../004-end-to-end-tests/tasks.md), which replaced the one-off script used here.

## Traceability

Tests are in `frontend/src/`, beside the files they test. Test case names start with the scenario ID, so `npx vitest run -t AC-016` runs the tests for one scenario.

| Requirement | Scenarios | Tests |
| --- | --- | --- |
| FR-001 to FR-003 Keypad | AC-048 | `keys.test.ts`, `Keypad.test.tsx`, `CalcButton.test.tsx` |
| FR-004 Numbers | AC-001 to AC-004 | `state.test.ts`, `Calculator.test.tsx` |
| FR-005 Operators | AC-005 to AC-007 | `state.test.ts`, `format.test.ts`, `Calculator.test.tsx` |
| FR-006 Negative sign | AC-008 | `state.test.ts`, `format.test.ts`, `Calculator.test.tsx` |
| FR-007 Close parenthesis | AC-009 | `state.test.ts`, `Calculator.test.tsx` |
| FR-008 Inserted multiplication | AC-010 | `state.test.ts`, `Calculator.test.tsx` |
| FR-009 Backspace and clear | AC-011, AC-012 | `state.test.ts`, `Calculator.test.tsx` |
| FR-010 Service does the arithmetic | AC-013 to AC-025 | `evaluate.test.ts`, `Calculator.test.tsx`, `App.test.tsx`, `live.integration.test.ts` |
| FR-011 Order of operations | AC-016, AC-019, AC-020, AC-022, AC-023, AC-058 | `parser.test.ts`, `evaluate.test.ts`, `Calculator.test.tsx`, `live.integration.test.ts` |
| FR-012 One request per run | AC-014, AC-015, AC-017, AC-018 | `parser.test.ts`, `evaluate.test.ts`, `Calculator.test.tsx` |
| FR-013 Percentage | AC-021 | `parser.test.ts`, `evaluate.test.ts`, `Calculator.test.tsx` |
| FR-014 Open parentheses | AC-024 | `parser.test.ts`, `evaluate.test.ts`, `Calculator.test.tsx` |
| FR-015 Single number | AC-025 | `parser.test.ts`, `evaluate.test.ts`, `useCalculator.test.ts`, `Calculator.test.tsx` |
| FR-016 Incomplete expression | AC-026 | `parser.test.ts`, `useCalculator.test.ts`, `Calculator.test.tsx` |
| FR-017 Result and previous expression | AC-027 | `state.test.ts`, `Display.test.tsx`, `Calculator.test.tsx` |
| FR-018 Rounding | AC-028 | `format.test.ts`, `state.test.ts`, `Calculator.test.tsx` |
| FR-019 After a result | AC-029 to AC-033 | `state.test.ts`, `useCalculator.test.ts`, `Calculator.test.tsx` |
| FR-020 Service error messages | AC-034 to AC-036 | `messages.test.ts`, `calculatorApi.test.ts`, `Calculator.test.tsx`, `App.test.tsx` |
| FR-021 Unreachable and unexpected | AC-037, AC-038 | `messages.test.ts`, `calculatorApi.test.ts`, `Calculator.test.tsx`, `App.test.tsx` |
| FR-022 Recovering from an error | AC-034, AC-039 | `state.test.ts`, `useCalculator.test.ts`, `Calculator.test.tsx` |
| FR-023 Stop at first failure | AC-040 | `evaluate.test.ts`, `Calculator.test.tsx` |
| FR-024 Waiting | AC-041 | `state.test.ts`, `useCalculator.test.ts`, `Display.test.tsx`, `Keypad.test.tsx`, `Calculator.test.tsx` |
| FR-025 Keyboard keys | AC-042 to AC-046 | `keys.test.ts`, `useKeyboard.test.tsx`, `Calculator.test.tsx` |
| FR-026 Modifier keys | AC-047 | `useKeyboard.test.tsx`, `Calculator.test.tsx` |
| FR-027 Accessible names | AC-048 | `CalcButton.test.tsx`, `Keypad.test.tsx`, `Calculator.test.tsx` |
| FR-028 Status and alert | AC-049 | `Display.test.tsx`, `Calculator.test.tsx` |
| FR-029 Enter on a focused button | AC-050 | `useKeyboard.test.tsx`, `CalcButton.test.tsx`, `Calculator.test.tsx` |
| FR-030 Mouse click and focus | AC-051 | `CalcButton.test.tsx`, `Calculator.test.tsx` |
| FR-031 Appearance | | Real browser; see the table above |
| FR-032 Requests | AC-052 | `calculatorApi.test.ts`, `App.test.tsx` |
| FR-033 Service address | AC-053 | `calculatorApi.test.ts` |
| Page | AC-054 | `App.test.tsx` |
| FR-034, FR-035 Screen sizes | | Real browser; see the table above |
| FR-036 Long expressions | AC-055, AC-056 | `Display.test.tsx`; real browser |
| FR-037 Long messages | AC-057 | `Display.test.tsx`; real browser |
| NFR-002 Tests for every file | | 15 test files: one beside each source file, plus the live-service test |
| FR-038 Cursor shown | AC-059 | `state.test.ts`, `Display.test.tsx`, `Calculator.test.tsx`; real browser |
| FR-039 Moving the cursor | AC-064 to AC-066, AC-075 | `state.test.ts`, `keys.test.ts`, `useKeyboard.test.tsx`, `Display.test.tsx`, `Keypad.test.tsx`, `Calculator.test.tsx`; real browser |
| FR-040 Inserting at the cursor | AC-060, AC-061, AC-070 | `state.test.ts`, `Calculator.test.tsx` |
| FR-041 Backspace at the cursor | AC-062, AC-063 | `state.test.ts`, `Calculator.test.tsx` |
| FR-042 Neighbors at the cursor | AC-067, AC-068 | `state.test.ts`, `Calculator.test.tsx` |
| FR-043 Minus by context | AC-069 | `state.test.ts`, `Calculator.test.tsx` |
| FR-044 Broken expressions | AC-071 | `state.test.ts`, `Calculator.test.tsx` |
| FR-045 Cursor while waiting or after an error | AC-072 to AC-074 | `state.test.ts`, `Calculator.test.tsx` |
| NFR-003 Test names carry scenario IDs | | All 75 scenario IDs appear in test case names |
