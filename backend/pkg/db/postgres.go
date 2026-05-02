package db

import (
	"context"
	"fmt"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
)

func NewPool(ctx context.Context, databaseURL string) *pgxpool.Pool {
	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		log.Fatalf("Invalid DB configuration: %v", err) // TODO: Convert all comments and logs to English, add [] tag for debugging
	}

	config.MaxConns = 10 // TODO: Tune or optimize code to handle large load, read from .env or .yml

	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		log.Fatalf("Failed to create pool: %v", err)
	}

	if err := pool.Ping(ctx); err != nil {
		log.Fatalf("Failed to ping DB: %v", err)
	}

	fmt.Println("Database connection successful!")
	return pool
}
