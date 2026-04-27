package main

import (
	"context"
	"fmt"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/minhvq36/focus-flow/backend/internal/auth"
	"github.com/minhvq36/focus-flow/backend/pkg/config"
	"github.com/minhvq36/focus-flow/backend/pkg/db"
)

func main() {
	cfg := config.Load()

	ctx := context.Background()
	pool := db.NewPool(ctx, cfg.DatabaseURL)
	defer pool.Close()

	jwks, err := auth.NewJWKS(cfg.SupabaseURL)
	if err != nil {
		log.Fatalf("Failed to create JWKS: %v", err)
	}

	r := chi.NewRouter()

	r.Use(chiMiddleware.Logger)    // Middleware log request
	r.Use(chiMiddleware.Recoverer) // Auto recover if panic

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) { // TODO: To refactor to another file
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
	})

	r.Group(func(r chi.Router) {
		r.Use(auth.RequireAuth(jwks)) // Middleware auth cho tất cả route bên trong group này
		// Placeholder — sẽ thay bằng handler thật sau
		r.Get("/api/tasks", func(w http.ResponseWriter, r *http.Request) {
			userID, _ := auth.GetUserID(r.Context())
			w.Header().Set("Content-Type", "application/json")
			fmt.Fprintf(w, `{"message":"hello user %s"}`, userID)
		})
	})

	log.Printf("Server chạy tại :%s\n", cfg.Port)
	http.ListenAndServe(":"+cfg.Port, r)
}
