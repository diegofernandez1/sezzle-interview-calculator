package api

import (
	"encoding/json"
	"errors"
	"net/http"

	"calculate-service/internal/calculator"
)

// Error codes returned in the "code" field. Clients may branch on these, so
// they are part of the contract in specs/001-calculate-service.
const (
	codeInvalidJSON          = "INVALID_JSON"
	codeValidation           = "VALIDATION_ERROR"
	codeNotFound             = "NOT_FOUND"
	codeMethodNotAllowed     = "METHOD_NOT_ALLOWED"
	codePayloadTooLarge      = "PAYLOAD_TOO_LARGE"
	codeUnsupportedMediaType = "UNSUPPORTED_MEDIA_TYPE"
	codeDivisionByZero       = "DIVISION_BY_ZERO"
	codeNegativeSquareRoot   = "NEGATIVE_SQUARE_ROOT"
	codeUndefinedResult      = "UNDEFINED_RESULT"
	codeResultOutOfRange     = "RESULT_OUT_OF_RANGE"
	codeInternal             = "INTERNAL_ERROR"
)

type resultResponse struct {
	Operation string  `json:"operation"`
	Result    float64 `json:"result"`
}

type errorResponse struct {
	Error *apiError `json:"error"`
}

// apiError is a failure the client is told about: the HTTP status plus the
// code and message of the response body.
type apiError struct {
	Status  int    `json:"-"`
	Code    string `json:"code"`
	Message string `json:"message"`
}

func (e *apiError) Error() string { return e.Message }

func invalidJSON(message string) *apiError {
	return &apiError{Status: http.StatusBadRequest, Code: codeInvalidJSON, Message: message}
}

func validationError(message string) *apiError {
	return &apiError{Status: http.StatusBadRequest, Code: codeValidation, Message: message}
}

func internalError() *apiError {
	return &apiError{Status: http.StatusInternalServerError, Code: codeInternal, Message: "an unexpected error occurred"}
}

// toAPIError turns any error from an operation into the response to send.
// Anything it does not recognize becomes a 500 that reveals no detail.
func toAPIError(err error) *apiError {
	var apiErr *apiError
	if errors.As(err, &apiErr) {
		return apiErr
	}

	unprocessable := func(code string) *apiError {
		return &apiError{Status: http.StatusUnprocessableEntity, Code: code, Message: err.Error()}
	}
	switch {
	case errors.Is(err, calculator.ErrTooFewOperands):
		return validationError(err.Error())
	case errors.Is(err, calculator.ErrDivisionByZero):
		return unprocessable(codeDivisionByZero)
	case errors.Is(err, calculator.ErrNegativeSquareRoot):
		return unprocessable(codeNegativeSquareRoot)
	case errors.Is(err, calculator.ErrUndefinedResult):
		return unprocessable(codeUndefinedResult)
	case errors.Is(err, calculator.ErrResultOutOfRange):
		return unprocessable(codeResultOutOfRange)
	}
	return internalError()
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	body, err := json.Marshal(payload)
	if err != nil {
		status = http.StatusInternalServerError
		body = []byte(`{"error":{"code":"` + codeInternal + `","message":"an unexpected error occurred"}}`)
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	w.Write(append(body, '\n'))
}

func writeError(w http.ResponseWriter, apiErr *apiError) {
	writeJSON(w, apiErr.Status, errorResponse{Error: apiErr})
}
