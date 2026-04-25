package main

import (
	"context"
	"fmt"
	"log"

	"github.com/minhvq36/focus-flow/backend/pkg/config"
	"github.com/minhvq36/focus-flow/backend/pkg/db"
)

func main() {
	cfg := config.Load()

	ctx := context.Background()
	pool := db.NewPool(ctx, cfg.DatabaseURL)
	defer pool.Close()

	// Test query tạm — xóa sau
	var count int
	err := pool.QueryRow(ctx, "SELECT COUNT(*) FROM public.gardens").Scan(&count)
	if err != nil {
		log.Fatalf("Query thất bại: %v", err)
	}

	fmt.Printf("Số gardens: %d\n", count)
}
