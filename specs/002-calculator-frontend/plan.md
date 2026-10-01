# Plan 002: Calculator Frontend

The technical design for [spec.md](spec.md). The spec says what the application does; this document says how it is built.

## Technical context

| | |
| --- | --- |
| Language | TypeScript, strict mode |
| Framework | React 19, built with Vite |
| Components | MUI (`@mui/material`) with Emotion |
| Tests | Vitest, React Testing Library, `user-event`, jsdom |
| Location | `frontend/` |
| Package manager | npm |

## Structure

```text
frontend/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts                 dev server, proxy to the service, test setup
└── src/
    ├── main.tsx                   mounts the application
    ├── App.tsx                    theme, page layout, heading
    ├── theme.ts                   MUI theme, light and dark
    ├── api/
    │   └── calculatorApi.ts       one function per service endpoint
    ├── calculator/                the logic; no React
    │   ├── types.ts               Token, Action, Node
    │   ├── keys.ts                keypad buttons and the keyboard map
    │   ├── state.ts               reducer: how each action changes the expression
    │   ├── parser.ts              tokens to expression tree
    │   ├── evaluate.ts            expression tree to service calls
    │   ├── format.ts              tokens and numbers to display text
    │   └── messages.ts            error to message
    ├── hooks/
    │   ├── useCalculator.ts       state plus evaluation
    │   └── useKeyboard.ts         window key listener
    ├── components/
    │   ├── Calculator.tsx         wires the hooks, display, and keypad
    │   ├── Display.tsx            expression, result, message
    │   ├── Keypad.tsx             the button grid
    │   └── CalcButton.tsx         one button
    └── test/
        ├── setup.ts               jest-dom matchers, cleanup
        └── fakeService.ts         in-memory stand-in for the service
```

Each source file has a test file beside it, named `*.test.ts` or `*.test.tsx`.

The logic in `calculator/` is plain TypeScript with no React. The components only render state and report button presses, so most behavior is tested without rendering anything.

## Data flow

```text
button click ─┐
              ├─> Action ─> reducer (state.ts) ─> tokens ─> Display
key press ────┘
                  "equals" ─> parser ─> tree ─> evaluate ─> service ─> result ─> reducer
```

Buttons and keys produce the same `Action` values, so the two input methods cannot behave differently.

## Expression model

The expression is a list of tokens, not a string:

```ts
type Token =
  | { type: 'number'; text: string; value?: number }
  | { type: 'operator'; op: 'add' | 'subtract' | 'multiply' | 'divide' | 'exponent' | 'percentage' }
  | { type: 'negate' }
  | { type: 'sqrt' }
  | { type: 'lparen' }
  | { type: 'rparen' };
```

A number token keeps the text as typed, so `0.50` is not rewritten while typing. A result carried into the next expression also has `value`, the exact number from the service; `text` is its rounded form for display (FR-018, FR-019).

The reducer in `state.ts` applies the input rules of FR-004 to FR-009 and FR-019. It is a pure function and holds everything the screen shows:

```ts
interface CalculatorState {
  tokens: Token[];
  cursor: number;            // how many items are left of the cursor
  previous: string | null;   // the last evaluated expression, shown above the result
  error: string | null;
  pending: boolean;          // an evaluation is in progress
  evaluated: boolean;        // the tokens are a result that has not been edited
}
```

## Cursor

The cursor is a number: how many items of the expression are on its left (FR-038). An item is what the cursor steps over in one move. A typed number is one item per character, so the cursor can go inside it; every other token, and a carried result, is one item. `format.ts` produces the display text as a list of items (`formatUnits`), and the display draws the caret between two of them.

Editing at the cursor reuses the input rules, which were written for the end of the expression:

1. **Split** the tokens at the cursor into a left part and a right part. A cursor inside a typed number splits that number in two.
2. **Edit** the left part with the same function that applied the rules before the cursor existed. To that function the cursor is simply the end of the expression.
3. **Join**: after an insertion, look at the two tokens that now meet. An operator meeting an operator drops the one on the right. An operand meeting an operand gets a `×` between them, unless both are typed numbers (FR-042).
4. **Normalize** the whole list: two typed numbers side by side become one number, keeping one decimal point (FR-041), and each minus becomes a subtraction or a negative sign according to what is on its left (FR-043).
5. The new cursor is the number of items in the edited left part.

Because step 2 is unchanged, typing at the end behaves exactly as before, and the earlier tests pass untouched.

An edit in the middle can leave something the parser rejects, such as `2(3)`. The reducer does not try to prevent every such case; the parser is the single judge of validity and reports it on equals (FR-044).

In the display, each item is a `span`. A click on one compares the pointer's x position with the middle of the span to choose the side (FR-039). After every change of text or cursor, the caret element is scrolled into view with `scrollIntoView({ inline: 'nearest' })`, which keeps the cursor visible in a long expression (FR-036).

## Parsing

`parser.ts` is a recursive-descent parser that turns tokens into a tree. The grammar gives the order of FR-011:

```text
expression := term (('+' | '−') term)*
term       := unary (('×' | '÷' | '% of') unary)*
unary      := '−' unary | power
power      := primary ('^' unary)?
primary    := number | '(' expression ')' | '√' '−'? primary
```

- A missing `)` at the end of input is accepted (FR-014).
- A negative sign on a number literal becomes a negative literal. On anything else it becomes a `negate` node.
- In `expression` and `term`, when the operator repeats, the new operand is appended to the existing node. `1 + 2 + 3` is one `add` node with three operands, which becomes one request (FR-012).
- Anything else throws, which the caller reports as `Incomplete expression` (FR-016).

## Evaluation

`evaluate.ts` walks the tree depth-first and awaits one service call per node. Operands are evaluated one at a time, left to right, so the request order is deterministic and the first failure stops everything (FR-023). A number node needs no call. A `negate` node calls multiply with `-1`.

The evaluator receives the API as an argument:

```ts
interface CalculatorApi {
  add(numbers: number[]): Promise<number>;
  subtract(numbers: number[]): Promise<number>;
  multiply(numbers: number[]): Promise<number>;
  divide(numbers: number[]): Promise<number>;
  exponent(base: number, exponent: number): Promise<number>;
  squareRoot(number: number): Promise<number>;
  percentage(value: number, total: number): Promise<number>;
}
```

Tests pass `fakeService.ts`, which does the arithmetic in memory, fails the way the service does, and records every call.

## Service client

`calculatorApi.ts` implements `CalculatorApi` with `fetch`. A failed request throws `ApiError` with the service's error code, `NETWORK_ERROR` if the request did not complete, or `UNKNOWN` for anything unexpected. `messages.ts` maps the code to the text of FR-020 and FR-021.

The base address is `VITE_API_URL`, empty by default. With an empty base the browser calls `/api/v1/...` on its own origin, and the Vite dev server proxies `/api` to `http://localhost:8080`. In development no CORS setup is needed.

## Keyboard

`useKeyboard` adds one `keydown` listener to `window`. `keys.ts` maps `event.key` to an `Action`. The listener:

- ignores keys pressed with Ctrl, Meta, or Alt (FR-026);
- ignores Enter when the event target is a button, so the browser activates that button instead (FR-029);
- calls `preventDefault` for keys it handles, so `/` does not open the browser's quick find.

Buttons call `preventDefault` on `mousedown`, which stops a click from moving focus to the button (FR-030). Keyboard focus with Tab is unaffected.

## Components

| Component | Responsibility |
| --- | --- |
| `App` | Theme provider, baseline styles, page heading, centers the calculator |
| `Calculator` | Calls `useCalculator` and `useKeyboard`; renders `Display` and `Keypad` in a card; sets `aria-busy`; shows the keyboard hint |
| `Display` | The previous expression, the current expression or result in a `status` region, the message in an `alert`, a progress bar while pending |
| `Keypad` | A CSS grid of `CalcButton`s inside a labelled `group`, built from the list in `keys.ts` |
| `CalcButton` | An MUI `Button` with a visible label, an accessible name, an `aria-keyshortcuts` hint, and a color by kind: digit, operator, or equals |

### Keypad layout

Five columns and five rows, one button per cell.

```text
(     )     % of   ⌫     AC
7     8     9      ÷     √
4     5     6      ×     xʸ
1     2     3      −     +
0     .     ◀      ▶     =
```

### Appearance

The theme uses MUI color schemes for light and dark and follows the system setting. Digits use the lightest surface, operators a darker one, and equals the primary blue, as in the Google calculator.

The theme has `cssVariables` turned on. The browser then picks the scheme with a `prefers-color-scheme` media query. Without it MUI picks the scheme in JavaScript after the first render, and a person in dark mode sees the light theme flash first.

### Responsive layout

The layout adapts with CSS media queries only; no JavaScript measures the screen (FR-034, FR-035).

| Condition | Change |
| --- | --- |
| Always | The card is as wide as the screen, up to 400 px. The keypad columns share the width equally |
| Width under 600 px | Less padding around and inside the card |
| Height up to 620 px | Buttons are 44 px high instead of 52 px; the keyboard hint is hidden; the display has less padding |
| Height up to 420 px | Buttons are 36 px high |
| Height up to 480 px and width from 560 px | The display and keypad sit side by side in a two-column grid; the card widens to 760 px |

The display (FR-036, FR-037):

- The expression is one line with a fixed height. Its font size is chosen from three steps by the length of the text, so the display never changes height.
- The line scrolls sideways when the text is still too wide. A layout effect scrolls the caret into view after every change. The scrollbar is hidden; touch and trackpad scrolling still work.
- The message is allowed to wrap.

## Testing

- **Logic tests** (`calculator/`, `api/`) call the functions directly.
- **Hook tests** use `renderHook`.
- **Component tests** render with React Testing Library and act through `user-event`: clicking buttons found by accessible name and typing keys. They assert what is on screen and which calls the fake service received.
- `Calculator.test.tsx` runs the acceptance scenarios end to end against the fake service.
- `App.test.tsx` and `calculatorApi.test.ts` stub `fetch`, covering the real client.
- `live.integration.test.ts` runs a few expressions against a running service. It is skipped unless `CALC_SERVICE_URL` is set.
- Every test case name starts with the acceptance scenario ID it verifies (NFR-003).

## Requirement coverage

| Requirements | Implemented in |
| --- | --- |
| FR-001 to FR-003 | `calculator/keys.ts`, `components/Keypad.tsx`, `components/CalcButton.tsx` |
| FR-004 to FR-009, FR-019, FR-022 | `calculator/state.ts` |
| FR-010 to FR-016 | `calculator/parser.ts`, `calculator/evaluate.ts` |
| FR-017, FR-018 | `calculator/format.ts`, `calculator/state.ts`, `components/Display.tsx` |
| FR-020, FR-021 | `calculator/messages.ts`, `api/calculatorApi.ts` |
| FR-023 | `calculator/evaluate.ts` |
| FR-024 | `calculator/state.ts`, `hooks/useCalculator.ts`, `components/Calculator.tsx` |
| FR-025, FR-026, FR-029 | `calculator/keys.ts`, `hooks/useKeyboard.ts` |
| FR-027, FR-028, FR-030 | `components/CalcButton.tsx`, `components/Keypad.tsx`, `components/Display.tsx` |
| FR-031 | `theme.ts`, `components/` |
| FR-034, FR-035 | Media queries in `App.tsx`, `components/Calculator.tsx`, `components/CalcButton.tsx`, `components/Display.tsx` |
| FR-036, FR-037 | `components/Display.tsx` |
| FR-038 to FR-045 | `calculator/state.ts`, `calculator/format.ts`, `calculator/keys.ts`, `components/Display.tsx` |
| FR-032, FR-033 | `api/calculatorApi.ts`, `vite.config.ts` |
