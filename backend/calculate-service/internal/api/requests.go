package api

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime"
	"net/http"
	"reflect"
	"strings"

	"calculate-service/internal/calculator"
)

const (
	maxBodyBytes = 1 << 20 // 1 MiB
	maxOperands  = 1000
)

// Request fields are pointers so that a missing field or a JSON null stays
// nil and can be reported; a plain float64 would silently become 0.

type numbersRequest struct {
	Numbers []*float64 `json:"numbers"`
}

type exponentRequest struct {
	Base     *float64 `json:"base"`
	Exponent *float64 `json:"exponent"`
}

type squareRootRequest struct {
	Number *float64 `json:"number"`
}

type percentageRequest struct {
	Value *float64 `json:"value"`
	Total *float64 `json:"total"`
}

// operands validates the list and returns its values.
func (r numbersRequest) operands() ([]float64, *apiError) {
	switch {
	case r.Numbers == nil:
		return nil, validationError(`field "numbers" is required and must not be null`)
	case len(r.Numbers) < calculator.MinOperands:
		return nil, validationError(fmt.Sprintf(
			`field "numbers" must contain at least %d numbers, got %d`, calculator.MinOperands, len(r.Numbers)))
	case len(r.Numbers) > maxOperands:
		return nil, validationError(fmt.Sprintf(
			`field "numbers" must contain at most %d numbers, got %d`, maxOperands, len(r.Numbers)))
	}

	numbers := make([]float64, len(r.Numbers))
	for i, n := range r.Numbers {
		if n == nil {
			return nil, validationError(fmt.Sprintf("numbers[%d] must be a number, got null", i))
		}
		numbers[i] = *n
	}
	return numbers, nil
}

// required returns the value of a required field, or a validation error if
// the field was missing or null.
func required(name string, value *float64) (float64, *apiError) {
	if value == nil {
		return 0, validationError(fmt.Sprintf("field %q is required and must not be null", name))
	}
	return *value, nil
}

// decodeJSON reads the request body into dst. The body must be a single JSON
// object, sent as application/json, no larger than maxBodyBytes, with no
// fields that dst does not declare.
func decodeJSON(w http.ResponseWriter, r *http.Request, dst any) *apiError {
	mediaType, _, err := mime.ParseMediaType(r.Header.Get("Content-Type"))
	if err != nil || mediaType != "application/json" {
		return &apiError{
			Status:  http.StatusUnsupportedMediaType,
			Code:    codeUnsupportedMediaType,
			Message: "Content-Type must be application/json",
		}
	}

	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, maxBodyBytes))
	if err != nil {
		var tooLarge *http.MaxBytesError
		if errors.As(err, &tooLarge) {
			return &apiError{
				Status:  http.StatusRequestEntityTooLarge,
				Code:    codePayloadTooLarge,
				Message: fmt.Sprintf("request body must not exceed %d bytes", maxBodyBytes),
			}
		}
		return invalidJSON("request body could not be read")
	}

	body = bytes.TrimSpace(body)
	switch {
	case len(body) == 0:
		return invalidJSON("request body is empty")
	case body[0] != '{':
		return invalidJSON("request body must be a JSON object")
	}

	dec := json.NewDecoder(bytes.NewReader(body))
	dec.DisallowUnknownFields()
	if err := dec.Decode(dst); err != nil {
		return decodeError(err)
	}
	if _, err := dec.Token(); !errors.Is(err, io.EOF) {
		return invalidJSON("request body must contain a single JSON object")
	}
	return nil
}

// decodeError explains a json.Decoder failure to the client.
func decodeError(err error) *apiError {
	var typeErr *json.UnmarshalTypeError
	if errors.As(err, &typeErr) {
		// For a number that does not fit a float64, Value is "number 1e999".
		if number, ok := strings.CutPrefix(typeErr.Value, "number "); ok {
			return invalidJSON(fmt.Sprintf("field %q is out of range: %s", typeErr.Field, number))
		}
		expected := "a number"
		if typeErr.Type != nil && typeErr.Type.Kind() == reflect.Slice {
			expected = "a list of numbers"
		}
		return invalidJSON(fmt.Sprintf("field %q must be %s, got %s", typeErr.Field, expected, typeErr.Value))
	}

	// encoding/json has no typed error for an unknown field.
	if name, ok := strings.CutPrefix(err.Error(), "json: unknown field "); ok {
		return validationError("unknown field " + name)
	}

	return invalidJSON("request body is not valid JSON")
}
