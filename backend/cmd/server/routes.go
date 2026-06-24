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
	"github.com/minhvq36/focus-flow/backend/internal/task"
	"github.com/minhvq36/focus-flow/backend/pkg/logger"
)

func setupRoutes(jwks keyfunc.Keyfunc, db *pgxpool.Pool, log *logger.Logger) *chi.Mux {
	r := chi.NewRouter()

	r.Use(chiMiddleware.Logger)
	r.Use(chiMiddleware.Recoverer)
	r.Use(corsMiddleware)

	r.Get("/health", healthHandler)

	economyRepo := economy.NewRepository(db, log)
	economyAuditor := economy.NewAuditor(economyRepo, log)

	r.Group(func(r chi.Router) {
		r.Use(auth.RequireAuth(jwks))
		r.Route("/api/tasks", task.Routes(db, log, economyAuditor))
		r.Route("/api/garden", garden.Routes(db, log))
		r.Route("/api/inventory", inventory.Routes(db, log))
		r.Route("/api/economy", economy.Routes(db, log))
	})

	return r
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// TODO: IMPROVE: Make this more robust for production use (handle multiple origins, env config, etc.)
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:5173")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		// Preflight — respond immediately, no auth needed
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"status":"ok"}`))
}
