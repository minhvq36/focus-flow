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
		log.Fatalf("Cấu hình DB sai: %v", err) // TODO: Chuyển tất cả comment, log sang tiếng Anh, thêm tag [] để debug
	}

	config.MaxConns = 10 // TODO: Tune or tối ưu hóa code để xử lý tải lớn, đọc từ .env or .yml

	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		log.Fatalf("Không tạo được pool: %v", err)
	}

	if err := pool.Ping(ctx); err != nil {
		log.Fatalf("Không ping được DB: %v", err)
	}

	fmt.Println("Kết nối DB thành công!")
	return pool
}
