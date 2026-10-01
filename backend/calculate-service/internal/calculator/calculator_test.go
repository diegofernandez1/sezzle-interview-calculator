package calculator

import (
	"errors"
	"math"
	"testing"
)

// Test case names start with the acceptance scenario they verify; see
// specs/001-calculate-service/spec.md.

const maxFloat = math.MaxFloat64

// check compares one calculator outcome with the expected one. A result of
// negative zero fails even when want is 0, because the two compare as equal.
func check(t *testing.T, got float64, err error, want float64, wantErr error) {
	t.Helper()
	if wantErr != nil {
		if !errors.Is(err, wantErr) {
			t.Fatalf("error = %v, want %v", err, wantErr)
		}
		return
	}
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got != want || math.Signbit(got) != math.Signbit(want) {
		t.Fatalf("result = %v, want %v", got, want)
	}
}

type listCase struct {
	name    string
	numbers []float64
	want    float64
	wantErr error
}

func runListCases(t *testing.T, op func([]float64) (float64, error), cases []listCase) {
	t.Helper()
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := op(tc.numbers)
			check(t, got, err, tc.want, tc.wantErr)
		})
	}
}

func TestAdd(t *testing.T) {
	runListCases(t, Add, []listCase{
		{name: "AC-001 integers", numbers: []float64{1, 2, 3}, want: 6},
		{name: "AC-002 negatives and decimals", numbers: []float64{-1.5, 2.5, -3}, want: -2},
		{name: "AC-003 result is not rounded", numbers: []float64{0.1, 0.2}, want: 0.30000000000000004},
		{name: "AC-004 overflow", numbers: []float64{maxFloat, maxFloat}, wantErr: ErrResultOutOfRange},
		{name: "FR-018 intermediate overflow", numbers: []float64{maxFloat, maxFloat, -maxFloat}, wantErr: ErrResultOutOfRange},
		{name: "FR-001 zeros", numbers: []float64{0, 0}, want: 0},
		{name: "FR-017 result is not a number", numbers: []float64{math.Inf(1), math.Inf(-1)}, wantErr: ErrUndefinedResult},
	})
}

func TestSubtract(t *testing.T) {
	runListCases(t, Subtract, []listCase{
		{name: "AC-005 left to right", numbers: []float64{10, 3, 2}, want: 5},
		{name: "AC-006 negative result", numbers: []float64{3, 10}, want: -7},
		{name: "AC-007 subtracting a negative", numbers: []float64{5, -3}, want: 8},
		{name: "AC-008 overflow", numbers: []float64{-maxFloat, maxFloat}, wantErr: ErrResultOutOfRange},
		{name: "FR-002 equal numbers", numbers: []float64{4.5, 4.5}, want: 0},
	})
}

func TestMultiply(t *testing.T) {
	runListCases(t, Multiply, []listCase{
		{name: "AC-009 integers", numbers: []float64{2, 3, 4}, want: 24},
		{name: "AC-010 negative factor", numbers: []float64{-2, 3}, want: -6},
		{name: "AC-011 zero factor", numbers: []float64{5, 0, 7}, want: 0},
		{name: "AC-012 negative zero becomes zero", numbers: []float64{-1, 0}, want: 0},
		{name: "AC-013 intermediate overflow", numbers: []float64{1e200, 1e200, 0}, wantErr: ErrResultOutOfRange},
		{name: "FR-003 decimals", numbers: []float64{0.5, 0.5}, want: 0.25},
	})
}

func TestDivide(t *testing.T) {
	runListCases(t, Divide, []listCase{
		{name: "AC-014 left to right", numbers: []float64{100, 5, 2}, want: 10},
		{name: "AC-015 fractional result", numbers: []float64{1, 4}, want: 0.25},
		{name: "AC-016 zero dividend", numbers: []float64{0, 5}, want: 0},
		{name: "AC-017 zero divisor", numbers: []float64{10, 0}, wantErr: ErrDivisionByZero},
		{name: "AC-018 zero divisor in third position", numbers: []float64{10, 2, 0}, wantErr: ErrDivisionByZero},
		{name: "AC-019 overflow", numbers: []float64{1e308, 1e-308}, wantErr: ErrResultOutOfRange},
		{name: "FR-015 zero divided by zero", numbers: []float64{0, 0}, wantErr: ErrDivisionByZero},
		{name: "FR-015 negative zero divisor", numbers: []float64{1, math.Copysign(0, -1)}, wantErr: ErrDivisionByZero},
		{name: "FR-019 negative zero becomes zero", numbers: []float64{0, -5}, want: 0},
		{name: "FR-004 negative divisor", numbers: []float64{-9, 3}, want: -3},
	})
}

func TestDivideByZeroNamesPosition(t *testing.T) {
	cases := []struct {
		name    string
		numbers []float64
		want    string
	}{
		{name: "AC-017 second position", numbers: []float64{10, 0}, want: "division by zero: numbers[1] is zero"},
		{name: "AC-018 third position", numbers: []float64{10, 2, 0}, want: "division by zero: numbers[2] is zero"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			_, err := Divide(tc.numbers)
			if err == nil || err.Error() != tc.want {
				t.Fatalf("error = %v, want %q", err, tc.want)
			}
		})
	}
}

func TestTooFewOperands(t *testing.T) {
	ops := map[string]func([]float64) (float64, error){
		"add":      Add,
		"subtract": Subtract,
		"multiply": Multiply,
		"divide":   Divide,
	}
	inputs := map[string][]float64{
		"nil":   nil,
		"empty": {},
		"one":   {5},
	}
	for opName, op := range ops {
		for inputName, numbers := range inputs {
			t.Run("AC-049 "+opName+" "+inputName, func(t *testing.T) {
				_, err := op(numbers)
				if !errors.Is(err, ErrTooFewOperands) {
					t.Fatalf("error = %v, want %v", err, ErrTooFewOperands)
				}
			})
		}
	}
}

func TestExponent(t *testing.T) {
	cases := []struct {
		name           string
		base, exponent float64
		want           float64
		wantErr        error
	}{
		{name: "AC-020 positive integer exponent", base: 2, exponent: 10, want: 1024},
		{name: "AC-021 negative exponent", base: 2, exponent: -2, want: 0.25},
		{name: "AC-022 fractional exponent", base: 9, exponent: 0.5, want: 3},
		{name: "AC-023 negative base, integer exponent", base: -8, exponent: 3, want: -512},
		{name: "AC-024 zero to the zero", base: 0, exponent: 0, want: 1},
		{name: "AC-025 zero to a negative exponent", base: 0, exponent: -1, wantErr: ErrDivisionByZero},
		{name: "AC-026 negative base, fractional exponent", base: -8, exponent: 0.5, wantErr: ErrUndefinedResult},
		{name: "AC-027 overflow", base: 10, exponent: 400, wantErr: ErrResultOutOfRange},
		{name: "FR-005 zero exponent", base: 5, exponent: 0, want: 1},
		{name: "FR-005 zero base", base: 0, exponent: 5, want: 0},
		{name: "FR-005 negative base, even exponent", base: -2, exponent: 2, want: 4},
		{name: "FR-005 result too small rounds to zero", base: 2, exponent: -2000, want: 0},
		{name: "FR-015 negative zero to a negative exponent", base: math.Copysign(0, -1), exponent: -3, wantErr: ErrDivisionByZero},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := Exponent(tc.base, tc.exponent)
			check(t, got, err, tc.want, tc.wantErr)
		})
	}
}

func TestSquareRoot(t *testing.T) {
	cases := []struct {
		name    string
		number  float64
		want    float64
		wantErr error
	}{
		{name: "AC-028 perfect square", number: 9, want: 3},
		{name: "AC-029 irrational result", number: 2, want: 1.4142135623730951},
		{name: "AC-030 zero", number: 0, want: 0},
		{name: "AC-031 negative number", number: -4, wantErr: ErrNegativeSquareRoot},
		{name: "FR-006 decimal", number: 0.25, want: 0.5},
		{name: "FR-019 negative zero becomes zero", number: math.Copysign(0, -1), want: 0},
		{name: "FR-016 smallest negative number", number: -math.SmallestNonzeroFloat64, wantErr: ErrNegativeSquareRoot},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := SquareRoot(tc.number)
			check(t, got, err, tc.want, tc.wantErr)
		})
	}
}

func TestPercentage(t *testing.T) {
	cases := []struct {
		name         string
		value, total float64
		want         float64
		wantErr      error
	}{
		{name: "AC-032 part of a total", value: 25, total: 200, want: 12.5},
		{name: "AC-033 whole total", value: 50, total: 50, want: 100},
		{name: "AC-034 more than the total", value: 300, total: 200, want: 150},
		{name: "AC-035 negative value", value: -25, total: 200, want: -12.5},
		{name: "AC-036 zero value", value: 0, total: 200, want: 0},
		{name: "AC-037 zero total", value: 25, total: 0, wantErr: ErrDivisionByZero},
		{name: "AC-038 overflow", value: 1e308, total: 1, wantErr: ErrResultOutOfRange},
		{name: "FR-007 negative total", value: 25, total: -200, want: -12.5},
		{name: "FR-007 whole numbers stay exact", value: 7, total: 100, want: 7},
		{name: "FR-007 largest value equal to its total", value: maxFloat, total: maxFloat, want: 100},
		{name: "FR-015 zero of zero", value: 0, total: 0, wantErr: ErrDivisionByZero},
		{name: "FR-019 negative zero becomes zero", value: 0, total: -200, want: 0},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := Percentage(tc.value, tc.total)
			check(t, got, err, tc.want, tc.wantErr)
		})
	}
}
