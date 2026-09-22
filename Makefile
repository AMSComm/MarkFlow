.PHONY: help dev build server docker-build docker-run desktop clean

help:
	@echo "MarkFlow Developer Commands:"
	@echo "  make dev          - Run frontend development server (Vite)"
	@echo "  make build        - Build production frontend bundle"
	@echo "  make server       - Build and run Go backend server"
	@echo "  make docker-build - Build compact (< 25MB) Docker image"
	@echo "  make docker-run   - Run Docker container on port 8080"
	@echo "  make desktop      - Run native Tauri v2 desktop app"

dev:
	pnpm dev

build:
	pnpm run build

server: build
	cd server-go && go run main.go

docker-build:
	docker build -t markflow:latest .

docker-run:
	docker run --rm -p 8080:8080 -v $$(pwd)/workspace:/workspace markflow:latest

desktop:
	pnpm tauri dev

clean:
	rm -rf dist node_modules src-tauri/target
