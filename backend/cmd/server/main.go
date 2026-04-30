package main

import (
	"context"
	"log"
	"net/http"

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

	r := setupRoutes(jwks, pool)

	log.Printf("Server running on :%s\n", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, r); err != nil {
		log.Fatalf("Server error: %v", err)
	}
}
