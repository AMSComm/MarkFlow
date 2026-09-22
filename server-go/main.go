package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"
)

type FileEntry struct {
	Name        string      `json:"name"`
	Path        string      `json:"path"`
	IsDirectory bool        `json:"isDirectory"`
	Children    []FileEntry `json:"children,omitempty"`
	Size        int64       `json:"size,omitempty"`
	UpdatedAt   int64       `json:"updatedAt,omitempty"`
}

type WriteFileRequest struct {
	Path    string `json:"path"`
	Content string `json:"content"`
}

type CreateFileRequest struct {
	Path    string `json:"path"`
	Content string `json:"content"`
	IsDir   bool   `json:"isDir"`
}

type DeleteRequest struct {
	Path string `json:"path"`
}

type RenameRequest struct {
	OldPath string `json:"oldPath"`
	NewPath string `json:"newPath"`
}

type ReaderArticle struct {
	Title    string `json:"title"`
	Content  string `json:"content"`
	SiteName string `json:"siteName,omitempty"`
}

var (
	workspaceDir = "./workspace"
	staticDir    = "./dist"
	port         = "8080"
)

func init() {
	if ws := os.Getenv("WORKSPACE_DIR"); ws != "" {
		workspaceDir = ws
	}
	if st := os.Getenv("STATIC_DIR"); st != "" {
		staticDir = st
	}
	if p := os.Getenv("PORT"); p != "" {
		port = p
	}

	// Ensure workspace directory exists
	if err := os.MkdirAll(workspaceDir, 0755); err != nil {
		log.Fatalf("Failed to create workspace directory: %v", err)
	}

	// Create sample welcome file if workspace is empty
	welcomePath := filepath.Join(workspaceDir, "welcome.md")
	if _, err := os.Stat(welcomePath); os.IsNotExist(err) {
		sampleMd := `# 🚀 Welcome to MarkFlow (Docker Mode)

MarkFlow is running inside your high-performance container.

---

## ⚡ Live Mermaid Test
` + "```mermaid\n" +
			`flowchart LR
    Browser["Web Browser"] -->|HTTP API| GoServer["Go Static & API Server (< 20MB)"]
    GoServer -->|Mounted Volume| Storage["/workspace Directory"]
` + "```\n\n" +
			`- [x] High Performance Go backend\n- [x] Zero-Lag CodeMirror 6\n- [x] Real-time Mermaid SVG\n`
		_ = os.WriteFile(welcomePath, []byte(sampleMd), 0644)
	}
}

// resolveSafePath verifies that the requested path does not escape the workspace root.
func resolveSafePath(relPath string) (string, error) {
	rel := filepath.Clean(strings.TrimPrefix(relPath, "/"))
	if strings.HasPrefix(rel, "..") || strings.Contains(rel, "../") {
		return "", fmt.Errorf("directory traversal forbidden: %s", relPath)
	}
	absPath := filepath.Join(workspaceDir, rel)
	return absPath, nil
}

func enableCORS(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		next(w, r)
	}
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "ok", "service": "markflow-server"})
}

func handleRoot(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{"root": "/"})
}

func handleList(w http.ResponseWriter, r *http.Request) {
	reqPath := r.URL.Query().Get("path")
	fullPath, err := resolveSafePath(reqPath)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	entries, err := os.ReadDir(fullPath)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to read directory: %v", err), http.StatusInternalServerError)
		return
	}

	var results []FileEntry
	for _, entry := range entries {
		info, err := entry.Info()
		if err != nil {
			continue
		}

		rel, _ := filepath.Rel(workspaceDir, filepath.Join(fullPath, entry.Name()))
		virtualPath := "/" + filepath.ToSlash(rel)

		item := FileEntry{
			Name:        entry.Name(),
			Path:        virtualPath,
			IsDirectory: entry.IsDir(),
			Size:        info.Size(),
			UpdatedAt:   info.ModTime().UnixMilli(),
		}

		if entry.IsDir() {
			// Pre-fetch 1 level of children for quick tree display
			subPath := filepath.Join(fullPath, entry.Name())
			if subEntries, err := os.ReadDir(subPath); err == nil {
				var children []FileEntry
				for _, sub := range subEntries {
					subInfo, _ := sub.Info()
					subRel, _ := filepath.Rel(workspaceDir, filepath.Join(subPath, sub.Name()))
					children = append(children, FileEntry{
						Name:        sub.Name(),
						Path:        "/" + filepath.ToSlash(subRel),
						IsDirectory: sub.IsDir(),
						Size:        subInfo.Size(),
						UpdatedAt:   subInfo.ModTime().UnixMilli(),
					})
				}
				item.Children = children
			}
		}

		results = append(results, item)
	}

	sort.Slice(results, func(i, j int) bool {
		if results[i].IsDirectory && !results[j].IsDirectory {
			return true
		}
		if !results[i].IsDirectory && results[j].IsDirectory {
			return false
		}
		return strings.ToLower(results[i].Name) < strings.ToLower(results[j].Name)
	})

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(results)
}

func handleRead(w http.ResponseWriter, r *http.Request) {
	reqPath := r.URL.Query().Get("path")
	fullPath, err := resolveSafePath(reqPath)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	data, err := os.ReadFile(fullPath)
	if err != nil {
		http.Error(w, fmt.Sprintf("File not found: %v", err), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	_, _ = w.Write(data)
}

func handleWrite(w http.ResponseWriter, r *http.Request) {
	var req WriteFileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	fullPath, err := resolveSafePath(req.Path)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if err := os.WriteFile(fullPath, []byte(req.Content), 0644); err != nil {
		http.Error(w, fmt.Sprintf("Failed to write file: %v", err), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func handleCreate(w http.ResponseWriter, r *http.Request) {
	var req CreateFileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	fullPath, err := resolveSafePath(req.Path)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if req.IsDir {
		if err := os.MkdirAll(fullPath, 0755); err != nil {
			http.Error(w, fmt.Sprintf("Failed to create folder: %v", err), http.StatusInternalServerError)
			return
		}
	} else {
		// Ensure parent directory exists
		_ = os.MkdirAll(filepath.Dir(fullPath), 0755)
		if err := os.WriteFile(fullPath, []byte(req.Content), 0644); err != nil {
			http.Error(w, fmt.Sprintf("Failed to create file: %v", err), http.StatusInternalServerError)
			return
		}
	}

	w.WriteHeader(http.StatusCreated)
}

func handleDelete(w http.ResponseWriter, r *http.Request) {
	var req DeleteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	fullPath, err := resolveSafePath(req.Path)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if err := os.RemoveAll(fullPath); err != nil {
		http.Error(w, fmt.Sprintf("Failed to delete: %v", err), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func handleRename(w http.ResponseWriter, r *http.Request) {
	var req RenameRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	oldPath, err := resolveSafePath(req.OldPath)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	newPath, err := resolveSafePath(req.NewPath)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	_ = os.MkdirAll(filepath.Dir(newPath), 0755)
	if err := os.Rename(oldPath, newPath); err != nil {
		http.Error(w, fmt.Sprintf("Failed to rename: %v", err), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// handleReader extracts clean reading mode content from an external URL
func handleReader(w http.ResponseWriter, r *http.Request) {
	targetUrl := r.URL.Query().Get("url")
	if targetUrl == "" {
		http.Error(w, "Missing url parameter", http.StatusBadRequest)
		return
	}

	parsed, err := url.Parse(targetUrl)
	if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") {
		http.Error(w, "Invalid URL scheme", http.StatusBadRequest)
		return
	}

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Get(targetUrl)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to fetch url: %v", err), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(io.LimitReader(resp.Body, 1024*1024)) // limit to 1MB
	if err != nil {
		http.Error(w, "Failed to read body", http.StatusInternalServerError)
		return
	}

	htmlContent := string(bodyBytes)

	// Extract <title>
	title := targetUrl
	titleRegex := regexp.MustCompile(`(?i)<title[^>]*>(.*?)</title>`)
	if matches := titleRegex.FindStringSubmatch(htmlContent); len(matches) > 1 {
		title = strings.TrimSpace(matches[1])
	}

	// Clean out script, style, and comments
	cleanRegex := regexp.MustCompile(`(?is)<(script|style)[^>]*>.*?</(script|style)>`)
	stripped := cleanRegex.ReplaceAllString(htmlContent, "")

	// Extract main text
	tagRegex := regexp.MustCompile(`<[^>]+>`)
	text := tagRegex.ReplaceAllString(stripped, " ")
	spaceRegex := regexp.MustCompile(`\s+`)
	cleanText := spaceRegex.ReplaceAllString(text, " ")

	if len(cleanText) > 2000 {
		cleanText = cleanText[:2000] + "..."
	}

	article := ReaderArticle{
		Title:    title,
		SiteName: parsed.Hostname(),
		Content:  fmt.Sprintf("## %s\n\n> Extracted from [%s](%s)\n\n%s", title, parsed.Hostname(), targetUrl, cleanText),
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(article)
}

func main() {
	mux := http.NewServeMux()

	// API Routes
	mux.HandleFunc("/api/health", enableCORS(handleHealth))
	mux.HandleFunc("/api/fs/root", enableCORS(handleRoot))
	mux.HandleFunc("/api/fs/list", enableCORS(handleList))
	mux.HandleFunc("/api/fs/read", enableCORS(handleRead))
	mux.HandleFunc("/api/fs/write", enableCORS(handleWrite))
	mux.HandleFunc("/api/fs/create", enableCORS(handleCreate))
	mux.HandleFunc("/api/fs/delete", enableCORS(handleDelete))
	mux.HandleFunc("/api/fs/rename", enableCORS(handleRename))
	mux.HandleFunc("/api/reader", enableCORS(handleReader))

	// Static SPA File Server
	fileServer := http.FileServer(http.Dir(staticDir))
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		path := filepath.Join(staticDir, filepath.Clean(r.URL.Path))
		if _, err := os.Stat(path); os.IsNotExist(err) {
			// SPA fallback to index.html
			http.ServeFile(w, r, filepath.Join(staticDir, "index.html"))
			return
		}
		fileServer.ServeHTTP(w, r)
	})

	server := &http.Server{
		Addr:         ":" + port,
		Handler:      mux,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 15 * time.Second,
	}

	log.Printf("MarkFlow Server starting on port %s (Workspace: %s, Static: %s)", port, workspaceDir, staticDir)
	if err := server.ListenAndServe(); err != nil {
		log.Fatalf("Server terminated: %v", err)
	}
}
