# ==========================================
# Stage 1: Build Frontend (React 19 + Vite)
# ==========================================
FROM node:22-alpine AS frontend-builder
WORKDIR /app

# Enable corepack & pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

# ==========================================
# Stage 2: Build Go Server
# ==========================================
FROM golang:1.24-alpine AS backend-builder
WORKDIR /app
COPY server-go/go.mod ./
COPY server-go/main.go ./
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o markflow-server main.go

# ==========================================
# Stage 3: Minimal Final Runtime Image (< 25MB)
# ==========================================
FROM alpine:3.21
WORKDIR /app

RUN apk add --no-cache ca-certificates tzdata

COPY --from=backend-builder /app/markflow-server /app/markflow-server
COPY --from=frontend-builder /app/dist /app/dist

# Default environment configuration
ENV PORT=8080
ENV WORKSPACE_DIR=/workspace
ENV STATIC_DIR=/app/dist

# Expose web port
EXPOSE 8080

# Volume mount for markdown workspace directory
VOLUME ["/workspace"]

ENTRYPOINT ["/app/markflow-server"]
