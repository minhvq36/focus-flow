package main

import (
	"net/http"

	"github.com/MicahParks/keyfunc/v3"
	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/minhvq36/focus-flow/backend/internal/auth"
)

func setupRoutes(jwks keyfunc.Keyfunc) *chi.Mux {
	r := chi.NewRouter()

	r.Use(chiMiddleware.Logger)
	r.Use(chiMiddleware.Recoverer)

	r.Get("/health", healthHandler)

	r.Group(func(r chi.Router) {
		r.Use(auth.RequireAuth(jwks))
		// Task routes — thêm vào đây sau
	})

	return r
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"status":"ok"}`))
}
