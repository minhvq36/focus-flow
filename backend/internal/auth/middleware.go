package auth

import (
	"context"
	"net/http"
	"strings"

	"github.com/MicahParks/keyfunc/v3"
	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const UserIDKey contextKey = "userID"

func NewJWKS(supabaseURL string) (keyfunc.Keyfunc, error) {
	jwksURL := supabaseURL + "/auth/v1/.well-known/jwks.json"
	return keyfunc.NewDefault([]string{jwksURL})
}

// Register jwtSecret here so middleware can use it, avoid passing around multiple places
func RequireAuth(k keyfunc.Keyfunc) func(http.Handler) http.Handler {
	// Handle connections for routes that require auth
	return func(next http.Handler) http.Handler {
		// Authenticate all requests passing through this route
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Get token from header
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				http.Error(w, `{"error":"missing authorization header"}`, http.StatusUnauthorized)
				return
			}

			// Check format "Bearer <token>"
			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || parts[0] != "Bearer" {
				http.Error(w, `{"error":"invalid authorization format"}`, http.StatusUnauthorized)
				return
			}

			tokenStr := parts[1]

			// Verify JWT
			token, err := jwt.Parse(tokenStr, k.Keyfunc)
			if err != nil || !token.Valid {
				http.Error(w, `{"error":"invalid token"}`, http.StatusUnauthorized)
				return
			}

			// Get userID from claim "sub"
			claims, ok := token.Claims.(jwt.MapClaims)
			if !ok {
				http.Error(w, `{"error":"invalid token claims"}`, http.StatusUnauthorized)
				return
			}

			userID, ok := claims["sub"].(string)
			if !ok || userID == "" {
				http.Error(w, `{"error":"missing user id in token"}`, http.StatusUnauthorized)
				return
			}

			// Store userID in context — handler retrieves for guardrails, logging, etc
			ctx := context.WithValue(r.Context(), UserIDKey, userID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// GetUserID — helper to retrieve userID from context in handler
func GetUserID(ctx context.Context) (string, bool) {
	userID, ok := ctx.Value(UserIDKey).(string)
	return userID, ok
}
