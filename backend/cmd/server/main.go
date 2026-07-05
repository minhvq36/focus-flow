package main

import (
	"context"
	"log"
	"net/http"

	"github.com/minhvq36/focus-flow/backend/internal/auth"
	"github.com/minhvq36/focus-flow/backend/pkg/config"
	"github.com/minhvq36/focus-flow/backend/pkg/db"
	"github.com/minhvq36/focus-flow/backend/pkg/logger"
	"github.com/minhvq36/focus-flow/backend/pkg/profanity" // Thêm thư viện của bạn
)

func main() {
	cfg := config.Load()
	appLog := logger.NewLogger("main")

	ctx := context.Background()
	pool := db.NewPool(ctx, cfg.DatabaseURL)
	defer pool.Close()

	jwks, err := auth.NewJWKS(cfg.SupabaseURL)
	if err != nil {
		log.Fatalf("Failed to create JWKS: %v", err)
	}

	pf, err := profanity.NewFilter("data/badwords.txt", "data/whitelist.txt")
	if err != nil {
		log.Fatalf("Failed to load profanity filter: %v", err)
	}

	r := setupRoutes(jwks, pool, appLog, pf)

	appLog.Info("Server running", "port", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, r); err != nil {
		log.Fatalf("Server error: %v", err)
	}
}
