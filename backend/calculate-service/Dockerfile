# Build stage: compiles a static binary.
FROM golang:1.24-alpine AS build
WORKDIR /src

# Dependencies first, in their own layer, so a source change does not
# download them again. (The service has none today; this keeps it true later.)
COPY go.mod ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/server ./cmd/server

# Final stage: the binary on a minimal base, run as a user that is not root.
FROM alpine:3
RUN adduser -D -H -u 10001 app
COPY --from=build /out/server /usr/local/bin/server
USER app

ENV PORT=8080
EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=3s --start-period=3s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT}/health" || exit 1

ENTRYPOINT ["server"]
