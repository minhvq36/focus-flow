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
	}

	return cfg
}

// getEnv đọc env, nếu không có thì dùng giá trị mặc định
func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}

// requireEnv đọc env, nếu không có thì crash ngay lúc start
func requireEnv(key string) string {
	val := os.Getenv(key)
	if val == "" {
		log.Fatalf("Thiếu biến môi trường bắt buộc: %s", key)
	}
	return val
}
