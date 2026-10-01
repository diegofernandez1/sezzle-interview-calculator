// Package calculator implements the arithmetic of the calculate service.
//
// It knows nothing about HTTP. Every function returns either a finite float64
// or one of the sentinel errors below, which callers match with errors.Is.
package calculator

import (
	"errors"
	"fmt"
	"math"
)

// MinOperands is the fewest numbers a list operation accepts.
const MinOperands = 2

var (
	ErrTooFewOperands     = errors.New("too few operands")
	ErrDivisionByZero     = errors.New("division by zero")
	ErrNegativeSquareRoot = errors.New("square root of a negative number")
	ErrUndefinedResult    = errors.New("result is undefined")
	ErrResultOutOfRange   = errors.New("result is out of range")
)

// Add returns the sum of numbers.
func Add(numbers []float64) (float64, error) {
	return fold(numbers, func(acc, n float64) float64 { return acc + n })
}

// Subtract returns the first number minus each following number, in order.
func Subtract(numbers []float64) (float64, error) {
	return fold(numbers, func(acc, n float64) float64 { return acc - n })
}

// Multiply returns the product of numbers.
func Multiply(numbers []float64) (float64, error) {
	return fold(numbers, func(acc, n float64) float64 { return acc * n })
}

// Divide returns the first number divided by each following number, in order.
// No number after the first may be zero.
func Divide(numbers []float64) (float64, error) {
	for i, n := range numbers {
		if i > 0 && n == 0 {
			return 0, fmt.Errorf("%w: numbers[%d] is zero", ErrDivisionByZero, i)
		}
	}
	return fold(numbers, func(acc, n float64) float64 { return acc / n })
}

// Exponent returns base raised to exponent. Zero to the zero is 1.
func Exponent(base, exponent float64) (float64, error) {
	if base == 0 && exponent < 0 {
		return 0, fmt.Errorf("%w: zero cannot be raised to a negative exponent", ErrDivisionByZero)
	}
	if base < 0 && exponent != math.Trunc(exponent) {
		return 0, fmt.Errorf("%w: a negative base with a fractional exponent has no real result", ErrUndefinedResult)
	}
	return finish(math.Pow(base, exponent))
}

// SquareRoot returns the non-negative square root of number.
func SquareRoot(number float64) (float64, error) {
	if number < 0 {
		return 0, fmt.Errorf("%w: %v", ErrNegativeSquareRoot, number)
	}
	return finish(math.Sqrt(number))
}

// Percentage returns the percentage of total that value represents, where
// total is 100%.
func Percentage(value, total float64) (float64, error) {
	if total == 0 {
		return 0, fmt.Errorf("%w: total is zero", ErrDivisionByZero)
	}
	// Multiplying first keeps whole numbers exact: 7 of 100 is 7, where
	// 7/100*100 is 7.000000000000001. Divide first only when multiplying
	// would overflow.
	scaled := value * 100
	if math.IsInf(scaled, 0) {
		return finish(value / total * 100)
	}
	return finish(scaled / total)
}

// fold applies step to the numbers from left to right, starting with the
// first. The running value is checked after every step, so an intermediate
// overflow is reported as such and never turns into NaN further along.
func fold(numbers []float64, step func(acc, n float64) float64) (float64, error) {
	if len(numbers) < MinOperands {
		return 0, fmt.Errorf("%w: need at least %d numbers, got %d", ErrTooFewOperands, MinOperands, len(numbers))
	}
	acc := numbers[0]
	for _, n := range numbers[1:] {
		var err error
		if acc, err = finish(step(acc, n)); err != nil {
			return 0, err
		}
	}
	return acc, nil
}

// finish rejects results that are not finite numbers and drops the sign of
// negative zero.
func finish(result float64) (float64, error) {
	switch {
	case math.IsNaN(result):
		return 0, ErrUndefinedResult
	case math.IsInf(result, 0):
		return 0, ErrResultOutOfRange
	case result == 0:
		return 0, nil
	}
	return result, nil
}
