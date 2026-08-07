package db

import (
	"context"
	"fmt"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
)

// NewPool tạo connection pool PostgreSQL với giới hạn đọc từ config.
func NewPool(ctx context.Context, databaseURL string, maxConns, minConns int32) (*pgxpool.Pool, error) {
	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("[DB] invalid database configuration: %w", err)
	}

	config.MaxConns = maxConns
	config.MinConns = minConns

	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return nil, fmt.Errorf("[DB] failed to create connection pool: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("[DB] failed to ping database: %w", err)
	}

	log.Println("[DB] Database connection pool established successfully")
	return pool, nil
}
