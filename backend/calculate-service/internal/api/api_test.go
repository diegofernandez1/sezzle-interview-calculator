package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"calculate-service/internal/calculator"
)

// Test case names start with the acceptance scenario they verify; see
// specs/001-calculate-service/spec.md.

// endpoints lists every operation endpoint with a body it accepts, for the
// scenarios that apply to all of them.
var endpoints = []struct {
	path      string
	validBody string
}{
	{"/api/v1/add", `{"numbers":[1,2]}`},
	{"/api/v1/subtract", `{"numbers":[1,2]}`},
	{"/api/v1/multiply", `{"numbers":[1,2]}`},
	{"/api/v1/divide", `{"numbers":[1,2]}`},
	{"/api/v1/exponent", `{"base":2,"exponent":3}`},
	{"/api/v1/square_root", `{"number":9}`},
	{"/api/v1/percentage", `{"value":25,"total":200}`},
}

var discardLogger = slog.New(slog.DiscardHandler)

func newTestRouter(allowedOrigins ...string) http.Handler {
	if len(allowedOrigins) == 0 {
		allowedOrigins = []string{"*"}
	}
	return NewRouter(Config{AllowedOrigins: allowedOrigins, Logger: discardLogger})
}

func send(h http.Handler, req *http.Request) *httptest.ResponseRecorder {
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

func post(path, body string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodPost, path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	return send(newTestRouter(), req)
}

func assertJSONContentType(t *testing.T, rec *httptest.ResponseRecorder) {
	t.Helper()
	if got := rec.Header().Get("Content-Type"); got != "application/json" {
		t.Errorf("Content-Type = %q, want %q", got, "application/json")
	}
}

func assertResult(t *testing.T, rec *httptest.ResponseRecorder, wantOperation string, want float64) {
	t.Helper()
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body: %s", rec.Code, rec.Body)
	}
	assertJSONContentType(t, rec)

	var got struct {
		Operation string   `json:"operation"`
		Result    *float64 `json:"result"`
	}
	dec := json.NewDecoder(rec.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&got); err != nil {
		t.Fatalf("response is not the result format: %v", err)
	}
	if got.Operation != wantOperation {
		t.Errorf("operation = %q, want %q", got.Operation, wantOperation)
	}
	if got.Result == nil {
		t.Fatal("result is missing")
	}
	if *got.Result != want {
		t.Errorf("result = %v, want %v", *got.Result, want)
	}
}

// assertError checks the status, the error code, and that the message
// contains every string in wantInMessage. It returns the message.
func assertError(t *testing.T, rec *httptest.ResponseRecorder, wantStatus int, wantCode string, wantInMessage ...string) string {
	t.Helper()
	if rec.Code != wantStatus {
		t.Fatalf("status = %d, want %d; body: %s", rec.Code, wantStatus, rec.Body)
	}
	assertJSONContentType(t, rec)

	var got struct {
		Error *struct {
			Code    string `json:"code"`
			Message string `json:"message"`
		} `json:"error"`
	}
	dec := json.NewDecoder(rec.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&got); err != nil {
		t.Fatalf("response is not the error format: %v", err)
	}
	if got.Error == nil {
		t.Fatal("error is missing")
	}
	if got.Error.Code != wantCode {
		t.Errorf("code = %q, want %q (message: %s)", got.Error.Code, wantCode, got.Error.Message)
	}
	if got.Error.Message == "" {
		t.Error("message is empty")
	}
	for _, want := range wantInMessage {
		if !strings.Contains(got.Error.Message, want) {
			t.Errorf("message = %q, want it to contain %q", got.Error.Message, want)
		}
	}
	return got.Error.Message
}

func TestOperationSuccess(t *testing.T) {
	cases := []struct {
		name      string
		path      string
		body      string
		operation string
		want      float64
	}{
		{"AC-001 add integers", "/api/v1/add", `{"numbers":[1,2,3]}`, "add", 6},
		{"AC-002 add negatives and decimals", "/api/v1/add", `{"numbers":[-1.5,2.5,-3]}`, "add", -2},
		{"AC-003 add is not rounded", "/api/v1/add", `{"numbers":[0.1,0.2]}`, "add", 0.30000000000000004},

		{"AC-005 subtract left to right", "/api/v1/subtract", `{"numbers":[10,3,2]}`, "subtract", 5},
		{"AC-006 subtract to a negative result", "/api/v1/subtract", `{"numbers":[3,10]}`, "subtract", -7},
		{"AC-007 subtract a negative", "/api/v1/subtract", `{"numbers":[5,-3]}`, "subtract", 8},

		{"AC-009 multiply integers", "/api/v1/multiply", `{"numbers":[2,3,4]}`, "multiply", 24},
		{"AC-010 multiply by a negative", "/api/v1/multiply", `{"numbers":[-2,3]}`, "multiply", -6},
		{"AC-011 multiply by zero", "/api/v1/multiply", `{"numbers":[5,0,7]}`, "multiply", 0},

		{"AC-014 divide left to right", "/api/v1/divide", `{"numbers":[100,5,2]}`, "divide", 10},
		{"AC-015 divide to a fraction", "/api/v1/divide", `{"numbers":[1,4]}`, "divide", 0.25},
		{"AC-016 divide zero", "/api/v1/divide", `{"numbers":[0,5]}`, "divide", 0},

		{"AC-020 exponent positive", "/api/v1/exponent", `{"base":2,"exponent":10}`, "exponent", 1024},
		{"AC-021 exponent negative", "/api/v1/exponent", `{"base":2,"exponent":-2}`, "exponent", 0.25},
		{"AC-022 exponent fractional", "/api/v1/exponent", `{"base":9,"exponent":0.5}`, "exponent", 3},
		{"AC-023 exponent negative base", "/api/v1/exponent", `{"base":-8,"exponent":3}`, "exponent", -512},
		{"AC-024 exponent zero to the zero", "/api/v1/exponent", `{"base":0,"exponent":0}`, "exponent", 1},

		{"AC-028 square root of a perfect square", "/api/v1/square_root", `{"number":9}`, "square_root", 3},
		{"AC-029 square root irrational", "/api/v1/square_root", `{"number":2}`, "square_root", 1.4142135623730951},
		{"AC-030 square root of zero", "/api/v1/square_root", `{"number":0}`, "square_root", 0},

		{"AC-032 percentage part of a total", "/api/v1/percentage", `{"value":25,"total":200}`, "percentage", 12.5},
		{"AC-033 percentage whole total", "/api/v1/percentage", `{"value":50,"total":50}`, "percentage", 100},
		{"AC-034 percentage above the total", "/api/v1/percentage", `{"value":300,"total":200}`, "percentage", 150},
		{"AC-035 percentage negative value", "/api/v1/percentage", `{"value":-25,"total":200}`, "percentage", -12.5},
		{"AC-036 percentage zero value", "/api/v1/percentage", `{"value":0,"total":200}`, "percentage", 0},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			assertResult(t, post(tc.path, tc.body), tc.operation, tc.want)
		})
	}
}

func TestNegativeZeroEncoding(t *testing.T) {
	t.Run("AC-012 multiply to negative zero", func(t *testing.T) {
		rec := post("/api/v1/multiply", `{"numbers":[-1,0]}`)
		want := `{"operation":"multiply","result":0}`
		if got := strings.TrimSpace(rec.Body.String()); got != want {
			t.Fatalf("body = %s, want %s", got, want)
		}
	})
}

func TestOperationMathErrors(t *testing.T) {
	cases := []struct {
		name          string
		path          string
		body          string
		code          string
		wantInMessage string
	}{
		{"AC-004 add overflow", "/api/v1/add", `{"numbers":[1.7976931348623157e308,1.7976931348623157e308]}`, "RESULT_OUT_OF_RANGE", ""},
		{"AC-008 subtract overflow", "/api/v1/subtract", `{"numbers":[-1.7976931348623157e308,1.7976931348623157e308]}`, "RESULT_OUT_OF_RANGE", ""},
		{"AC-013 multiply intermediate overflow", "/api/v1/multiply", `{"numbers":[1e200,1e200,0]}`, "RESULT_OUT_OF_RANGE", ""},
		{"AC-017 divide by zero", "/api/v1/divide", `{"numbers":[10,0]}`, "DIVISION_BY_ZERO", "numbers[1]"},
		{"AC-018 divide by zero in third position", "/api/v1/divide", `{"numbers":[10,2,0]}`, "DIVISION_BY_ZERO", "numbers[2]"},
		{"AC-019 divide overflow", "/api/v1/divide", `{"numbers":[1e308,1e-308]}`, "RESULT_OUT_OF_RANGE", ""},
		{"AC-025 zero to a negative exponent", "/api/v1/exponent", `{"base":0,"exponent":-1}`, "DIVISION_BY_ZERO", ""},
		{"AC-026 negative base, fractional exponent", "/api/v1/exponent", `{"base":-8,"exponent":0.5}`, "UNDEFINED_RESULT", ""},
		{"AC-027 exponent overflow", "/api/v1/exponent", `{"base":10,"exponent":400}`, "RESULT_OUT_OF_RANGE", ""},
		{"AC-031 square root of a negative", "/api/v1/square_root", `{"number":-4}`, "NEGATIVE_SQUARE_ROOT", ""},
		{"AC-037 percentage of zero total", "/api/v1/percentage", `{"value":25,"total":0}`, "DIVISION_BY_ZERO", "total"},
		{"AC-038 percentage overflow", "/api/v1/percentage", `{"value":1e308,"total":1}`, "RESULT_OUT_OF_RANGE", ""},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			assertError(t, post(tc.path, tc.body), http.StatusUnprocessableEntity, tc.code, tc.wantInMessage)
		})
	}
}

func TestBodyValidationAllEndpoints(t *testing.T) {
	// Each case builds its body from a body the endpoint accepts.
	cases := []struct {
		name          string
		body          func(valid string) string
		code          string
		wantInMessage string
	}{
		{"AC-039 truncated JSON", func(v string) string { return v[:len(v)-1] }, "INVALID_JSON", ""},
		{"AC-039 not JSON", func(string) string { return `{not json}` }, "INVALID_JSON", ""},
		{"AC-040 empty body", func(string) string { return "" }, "INVALID_JSON", "empty"},
		{"AC-040 whitespace body", func(string) string { return " \n\t " }, "INVALID_JSON", "empty"},
		{"AC-041 array body", func(string) string { return `[1,2]` }, "INVALID_JSON", "object"},
		{"AC-041 string body", func(string) string { return `"abc"` }, "INVALID_JSON", "object"},
		{"AC-041 number body", func(string) string { return `5` }, "INVALID_JSON", "object"},
		{"AC-041 null body", func(string) string { return `null` }, "INVALID_JSON", "object"},
		{"AC-042 second object", func(v string) string { return v + ` {}` }, "INVALID_JSON", "single"},
		{"AC-042 trailing garbage", func(v string) string { return v + ` garbage` }, "INVALID_JSON", "single"},
		{"AC-045 unknown field", func(v string) string { return `{"extra":1,` + v[1:] }, "VALIDATION_ERROR", "extra"},
		{"AC-046 empty object", func(string) string { return `{}` }, "VALIDATION_ERROR", "required"},
	}
	for _, ep := range endpoints {
		for _, tc := range cases {
			t.Run(tc.name+" "+ep.path, func(t *testing.T) {
				rec := post(ep.path, tc.body(ep.validBody))
				assertError(t, rec, http.StatusBadRequest, tc.code, tc.wantInMessage)
			})
		}
	}
}

func TestBodyValidation(t *testing.T) {
	cases := []struct {
		name          string
		path          string
		body          string
		code          string
		wantInMessage string
	}{
		{"AC-043 list is a string", "/api/v1/add", `{"numbers":"abc"}`, "INVALID_JSON", "a list of numbers, got string"},
		{"AC-043 list element is a string", "/api/v1/add", `{"numbers":[1,"2"]}`, "INVALID_JSON", "a number, got string"},
		{"AC-043 list element is an object", "/api/v1/divide", `{"numbers":[1,{}]}`, "INVALID_JSON", "numbers"},
		{"AC-043 base is a string", "/api/v1/exponent", `{"base":"2","exponent":3}`, "INVALID_JSON", "base"},
		{"AC-043 number is a boolean", "/api/v1/square_root", `{"number":true}`, "INVALID_JSON", "number"},
		{"AC-043 total is a list", "/api/v1/percentage", `{"value":25,"total":[200]}`, "INVALID_JSON", "total"},
		{"AC-044 number out of range", "/api/v1/square_root", `{"number":1e999}`, "INVALID_JSON", "number"},
		{"AC-044 list element out of range", "/api/v1/add", `{"numbers":[1,1e999]}`, "INVALID_JSON", "numbers"},

		{"AC-046 exponent missing", "/api/v1/exponent", `{"base":2}`, "VALIDATION_ERROR", `"exponent"`},
		{"AC-046 base missing", "/api/v1/exponent", `{"exponent":2}`, "VALIDATION_ERROR", `"base"`},
		{"AC-046 total missing", "/api/v1/percentage", `{"value":25}`, "VALIDATION_ERROR", `"total"`},
		{"AC-046 value missing", "/api/v1/percentage", `{"total":200}`, "VALIDATION_ERROR", `"value"`},
		{"AC-047 numbers is null", "/api/v1/add", `{"numbers":null}`, "VALIDATION_ERROR", `"numbers"`},
		{"AC-047 number is null", "/api/v1/square_root", `{"number":null}`, "VALIDATION_ERROR", `"number"`},
		{"AC-047 exponent is null", "/api/v1/exponent", `{"base":2,"exponent":null}`, "VALIDATION_ERROR", `"exponent"`},
		{"AC-048 list element is null", "/api/v1/multiply", `{"numbers":[1,null,3]}`, "VALIDATION_ERROR", "numbers[1]"},
		{"AC-049 empty list", "/api/v1/add", `{"numbers":[]}`, "VALIDATION_ERROR", "at least 2"},
		{"AC-049 one number", "/api/v1/subtract", `{"numbers":[5]}`, "VALIDATION_ERROR", "at least 2"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			assertError(t, post(tc.path, tc.body), http.StatusBadRequest, tc.code, tc.wantInMessage)
		})
	}
}

func numbersBody(count int) string {
	return `{"numbers":[` + strings.TrimSuffix(strings.Repeat("1,", count), ",") + `]}`
}

func TestOperandLimit(t *testing.T) {
	t.Run("AC-050 1001 numbers", func(t *testing.T) {
		rec := post("/api/v1/add", numbersBody(1001))
		assertError(t, rec, http.StatusBadRequest, "VALIDATION_ERROR", "at most 1000")
	})
	t.Run("AC-051 1000 numbers", func(t *testing.T) {
		assertResult(t, post("/api/v1/add", numbersBody(1000)), "add", 1000)
	})
}

func TestContentType(t *testing.T) {
	cases := []struct {
		name        string
		contentType string
		accepted    bool
	}{
		{"AC-052 text/plain", "text/plain", false},
		{"AC-052 missing", "", false},
		{"AC-052 form encoded", "application/x-www-form-urlencoded", false},
		{"AC-053 with charset", "application/json; charset=utf-8", true},
		{"AC-053 upper case", "Application/JSON", true},
	}
	for _, ep := range endpoints {
		for _, tc := range cases {
			t.Run(tc.name+" "+ep.path, func(t *testing.T) {
				req := httptest.NewRequest(http.MethodPost, ep.path, strings.NewReader(ep.validBody))
				if tc.contentType != "" {
					req.Header.Set("Content-Type", tc.contentType)
				}
				rec := send(newTestRouter(), req)
				if tc.accepted {
					if rec.Code != http.StatusOK {
						t.Fatalf("status = %d, want 200; body: %s", rec.Code, rec.Body)
					}
					return
				}
				assertError(t, rec, http.StatusUnsupportedMediaType, "UNSUPPORTED_MEDIA_TYPE")
			})
		}
	}
}

func TestPayloadTooLarge(t *testing.T) {
	body := numbersBody(600_000) // about 1.2 MB
	for _, ep := range endpoints {
		t.Run("AC-054 "+ep.path, func(t *testing.T) {
			assertError(t, post(ep.path, body), http.StatusRequestEntityTooLarge, "PAYLOAD_TOO_LARGE")
		})
	}
}

func TestNotFound(t *testing.T) {
	cases := []struct {
		method string
		path   string
	}{
		{http.MethodPost, "/api/v1/modulo"},
		{http.MethodGet, "/"},
		{http.MethodPost, "/api/v1"},
		{http.MethodPost, "/api/v1/add/extra"},
		{http.MethodPost, "/add"},
	}
	for _, tc := range cases {
		t.Run("AC-055 "+tc.method+" "+tc.path, func(t *testing.T) {
			req := httptest.NewRequest(tc.method, tc.path, strings.NewReader(`{}`))
			req.Header.Set("Content-Type", "application/json")
			assertError(t, send(newTestRouter(), req), http.StatusNotFound, "NOT_FOUND")
		})
	}
}

func TestMethodNotAllowed(t *testing.T) {
	for _, ep := range endpoints {
		for _, method := range []string{http.MethodGet, http.MethodPut, http.MethodDelete} {
			t.Run("AC-056 "+method+" "+ep.path, func(t *testing.T) {
				rec := send(newTestRouter(), httptest.NewRequest(method, ep.path, nil))
				assertError(t, rec, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED")
				if got := rec.Header().Get("Allow"); got != http.MethodPost {
					t.Errorf("Allow = %q, want %q", got, http.MethodPost)
				}
			})
		}
	}
	t.Run("AC-056 POST /health", func(t *testing.T) {
		rec := send(newTestRouter(), httptest.NewRequest(http.MethodPost, "/health", nil))
		assertError(t, rec, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED")
		if got := rec.Header().Get("Allow"); got != http.MethodGet {
			t.Errorf("Allow = %q, want %q", got, http.MethodGet)
		}
	})
}

func TestHealth(t *testing.T) {
	t.Run("AC-057 GET /health", func(t *testing.T) {
		rec := send(newTestRouter(), httptest.NewRequest(http.MethodGet, "/health", nil))
		if rec.Code != http.StatusOK {
			t.Fatalf("status = %d, want 200", rec.Code)
		}
		assertJSONContentType(t, rec)
		want := `{"status":"ok"}`
		if got := strings.TrimSpace(rec.Body.String()); got != want {
			t.Fatalf("body = %s, want %s", got, want)
		}
	})
}

func TestCORS(t *testing.T) {
	const allowOrigin = "Access-Control-Allow-Origin"

	t.Run("AC-058 preflight", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodOptions, "/api/v1/add", nil)
		req.Header.Set("Origin", "https://app.example.com")
		req.Header.Set("Access-Control-Request-Method", http.MethodPost)
		req.Header.Set("Access-Control-Request-Headers", "content-type")
		rec := send(newTestRouter(), req)

		if rec.Code != http.StatusNoContent {
			t.Fatalf("status = %d, want 204", rec.Code)
		}
		if got := rec.Header().Get(allowOrigin); got != "*" {
			t.Errorf("%s = %q, want %q", allowOrigin, got, "*")
		}
		if got := rec.Header().Get("Access-Control-Allow-Methods"); !strings.Contains(got, http.MethodPost) {
			t.Errorf("Access-Control-Allow-Methods = %q, want it to contain POST", got)
		}
		if got := rec.Header().Get("Access-Control-Allow-Headers"); !strings.EqualFold(got, "Content-Type") {
			t.Errorf("Access-Control-Allow-Headers = %q, want Content-Type", got)
		}
		if rec.Body.Len() != 0 {
			t.Errorf("body = %q, want it empty", rec.Body)
		}
	})

	t.Run("AC-059 any origin by default", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/v1/add", strings.NewReader(`{"numbers":[1,2]}`))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Origin", "https://app.example.com")
		rec := send(newTestRouter(), req)

		assertResult(t, rec, "add", 3)
		if got := rec.Header().Get(allowOrigin); got != "*" {
			t.Errorf("%s = %q, want %q", allowOrigin, got, "*")
		}
	})

	t.Run("AC-059 error responses carry the header", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/v1/divide", strings.NewReader(`{"numbers":[1,0]}`))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Origin", "https://app.example.com")
		rec := send(newTestRouter(), req)

		assertError(t, rec, http.StatusUnprocessableEntity, "DIVISION_BY_ZERO")
		if got := rec.Header().Get(allowOrigin); got != "*" {
			t.Errorf("%s = %q, want %q", allowOrigin, got, "*")
		}
	})

	restricted := newTestRouter("https://app.example.com", "https://admin.example.com")
	originCases := []struct {
		name   string
		origin string
		want   string
	}{
		{"AC-060 listed origin", "https://app.example.com", "https://app.example.com"},
		{"AC-060 second listed origin", "https://admin.example.com", "https://admin.example.com"},
		{"AC-060 unlisted origin", "https://other.example.com", ""},
	}
	for _, tc := range originCases {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/api/v1/add", strings.NewReader(`{"numbers":[1,2]}`))
			req.Header.Set("Content-Type", "application/json")
			req.Header.Set("Origin", tc.origin)
			rec := send(restricted, req)

			if got := rec.Header().Get(allowOrigin); got != tc.want {
				t.Errorf("%s = %q, want %q", allowOrigin, got, tc.want)
			}
			if got := rec.Header().Get("Vary"); got != "Origin" {
				t.Errorf("Vary = %q, want %q", got, "Origin")
			}
		})
	}
}

func TestRecoverPanics(t *testing.T) {
	t.Run("AC-061 panic in a handler", func(t *testing.T) {
		h := recoverPanics(discardLogger, http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
			panic("secret detail")
		}))
		rec := send(h, httptest.NewRequest(http.MethodPost, "/api/v1/add", nil))

		message := assertError(t, rec, http.StatusInternalServerError, "INTERNAL_ERROR")
		if strings.Contains(message, "secret detail") {
			t.Errorf("message = %q, want it to hide the panic value", message)
		}
	})
}

func TestToAPIError(t *testing.T) {
	cases := []struct {
		name       string
		err        error
		wantStatus int
		wantCode   string
	}{
		{"FR-012 too few operands", calculator.ErrTooFewOperands, http.StatusBadRequest, "VALIDATION_ERROR"},
		{"FR-015 division by zero", fmt.Errorf("%w: detail", calculator.ErrDivisionByZero), http.StatusUnprocessableEntity, "DIVISION_BY_ZERO"},
		{"FR-016 negative square root", calculator.ErrNegativeSquareRoot, http.StatusUnprocessableEntity, "NEGATIVE_SQUARE_ROOT"},
		{"FR-017 undefined result", calculator.ErrUndefinedResult, http.StatusUnprocessableEntity, "UNDEFINED_RESULT"},
		{"FR-018 result out of range", calculator.ErrResultOutOfRange, http.StatusUnprocessableEntity, "RESULT_OUT_OF_RANGE"},
		{"FR-011 validation error passes through", validationError("bad field"), http.StatusBadRequest, "VALIDATION_ERROR"},
		{"FR-023 unknown error", errors.New("secret detail"), http.StatusInternalServerError, "INTERNAL_ERROR"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := toAPIError(tc.err)
			if got.Status != tc.wantStatus || got.Code != tc.wantCode {
				t.Fatalf("got %d %s, want %d %s", got.Status, got.Code, tc.wantStatus, tc.wantCode)
			}
			if got.Status == http.StatusInternalServerError && strings.Contains(got.Message, tc.err.Error()) {
				t.Errorf("message = %q, want it to hide the cause", got.Message)
			}
		})
	}
}

func TestRequestLogging(t *testing.T) {
	var logged strings.Builder
	logger := slog.New(slog.NewJSONHandler(&logged, nil))
	router := NewRouter(Config{AllowedOrigins: []string{"*"}, Logger: logger})

	req := httptest.NewRequest(http.MethodPost, "/api/v1/divide", strings.NewReader(`{"numbers":[1,0]}`))
	req.Header.Set("Content-Type", "application/json")
	send(router, req)

	var entry struct {
		Method string `json:"method"`
		Path   string `json:"path"`
		Status int    `json:"status"`
	}
	if err := json.Unmarshal([]byte(logged.String()), &entry); err != nil {
		t.Fatalf("log line is not JSON: %v; line: %s", err, logged.String())
	}
	if entry.Method != http.MethodPost || entry.Path != "/api/v1/divide" || entry.Status != http.StatusUnprocessableEntity {
		t.Errorf("log entry = %+v, want POST /api/v1/divide 422", entry)
	}
}
