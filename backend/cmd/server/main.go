package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os/signal"
	"syscall"
	"time"

	"github.com/minhvq36/focus-flow/backend/internal/auth"
	"github.com/minhvq36/focus-flow/backend/pkg/cache"
	"github.com/minhvq36/focus-flow/backend/pkg/config"
	"github.com/minhvq36/focus-flow/backend/pkg/db"
	"github.com/minhvq36/focus-flow/backend/pkg/logger"
	"github.com/minhvq36/focus-flow/backend/pkg/profanity"
)

const shutdownTimeout = 15 * time.Second

func main() {
	cfg := config.Load()
	appLog := logger.NewLogger("main")

	// Context tự hủy khi nhận SIGINT/SIGTERM — nguồn cho graceful shutdown
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	pool, err := db.NewPool(ctx, cfg.DatabaseURL, cfg.DBMaxConns, cfg.DBMinConns)
	if err != nil {
		log.Fatalf("[MAIN] %v", err)
	}
	defer pool.Close()

	redisCache, err := cache.New(ctx, cfg.RedisURL)
	if err != nil {
		log.Fatalf("[MAIN] %v", err)
	}
	defer func() {
		if err := redisCache.Close(); err != nil {
			appLog.Error("[MAIN] Failed to close redis", "error", err.Error())
		}
	}()

	jwks, err := auth.NewJWKS(cfg.SupabaseURL)
	if err != nil {
		log.Fatalf("[MAIN] Failed to create JWKS: %v", err)
	}

	pf, err := profanity.NewFilter("data/badwords.txt", "data/whitelist.txt")
	if err != nil {
		log.Fatalf("[MAIN] Failed to load profanity filter: %v", err)
	}

	router := setupRoutes(cfg, jwks, pool, redisCache, appLog, pf)

	server := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           router,
		ReadHeaderTimeout: 10 * time.Second,
	}

	// Chạy server ở goroutine riêng để main goroutine chờ tín hiệu shutdown
	serverErr := make(chan error, 1)
	go func() {
		appLog.Info("[MAIN] Server running", "port", cfg.Port, "env", cfg.Env)
		serverErr <- server.ListenAndServe()
	}()

	select {
	case err := <-serverErr:
		if err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("[MAIN] Server error: %v", err)
		}
	case <-ctx.Done():
		// GRACEFUL SHUTDOWN: ngừng nhận request mới, chờ request đang chạy xong.
		// Quan trọng với FocusFlow vì submit/give-up đang mở transaction đa bảng.
		appLog.Info("[MAIN] Shutdown signal received, draining in-flight requests...")
		shutdownCtx, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
		defer cancel()

		if err := server.Shutdown(shutdownCtx); err != nil {
			appLog.Error("[MAIN] Graceful shutdown failed, forcing close", "error", err.Error())
			if err := server.Close(); err != nil {
				appLog.Error("[MAIN] Force close failed", "error", err.Error())
			}
		}
		appLog.Info("[MAIN] Server stopped gracefully")
	}
}
