package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Env         string
	Port        string
	DatabaseURL string
	SupabaseURL string
}

func Load() *Config {
	// Chỉ load .env khi dev, production dùng env thật
	if os.Getenv("ENV") != "production" {
		godotenv.Load()
	}

	cfg := &Config{
		Env:         getEnv("ENV", "development"),
		Port:        getEnv("PORT", "8080"), // TODO: Determine for Backend Port
		DatabaseURL: requireEnv("DATABASE_URL"),
		SupabaseURL: requireEnv("SUPABASE_URL"), // TODO: Consider to upgrade to Asymmetric Key JWKS
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

// requireEnv reads env, crashes at startup if not found
func requireEnv(key string) string {
	val := os.Getenv(key)
	if val == "" {
		log.Fatalf("Missing required environment variable: %s", key)
	}
	return val
}
