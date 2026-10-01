// Package api is the HTTP layer of the calculate service: routing, request
// decoding and validation, and JSON responses. The arithmetic is in the
// calculator package.
package api

import (
	"log/slog"
	"net/http"

	"calculate-service/internal/calculator"
)

// Config holds the settings of the router.
type Config struct {
	// AllowedOrigins lists the origins allowed to call the service from a
	// browser. "*" allows any origin.
	AllowedOrigins []string
	// Logger receives one entry per request. Nil means slog.Default().
	Logger *slog.Logger
}

// NewRouter returns the handler that serves the whole API.
func NewRouter(cfg Config) http.Handler {
	logger := cfg.Logger
	if logger == nil {
		logger = slog.Default()
	}

	mux := http.NewServeMux()
	route(mux, http.MethodPost, "/api/v1/add", operation("add", list(calculator.Add)))
	route(mux, http.MethodPost, "/api/v1/subtract", operation("subtract", list(calculator.Subtract)))
	route(mux, http.MethodPost, "/api/v1/multiply", operation("multiply", list(calculator.Multiply)))
	route(mux, http.MethodPost, "/api/v1/divide", operation("divide", list(calculator.Divide)))
	route(mux, http.MethodPost, "/api/v1/exponent", operation("exponent", exponent))
	route(mux, http.MethodPost, "/api/v1/square_root", operation("square_root", squareRoot))
	route(mux, http.MethodPost, "/api/v1/percentage", operation("percentage", percentage))
	route(mux, http.MethodGet, "/health", health)
	mux.HandleFunc("/", notFound)

	// Logging is outermost so that it records the 500 written by recovery.
	return logRequests(logger, recoverPanics(logger, cors(cfg.AllowedOrigins, mux)))
}

// route registers handler for one method and path. It also registers the
// path without a method: that pattern is less specific, so it only receives
// requests with the wrong method and answers 405 as JSON, in place of the
// mux's plain-text reply.
func route(mux *http.ServeMux, method, path string, handler http.HandlerFunc) {
	mux.HandleFunc(method+" "+path, handler)
	mux.HandleFunc(path, func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Allow", method)
		writeError(w, &apiError{
			Status:  http.StatusMethodNotAllowed,
			Code:    codeMethodNotAllowed,
			Message: r.Method + " is not allowed on " + path + "; use " + method,
		})
	})
}
