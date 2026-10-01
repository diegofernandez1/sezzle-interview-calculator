# Spec 002: Calculator Frontend

| | |
| --- | --- |
| Status | Implemented |
| Created | 2026-09-30 |
| Depends on | [Spec 001: Calculate Service](../001-calculate-service/spec.md) and its [API contract](../001-calculate-service/contracts/openapi.yaml) |
| Design | [plan.md](plan.md) |
| Tasks | [tasks.md](tasks.md) |

This document says what the calculator application must do. It does not say how; the design is in [plan.md](plan.md). When this document and the code disagree, this document is right and the code is fixed, or this document is changed first.

## 1. Purpose

Give people a calculator in the browser that uses the calculate service for all arithmetic. A person builds an expression with on-screen buttons or the keyboard, presses equals, and sees the result.

## 2. Scope

In scope: a single-page application with a display and a keypad, every operation of the calculate service, expressions that chain several operations, keyboard input, and error messages.

Out of scope: calculation history beyond the last expression, memory keys, scientific functions the service does not have, user accounts, and offline use.

## 3. Terms

- **Expression**: what the person has entered so far, such as `2 + 3 × 4`.
- **Operand**: a number, a parenthesized expression, or a square root.
- **Service**: the calculate service of spec 001.

## 4. Functional requirements

### Keypad

| ID | Requirement |
| --- | --- |
| FR-001 | The keypad has a button for each digit `0` to `9` and for the decimal point. |
| FR-002 | The keypad has a button for each operation of the service: add (`+`), subtract (`−`), multiply (`×`), divide (`÷`), exponent (`xʸ`), square root (`√`), and percentage (`% of`). |
| FR-003 | The keypad has buttons for open and close parentheses, equals (`=`), backspace (`⌫`), clear (`AC`), and moving the cursor left (`◀`) and right (`▶`). |

### Building an expression

| ID | Requirement |
| --- | --- |
| FR-004 | Digits and the decimal point build a number. A number has at most one decimal point and at most 15 digits. A leading zero is replaced by the next digit. A decimal point with no digit before it becomes `0.`. |
| FR-005 | A binary operator follows an operand. Pressing a binary operator directly after another replaces the first. Pressing one on an empty expression starts from `0`. |
| FR-006 | The minus button enters a negative sign, not a subtraction, when it is pressed on an empty expression or directly after `×`, `÷`, `^`, `% of`, `(`, or `√`. |
| FR-007 | A close parenthesis is accepted only when a parenthesis is open and the expression ends with an operand. |
| FR-008 | When an operand is entered directly after another operand, a `×` is inserted between them. This covers `(` or `√` after a number or `)`, and a digit after `)`. |
| FR-009 | Backspace removes the last digit of a number being entered, or else the last item of the expression. Clear removes everything, including the result and any error. |

### Evaluating

| ID | Requirement |
| --- | --- |
| FR-010 | Equals evaluates the expression. Every arithmetic operation is computed by the service; the application does no arithmetic itself. Applying a negative sign to a typed number is not arithmetic. |
| FR-011 | Operations are applied in this order, from first to last: parentheses; square root; exponent, from right to left; negative sign; multiply, divide, and percentage, from left to right; add and subtract, from left to right. |
| FR-012 | A run of the same list operation (add, subtract, multiply, or divide) is sent to the service as one request with all its operands, in order. |
| FR-013 | `a % of b` asks the service what percentage `a` is of `b`. `25 % of 200` is `12.5`. |
| FR-014 | Parentheses still open at the end of the expression are closed automatically. |
| FR-015 | An expression that is a single number evaluates to that number with no request. |
| FR-016 | An expression that cannot be evaluated, such as one ending with an operator, shows the message `Incomplete expression` and sends no request. |

### Results

| ID | Requirement |
| --- | --- |
| FR-017 | After a successful evaluation the display shows the result, with the evaluated expression followed by `=` above it. |
| FR-018 | Results are shown rounded to 12 significant digits, so `0.1 + 0.2` shows `0.3`. Whole numbers of up to 15 digits are shown in full. |
| FR-019 | After a result, a binary operator continues the calculation from the result, using its exact value and not the rounded one. A digit, decimal point, or open parenthesis starts a new expression. Square root starts a new expression that is the square root of the result. Backspace clears the result. Equals does nothing. |

### Errors

| ID | Requirement |
| --- | --- |
| FR-020 | A service error is shown as a plain message chosen by its error code: `DIVISION_BY_ZERO` shows `Can't divide by zero`; `NEGATIVE_SQUARE_ROOT` shows `Can't take the square root of a negative number`; `UNDEFINED_RESULT` shows `The result is not a real number`; `RESULT_OUT_OF_RANGE` shows `The result is too large`. |
| FR-021 | If the service cannot be reached, the message is `Can't reach the calculator service`. Any other failure shows `Something went wrong`. |
| FR-022 | After an error the expression stays as entered so it can be corrected. The next input removes the message. |
| FR-023 | Evaluation stops at the first failure; no further requests are sent. |

### Waiting

| ID | Requirement |
| --- | --- |
| FR-024 | While an evaluation is in progress, the buttons are disabled, keyboard input is ignored, and the calculator is marked busy. |

### Keyboard

| ID | Requirement |
| --- | --- |
| FR-025 | Every keypad button has a keyboard key, listed below. Keys work without first focusing any element. |
| FR-026 | A key pressed together with Ctrl, Meta, or Alt is left to the browser. |

| Key | Button |
| --- | --- |
| `0` to `9` | The digit |
| `.` or `,` | Decimal point |
| `+` | Add |
| `-` | Subtract or negative sign |
| `*` or `x` | Multiply |
| `/` | Divide |
| `^` | Exponent |
| `r` | Square root |
| `%` | Percentage |
| `(` and `)` | Parentheses |
| `Enter` or `=` | Equals |
| `Backspace` | Backspace |
| `Escape` or `Delete` | Clear |
| `ArrowLeft` and `ArrowRight` | Move the cursor one item |
| `Home` and `End` | Move the cursor to the start and to the end |

### Accessibility and appearance

| ID | Requirement |
| --- | --- |
| FR-027 | Every button has an accessible name that says what it does, such as `divide` for `÷`. The keypad is a labelled group. |
| FR-028 | The display value is a status region, so a result is announced. An error is an alert. |
| FR-029 | Buttons are reachable with Tab and activated with Enter or Space. When a button has focus, Enter activates that button once and does not also evaluate. |
| FR-030 | Clicking a button with the mouse does not move focus to it, so pressing Enter afterwards evaluates. |
| FR-031 | The layout follows the calculator shown in a Google search: a rounded card, a right-aligned display, and a grid of rounded buttons with digits, operators, and equals in three distinct colors. It follows the system light or dark setting. |

### Responsive layout

| ID | Requirement |
| --- | --- |
| FR-034 | The display and every button are visible without scrolling on screens from 320 px wide and from 320 px high. This is checked at 320 × 568, 375 × 667, 667 × 375, and 568 × 320. |
| FR-035 | On a narrow screen the calculator fills the width. On a short screen the buttons are shorter and the keyboard hint is hidden. On a screen that is short and wide, such as a phone held sideways, the display sits beside the keypad instead of above it. |
| FR-036 | The display shows the expression on one line and always shows the cursor, where the person is typing. The text has three sizes: large up to 10 characters, medium up to 16, and small beyond that. An expression still too long for the line can be scrolled sideways, and the line returns to the cursor after each input. |
| FR-037 | A message too long for one line of the display wraps onto the next line; it is never cut off. |

### Cursor

The cursor is the place in the expression where input goes. It sits between two items, where an item is one digit or decimal point of a typed number, one operator, one parenthesis, one square root sign, one negative sign, or a whole carried result.

| ID | Requirement |
| --- | --- |
| FR-038 | The display shows the cursor as a vertical bar. It starts at the end of the expression and returns to the end after an evaluation and after clear. |
| FR-039 | The keypad has buttons to move the cursor one item left (`◀`) and right (`▶`). The keys `ArrowLeft`, `ArrowRight`, `Home`, and `End` move it left, right, to the start, and to the end. Clicking or tapping an item in the display puts the cursor beside it, on the side that was clicked; clicking the empty part of the line puts it at the end. The cursor does not move past either end. |
| FR-040 | Digits, the decimal point, operators, parentheses, and square root are inserted at the cursor. The rules of FR-004 to FR-008 apply to what is left of the cursor. An operator inserted inside a number splits it into two numbers. |
| FR-041 | Backspace removes the item left of the cursor. When this leaves two typed numbers side by side, they join into one number; a second decimal point is dropped. |
| FR-042 | An insertion never leaves two operators or two operands side by side at the cursor: an operator typed directly before another operator replaces it, and an operand typed directly before another operand gets a `×` between them. |
| FR-043 | A minus is a subtraction when an operand is on its left and a negative sign otherwise. It changes between the two when an edit changes what is on its left. |
| FR-044 | Editing in the middle can leave an expression that cannot be evaluated, such as `2(3)` after its `×` is removed. Equals then shows `Incomplete expression`, as in FR-016. |
| FR-045 | Moving the cursor is ignored while an evaluation is in progress. It does not remove an error message. |

### Service access

| ID | Requirement |
| --- | --- |
| FR-032 | Each operation sends `POST` to its endpoint with `Content-Type: application/json` and the body defined in the API contract. |
| FR-033 | The address of the service is configurable at build time. |

## 5. Non-functional requirements

| ID | Requirement |
| --- | --- |
| NFR-001 | The application is a React single-page application that uses MUI components. |
| NFR-002 | Every component, hook, and module has tests written with Vitest and React Testing Library. |
| NFR-003 | Every acceptance scenario in section 6 is verified by a test whose name carries the scenario ID. |

## 6. Acceptance scenarios

Each row reads: **given** the application is open with an empty expression (unless the row says otherwise), **when** the buttons shown are pressed in order, **then** the outcome is as shown. Button presses are separated by spaces; `=` is the equals button. "Requests" lists the service calls in the order they are sent.

### Building an expression (FR-004 to FR-009)

| ID | When | Then the display shows |
| --- | --- | --- |
| AC-001 | `1 2 3` | `123` |
| AC-002 | `0 5`; and separately `0 . 5` | `5`; and `0.5` |
| AC-003 | `1 . 5 . 2`; and separately `.` | `1.52`; and `0.` |
| AC-004 | Sixteen presses of `1` | Fifteen `1`s |
| AC-005 | `2 +`, then each of `−`, `×`, `÷`, `xʸ`, `% of` in separate runs | `2 −`, `2 ×`, `2 ÷`, `2 ^`, `2 % of` |
| AC-006 | `2 + ×` | `2 ×` |
| AC-007 | `+` | `0 +` |
| AC-008 | `−  5`; and separately `2 × − 3` | `−5`; and `2 × −3` |
| AC-009 | `)`; and separately `( )`; and separately `( 2 + )` | `0`; `(`; `(2 +` |
| AC-010 | `2 (`; and `2 √`; and `( 2 ) 5`; and `( 2 ) (` | `2 × (`; `2 × √`; `(2) × 5`; `(2) × (` |
| AC-011 | `1 2 + 3`, then `⌫` three times | `12 +` after the first, `12` after the second, `1` after the third |
| AC-012 | `1 2 + 3 AC` | `0` |

### Evaluating (FR-010 to FR-016)

| ID | When | Requests | Then the result is |
| --- | --- | --- | --- |
| AC-013 | `2 + 3 =` | add `[2, 3]` | `5` |
| AC-014 | `1 + 2 + 3 =` | add `[1, 2, 3]` | `6` |
| AC-015 | `1 0 − 3 − 2 =` | subtract `[10, 3, 2]` | `5` |
| AC-016 | `2 + 3 × 4 =` | multiply `[3, 4]`; add `[2, 12]` | `14` |
| AC-017 | `1 0 − 3 + 2 =` | subtract `[10, 3]`; add `[7, 2]` | `9` |
| AC-018 | `1 0 0 ÷ 5 ÷ 2 =` | divide `[100, 5, 2]` | `10` |
| AC-019 | `2 xʸ 3 xʸ 2 =` | exponent `3, 2`; exponent `2, 9` | `512` |
| AC-020 | `√ 9 =`; and separately `√ ( 9 + 7 ) =` | square root `9`; and add `[9, 7]`, square root `16` | `3`; and `4` |
| AC-021 | `2 5 % of 2 0 0 =` | percentage `25, 200` | `12.5` |
| AC-022 | `( 2 + 3 ) × 4 =` | add `[2, 3]`; multiply `[5, 4]` | `20` |
| AC-023 | `− 2 xʸ 2 =`; and separately `2 × − 3 =` | exponent `2, 2`, multiply `[-1, 4]`; and multiply `[2, -3]` | `−4`; and `−6` |
| AC-024 | `( 2 + 3 =` | add `[2, 3]` | `5` |
| AC-025 | `5 =` | none | `5` |
| AC-026 | `2 + =`; and separately `( =`; and `√ =` | none | The message `Incomplete expression` |

### Order of operations (FR-011)

AC-058 checks the standard order of arithmetic on expressions that mix levels: parentheses first, then square roots and exponents, then multiplication and division from left to right, then addition and subtraction from left to right.

| ID | Expression | Result | Rule shown |
| --- | --- | --- | --- |
| AC-058 | `2 + 3 × 4` | `14` | Multiplication before addition |
| AC-058 | `2 × 3 + 4` | `10` | The same, with the multiplication first |
| AC-058 | `10 − 4 ÷ 2` | `8` | Division before subtraction |
| AC-058 | `8 ÷ 2 × 4` | `16` | Division and multiplication from left to right |
| AC-058 | `8 × 2 ÷ 4` | `4` | Multiplication and division from left to right |
| AC-058 | `10 − 3 + 2` | `9` | Subtraction and addition from left to right |
| AC-058 | `2 + 3 ^ 2` | `11` | Exponent before addition |
| AC-058 | `2 × 3 ^ 2` | `18` | Exponent before multiplication |
| AC-058 | `−3 ^ 2` | `−9` | Exponent before a negative sign |
| AC-058 | `(−3) ^ 2` | `9` | Parentheses before an exponent |
| AC-058 | `2 ^ 3 ^ 2` | `512` | Exponents from right to left |
| AC-058 | `(2 ^ 3) ^ 2` | `64` | Parentheses override right to left |
| AC-058 | `2 ^ −1` | `0.5` | A negative exponent |
| AC-058 | `2 × (3 + 4)` | `14` | Parentheses before multiplication |
| AC-058 | `(1 + 2) × (3 + 4)` | `21` | Two groups |
| AC-058 | `2 × (3 + (4 − 1) × 2)` | `18` | Nested parentheses |
| AC-058 | `10 ÷ (2 + 3)` | `2` | A group as a divisor |
| AC-058 | `2 + √16 × 3` | `14` | Square root before multiplication |
| AC-058 | `√16 ^ 2` | `16` | Square root before an exponent |
| AC-058 | `√(9 + 16)` | `5` | Square root of a group |
| AC-058 | `2 × −3 + 4` | `−2` | A negative operand |
| AC-058 | `1 + 2 × 3 − 4 ÷ 2` | `5` | Four operations together |
| AC-058 | `100 − 2 ^ 3 × 5 + √81 ÷ 3` | `63` | Every level together |
| AC-058 | `50 + 25 % of 200` | `62.5` | Percentage at the level of multiplication |

### Results (FR-017 to FR-019)

| ID | When | Then |
| --- | --- | --- |
| AC-027 | `2 + 3 =` | The display shows `5` with `2 + 3 =` above it |
| AC-028 | `0 . 1 + 0 . 2 =` | The display shows `0.3` |
| AC-029 | `0 . 1 + 0 . 2 = × 1 0 =` | The second request is multiply `[0.30000000000000004, 10]` |
| AC-030 | `2 + 3 = 7` | The display shows `7` |
| AC-031 | `7 + 9 = √ =` | The display shows `√16` before the second `=`; the second request is square root `16`; the result is `4` |
| AC-032 | `2 + 3 = ⌫` | The display shows `0` |
| AC-033 | `2 + 3 = =` | One request in total; the display still shows `5` |

### Errors (FR-020 to FR-023)

| ID | When | Then |
| --- | --- | --- |
| AC-034 | `1 0 ÷ 0 =` | The message `Can't divide by zero`; the display still shows `10 ÷ 0` |
| AC-035 | `√ − 4 =` | The message `Can't take the square root of a negative number` |
| AC-036 | `( − 8 ) xʸ 0 . 5 =`; and separately `1 0 xʸ 4 0 0 =` | `The result is not a real number`; and `The result is too large` |
| AC-037 | The service cannot be reached; `2 + 3 =` | The message `Can't reach the calculator service` |
| AC-038 | The service answers `500`, an unknown code, or a body that is not JSON; `2 + 3 =` | The message `Something went wrong` |
| AC-039 | `1 0 ÷ 0 =`, then `⌫`, then `5 =` | After `⌫` the message is gone; the final result is `2` |
| AC-040 | `1 ÷ 0 + 2 × 3 =` | The divide is the only request; the multiply and the add are never sent |

### Waiting (FR-024)

| ID | When | Then |
| --- | --- | --- |
| AC-041 | `2 + 3 =`, and the service has not answered yet | Every button is disabled, the calculator is marked busy, and a key press changes nothing. When the answer arrives the buttons are enabled again |

### Keyboard (FR-025, FR-026)

| ID | When these keys are typed | Then |
| --- | --- | --- |
| AC-042 | `1` `2` `.` `5` | The display shows `12.5` |
| AC-043 | `2` `+` `3` `-` `1` `*` `4` `/` `2` `^` `2` | The display shows `2 + 3 − 1 × 4 ÷ 2 ^ 2` |
| AC-044 | `x`, `r`, `%`, `(`, `)`, `,` each in a suitable expression | They act as multiply, square root, percentage, parentheses, and decimal point |
| AC-045 | `2` `+` `3` `Enter`; and separately `2` `+` `3` `=` | The result is `5` |
| AC-046 | `1` `2` `Backspace`; and `1` `2` `Escape`; and `1` `2` `Delete` | `1`; `0`; `0` |
| AC-047 | `Ctrl+1`, `Meta+r`, `Alt+5` | The display still shows `0` |

### Accessibility (FR-027 to FR-030)

| ID | When | Then |
| --- | --- | --- |
| AC-048 | The application is open | Buttons can be found by these names: `0` to `9`, `decimal point`, `add`, `subtract`, `multiply`, `divide`, `power`, `square root`, `as a percentage of`, `open parenthesis`, `close parenthesis`, `equals`, `backspace`, `clear`. They are inside a group named `Calculator keypad` |
| AC-049 | `2 + 3 =`; and separately `1 ÷ 0 =` | The result is inside a status region; the message is inside an alert |
| AC-050 | The `7` button has keyboard focus and `Enter` is pressed | The display shows `7`, entered once, and nothing is evaluated |
| AC-051 | The `7` button is clicked with the mouse | The button does not have focus afterwards |

### Service access (FR-032, FR-033)

| ID | When | Then |
| --- | --- | --- |
| AC-052 | Each of the seven operations is called | A `POST` goes to the endpoint of that operation with `Content-Type: application/json` and the body of the API contract, and the `result` of the response is returned |
| AC-053 | The service address is set to `https://calc.example.com` | Requests go to `https://calc.example.com/api/v1/...` |
| AC-054 | The page is opened | It shows the heading `Calculator`, the display, and the keypad |

### Responsive display (FR-036, FR-037)

| ID | When | Then |
| --- | --- | --- |
| AC-055 | The expression is `1234567890` (10 characters); then `12345678901` (11); then `1234567890 + 12` (15); then `1234567890 + 123456` (19) | The text size is large; medium; medium; small |
| AC-056 | The expression is wider than the display and a character is added or the cursor moves | The line is scrolled to bring the cursor into view |
| AC-057 | The message is `Can't take the square root of a negative number` | The message is allowed to wrap |

### Cursor (FR-038 to FR-045)

In the "Then" column, `‸` marks where the cursor is.

| ID | When | Then |
| --- | --- | --- |
| AC-059 | `1 2 + 3`; and separately nothing is pressed | The display shows `12 + 3‸`; and `0‸` |
| AC-060 | `1 2 + 3 ◀ ◀`, then `5` | `12‸ + 3`, then `125‸ + 3` |
| AC-061 | `1 2 3 ◀`, then `+` | `12‸3`, then `12 + ‸3` |
| AC-062 | `1 2 3 ◀ ⌫`; and separately `1 2 + 3 ◀ ⌫` | `1‸3`; and `12‸3` |
| AC-063 | `1 . 2 + 3 . 4 ◀ ◀ ◀ ⌫` | `1.2‸34` |
| AC-064 | `1 2 ◀ ◀ ◀`; and `1 2 ▶`; and `1 2 ◀ ◀ ⌫` | `‸12`; `12‸`; `‸12` |
| AC-065 | The keys `1` `2` `3`, then `ArrowLeft` twice, `ArrowRight`, `Home`, `End` | `1‸23` after the two left arrows, then `12‸3`, `‸123`, `123‸` |
| AC-066 | `1 2 + 3`, then the `+` in the display is clicked on its left half; and on its right half; and the empty part of the line is clicked | `12‸ + 3`; `12 + ‸3`; `12 + 3‸` |
| AC-067 | `2 + 3 ◀ ◀`, then `×` | `2 × ‸3` |
| AC-068 | `( 2 )`, then `Home`, then `5` | `5‸ × (2)` |
| AC-069 | `2 × − 3 ◀ ◀ ⌫ =` | The display shows `2‸ − 3` before `=`; the request is subtract `[2, 3]`; the result is `−1` |
| AC-070 | `1 2 + 3 ◀ ◀ 5 =` | The request is add `[125, 3]`; the result is `128‸` |
| AC-071 | `2 ( 3 )`, then `◀ ◀ ◀ ⌫ =` | The display shows `2‸(3)`; the message is `Incomplete expression`; no request |
| AC-072 | `2 + 3 = ◀`, then `7`; and separately `2 + 3 = ◀`, then `×` | `7‸`; and `5 × ‸` |
| AC-073 | `1 ÷ 0 =`, then `◀` | The message `Can't divide by zero` is still shown |
| AC-074 | An evaluation is in progress and `ArrowLeft` is pressed | The cursor does not move |
| AC-075 | The application is open | The keypad has buttons named `move cursor left` and `move cursor right` |

FR-034 and FR-035 depend on the size of the screen, which the test environment does not lay out. They are verified in a real browser at the four sizes of FR-034; the results are recorded in [tasks.md](tasks.md).

## 7. Assumptions

These were decided without a stated requirement. Changing one means changing this spec first.

- Expressions follow standard operator precedence, as in the calculator of a Google search, and are not evaluated strictly left to right.
- The percentage button is labelled `% of` and is a binary operator, because the service operation takes two numbers. It is not the "divide by 100" key of a pocket calculator.
- A negative sign in front of something that is not a typed number, such as `−(2 + 3)`, is computed by asking the service to multiply by `-1`.
- Enter on a focused button activates that button, which is standard behavior for buttons and takes priority over Enter as equals.
