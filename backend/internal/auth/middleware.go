package auth

import (
	"net/http"
)

// Middleware for JWT validation
func JWTMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// JWT validation logic
		next.ServeHTTP(w, r)
	})
}
