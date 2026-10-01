package api

import (
	"net/http"

	"calculate-service/internal/calculator"
)

// operation returns the handler for one calculator operation. It decodes the
// request body into T, passes it to compute, and writes the result or the
// error as JSON.
func operation[T any](name string, compute func(T) (float64, error)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req T
		if apiErr := decodeJSON(w, r, &req); apiErr != nil {
			writeError(w, apiErr)
			return
		}

		result, err := compute(req)
		if err != nil {
			writeError(w, toAPIError(err))
			return
		}
		writeJSON(w, http.StatusOK, resultResponse{Operation: name, Result: result})
	}
}

// list adapts a calculator function that takes a list of numbers.
func list(calculate func([]float64) (float64, error)) func(numbersRequest) (float64, error) {
	return func(req numbersRequest) (float64, error) {
		numbers, apiErr := req.operands()
		if apiErr != nil {
			return 0, apiErr
		}
		return calculate(numbers)
	}
}

func exponent(req exponentRequest) (float64, error) {
	base, apiErr := required("base", req.Base)
	if apiErr != nil {
		return 0, apiErr
	}
	exp, apiErr := required("exponent", req.Exponent)
	if apiErr != nil {
		return 0, apiErr
	}
	return calculator.Exponent(base, exp)
}

func squareRoot(req squareRootRequest) (float64, error) {
	number, apiErr := required("number", req.Number)
	if apiErr != nil {
		return 0, apiErr
	}
	return calculator.SquareRoot(number)
}

func percentage(req percentageRequest) (float64, error) {
	value, apiErr := required("value", req.Value)
	if apiErr != nil {
		return 0, apiErr
	}
	total, apiErr := required("total", req.Total)
	if apiErr != nil {
		return 0, apiErr
	}
	return calculator.Percentage(value, total)
}

func health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func notFound(w http.ResponseWriter, r *http.Request) {
	writeError(w, &apiError{
		Status:  http.StatusNotFound,
		Code:    codeNotFound,
		Message: "no route for " + r.URL.Path,
	})
}
