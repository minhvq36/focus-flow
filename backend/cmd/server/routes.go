package main

import (
	"net/http"

	"github.com/MicahParks/keyfunc/v3"
	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/minhvq36/focus-flow/backend/internal/auth"
	"github.com/minhvq36/focus-flow/backend/internal/economy"
	"github.com/minhvq36/focus-flow/backend/internal/garden"
	"github.com/minhvq36/focus-flow/backend/internal/inventory"
	"github.com/minhvq36/focus-flow/backend/internal/profile"
	"github.com/minhvq36/focus-flow/backend/internal/task"
	"github.com/minhvq36/focus-flow/backend/pkg/cache"
	"github.com/minhvq36/focus-flow/backend/pkg/config"
	"github.com/minhvq36/focus-flow/backend/pkg/logger"
	"github.com/minhvq36/focus-flow/backend/pkg/profanity"
)

func setupRoutes(cfg *config.Config, jwks keyfunc.Keyfunc, db *pgxpool.Pool, c *cache.Cache, log *logger.Logger, pf *profanity.Filter) *chi.Mux {
	r := chi.NewRouter()

	r.Use(chiMiddleware.RequestID)
	r.Use(chiMiddleware.RealIP)
	r.Use(chiMiddleware.Logger)
	r.Use(chiMiddleware.Recoverer)
	r.Use(corsMiddleware(cfg.CORSOrigin))

	r.Get("/health", healthHandler)

	economyRepo := economy.NewRepository(db, log)
	economyAuditor := economy.NewAuditor(economyRepo, log)
	currencySvc := economy.NewCurrencyService(economyRepo, economyAuditor, log)

	r.Group(func(r chi.Router) {
		r.Use(auth.RequireAuth(jwks))
		// Lưới an toàn chung cho mọi request đã đăng nhập (chủ yếu là các route
		// đọc). Các route ghi còn bị siết thêm bởi policy riêng trong từng domain.
		r.Use(auth.RateLimit(c, log, auth.PolicyGlobal))

		r.Route("/api/tasks", task.Routes(db, c, log, economyAuditor))
		r.Route("/api/profile", profile.Routes(db, c, log, currencySvc, pf))
		r.Route("/api/garden", garden.Routes(db, c, log))
		r.Route("/api/inventory", inventory.Routes(db, log))
		r.Route("/api/economy", economy.Routes(db, c, log))
	})

	return r
}

func corsMiddleware(allowedOrigin string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
			w.Header().Set("Access-Control-Expose-Headers", "Retry-After")
			w.Header().Set("Access-Control-Allow-Credentials", "true")

			// Preflight — respond immediately, no auth needed
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"status":"ok"}`))
}
