# syntax=docker/dockerfile:1

ARG GO_VERSION=1.26

# ============================================================================
# STAGE 1 — BUILD
# ============================================================================
FROM golang:${GO_VERSION}-bookworm AS builder

WORKDIR /src

# Tách bước tải module ra layer riêng: sửa code không làm vỡ cache của go mod download
COPY go.mod go.sum ./
RUN go mod download && go mod verify

COPY . .

# CGO_ENABLED=0 -> binary tĩnh, không phụ thuộc libc của image runtime (pgx và
#   go-redis đều thuần Go nên không mất gì).
# -trimpath -ldflags="-s -w" -> bỏ đường dẫn build, symbol table và DWARF.
#   Binary nhẹ đi đáng kể, quan trọng với VM 256MB và cold start của autostop.
RUN CGO_ENABLED=0 GOOS=linux go build \
    -trimpath \
    -ldflags="-s -w" \
    -o /run-app ./cmd/server

# ============================================================================
# STAGE 2 — RUNTIME
# ============================================================================
FROM debian:bookworm-slim

# ca-certificates là BẮT BUỘC: backend mở TLS ra Supabase (Postgres + JWKS)
# và Redis qua rediss://. Thiếu là fail ngay lúc boot.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /run-app /usr/local/bin/run-app

# BẮT BUỘC — đừng bỏ dòng này:
# cmd/server/main.go gọi profanity.NewFilter("data/badwords.txt", "data/whitelist.txt")
# bằng ĐƯỜNG DẪN TƯƠNG ĐỐI so với working dir, và log.Fatalf nếu đọc không được.
# Không copy thư mục data -> machine crash loop ngay lúc khởi động.
COPY data ./data

# pkg/logger ghi thêm vào logs/server.log khi ENV=production. Filesystem của Fly
# Machine là ephemeral nên file này chỉ là bản nháp — nguồn log thật là stdout
# (`fly logs`). Tạo sẵn thư mục để logger không âm thầm nuốt lỗi mở file.
RUN mkdir -p /app/logs \
    && useradd --uid 10001 --create-home appuser \
    && chown -R appuser:appuser /app
USER appuser

EXPOSE 8080

CMD ["run-app"]
