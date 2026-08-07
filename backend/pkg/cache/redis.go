package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/redis/go-redis/v9"
)

// Cache bọc go-redis client, cung cấp helper JSON + rate limit cho toàn backend.
type Cache struct {
	client *redis.Client
}

// New tạo Redis client từ URL và ping để chắc chắn kết nối được ngay lúc khởi động.
func New(ctx context.Context, redisURL string) (*Cache, error) {
	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("[CACHE] invalid redis configuration: %w", err)
	}

	client := redis.NewClient(opts)
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("[CACHE] failed to ping redis: %w", err)
	}

	log.Println("[CACHE] Redis connection established successfully")
	return &Cache{client: client}, nil
}

// Client expose client gốc (dùng cho health check / INFO stats).
func (c *Cache) Client() *redis.Client {
	return c.client
}

// Close đóng connection pool của Redis.
func (c *Cache) Close() error {
	return c.client.Close()
}

// SetJSON marshal value sang JSON rồi lưu kèm TTL.
func (c *Cache) SetJSON(ctx context.Context, key string, value any, ttl time.Duration) error {
	data, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("marshal cache value for %s: %w", key, err)
	}
	if err := c.client.Set(ctx, key, data, ttl).Err(); err != nil {
		return fmt.Errorf("set cache key %s: %w", key, err)
	}
	return nil
}

// GetJSON đọc key và unmarshal vào dest.
// Trả (false, nil) khi cache miss — miss KHÔNG phải lỗi.
func (c *Cache) GetJSON(ctx context.Context, key string, dest any) (bool, error) {
	data, err := c.client.Get(ctx, key).Bytes()
	if err != nil {
		if err == redis.Nil {
			return false, nil
		}
		return false, fmt.Errorf("get cache key %s: %w", key, err)
	}
	if err := json.Unmarshal(data, dest); err != nil {
		return false, fmt.Errorf("unmarshal cache value for %s: %w", key, err)
	}
	return true, nil
}

// Delete xóa một hoặc nhiều key.
func (c *Cache) Delete(ctx context.Context, keys ...string) error {
	if len(keys) == 0 {
		return nil
	}
	if err := c.client.Del(ctx, keys...).Err(); err != nil {
		return fmt.Errorf("delete cache keys %v: %w", keys, err)
	}
	return nil
}

// RateLimitResult — kết quả một lần kiểm tra rate limit.
type RateLimitResult struct {
	Allowed    bool
	Remaining  int           // số request còn lại trong cửa sổ hiện tại (>= 0)
	RetryAfter time.Duration // thời gian còn lại của cửa sổ, dùng cho header Retry-After
}

// RateLimitCheck — fixed-window counter.
//
// Dùng pipeline để chỉ tốn 1 round-trip: INCR (đếm) + EXPIRE NX (đặt TTL cho
// key mới, không đụng vào TTL của key đang chạy) + PTTL (lấy thời gian còn lại).
// EXPIRE NX quan trọng hơn cách "chỉ set TTL khi count == 1": nếu process chết
// giữa INCR và EXPIRE thì key sẽ tồn tại vĩnh viễn và khoá user mãi mãi.
func (c *Cache) RateLimitCheck(ctx context.Context, key string, limit int, window time.Duration) (RateLimitResult, error) {
	pipe := c.client.Pipeline()
	incr := pipe.Incr(ctx, key)
	pipe.ExpireNX(ctx, key, window)
	pttl := pipe.PTTL(ctx, key)

	if _, err := pipe.Exec(ctx); err != nil {
		return RateLimitResult{}, fmt.Errorf("rate limit check %s: %w", key, err)
	}

	count := incr.Val()
	remaining := int64(limit) - count
	if remaining < 0 {
		remaining = 0
	}

	// PTTL trả -1 (không TTL) / -2 (key không tồn tại) trong tình huống bất thường
	// -> fallback về nguyên cửa sổ để client không retry ngay lập tức.
	retryAfter := pttl.Val()
	if retryAfter <= 0 {
		retryAfter = window
	}

	return RateLimitResult{
		Allowed:    count <= int64(limit),
		Remaining:  int(remaining),
		RetryAfter: retryAfter,
	}, nil
}
