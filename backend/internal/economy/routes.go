package economy

import (
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/minhvq36/focus-flow/backend/internal/auth"
	"github.com/minhvq36/focus-flow/backend/pkg/cache"
	"github.com/minhvq36/focus-flow/backend/pkg/logger"
)

func Routes(db *pgxpool.Pool, c *cache.Cache, log *logger.Logger) func(r chi.Router) {
	repo := NewRepository(db, log)
	auditor := NewAuditor(repo, log)
	currencySvc := NewCurrencyService(repo, auditor, log)
	service := NewService(db, repo, currencySvc, c, log)
	handler := NewHandler(service, log)

	// Mua/bán đụng thẳng vào ví tiền + inventory trong 1 transaction -> siết chặt
	rlBuy := auth.RateLimit(c, log, auth.PolicyShopBuy)
	rlSell := auth.RateLimit(c, log, auth.PolicyShopSell)

	return func(r chi.Router) {
		r.Get("/wallet", handler.GetWallet)
		r.Get("/shop/buy", handler.GetShopItems)
		r.Get("/shop/sell", handler.GetSellableItems)

		r.With(rlBuy).Post("/shop/buy", handler.Buy)
		r.With(rlSell).Post("/shop/sell", handler.Sell)
	}
}
