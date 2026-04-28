package main

import (
	"net/http"

	"github.com/MicahParks/keyfunc/v3"
	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/minhvq36/focus-flow/backend/internal/auth"
	"github.com/minhvq36/focus-flow/backend/internal/task"
)

func setupRoutes(jwks keyfunc.Keyfunc, db *pgxpool.Pool) *chi.Mux {
	r := chi.NewRouter()

	r.Use(chiMiddleware.Logger)
	r.Use(chiMiddleware.Recoverer)

	r.Get("/health", healthHandler)

	r.Group(func(r chi.Router) {
		r.Use(auth.RequireAuth(jwks))
		r.Route("/api/tasks", task.Routes(db))
	})

	return r
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"status":"ok"}`))
}
