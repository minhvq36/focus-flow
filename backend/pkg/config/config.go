package config

import (
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Env  string
	Port string

	DatabaseURL string
	DBMaxConns  int32
	DBMinConns  int32

	RedisURL string

	SupabaseURL string

	CORSOrigin string
}

func Load() *Config {
	// Chỉ load .env khi dev, production dùng env thật
	if os.Getenv("ENV") != "production" {
		godotenv.Load()
	}

	cfg := &Config{
		Env:  getEnv("ENV", "development"),
		Port: getEnv("PORT", "8080"),

		DatabaseURL: requireEnv("DATABASE_URL"),
		DBMaxConns:  int32(getEnvInt("DB_MAX_CONNS", 10)),
		DBMinConns:  int32(getEnvInt("DB_MIN_CONNS", 2)),

		RedisURL: requireEnv("REDIS_URL"),

		SupabaseURL: requireEnv("SUPABASE_URL"), // TODO: Consider to upgrade to Asymmetric Key JWKS

		CORSOrigin: getEnv("CORS_ORIGIN", "http://localhost:5173"),
	}

	return cfg
}

// getEnv reads env, uses fallback value if not found
func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}

// getEnvInt reads env as int, uses fallback if missing or invalid
func getEnvInt(key string, fallback int) int {
	val := os.Getenv(key)
	if val == "" {
		return fallback
	}
	n, err := strconv.Atoi(val)
	if err != nil {
		log.Printf("[CONFIG] Invalid integer for %s=%q, using fallback %d", key, val, fallback)
		return fallback
	}
	return n
}

// requireEnv reads env, crashes at startup if not found
func requireEnv(key string) string {
	val := os.Getenv(key)
	if val == "" {
		log.Fatalf("[CONFIG] Missing required environment variable: %s", key)
	}
	return val
}
