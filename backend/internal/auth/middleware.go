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

// Đăng ký jwtSecret ở đây để middleware có thể dùng, tránh phải truyền đi truyền lại nhiều chỗ
func RequireAuth(k keyfunc.Keyfunc) func(http.Handler) http.Handler {
	// Nhận kết nối cho các route cần auth
	return func(next http.Handler) http.Handler {
		// Auth cho mọi request đi qua route đó
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Lấy token từ header
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				http.Error(w, `{"error":"missing authorization header"}`, http.StatusUnauthorized)
				return
			}

			// Kiểm tra format "Bearer <token>"
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

			// Lấy userID từ claim "sub"
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

			// Nhét userID vào context — handler lấy ra dùng for guardrails, logging, etc
			ctx := context.WithValue(r.Context(), UserIDKey, userID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// GetUserID — helper để lấy userID từ context trong handler
func GetUserID(ctx context.Context) (string, bool) {
	userID, ok := ctx.Value(UserIDKey).(string)
	return userID, ok
}
