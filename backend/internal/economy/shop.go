package economy

import (
	"context"
	"fmt"
	"math"

	"github.com/minhvq36/focus-flow/backend/pkg/logger"
)

// Khai báo Interface để Service gọi xuống Repo (Dễ Mock khi viết Unit Test)
type RepositoryInterface interface {
	GetUserWallet(ctx context.Context, userID string) (*UserWallet, error)
	GetPurchasableItems(ctx context.Context) ([]Item, error)
	GetInventoryForSale(ctx context.Context, userID string) ([]InventoryItemDetail, error)
}

type Service struct {
	repo RepositoryInterface
	log  *logger.Logger
}

func NewService(repo RepositoryInterface, log *logger.Logger) *Service {
	return &Service{
		repo: repo,
		log:  log,
	}
}

// ==========================================
// 1. GET WALLET (Lấy số dư)
// ==========================================

func (s *Service) GetWallet(ctx context.Context, userID string) (*WalletResponse, error) {
	userWallet, err := s.repo.GetUserWallet(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("GetWallet: %w", err)
	}

	return &WalletResponse{
		SilverBalance: userWallet.SilverBalance,
		GoldBalance:   userWallet.GoldBalance,
	}, nil
}

// ==========================================
// 2. GET SHOP ITEMS (Đồ hệ thống bán)
// ==========================================

func (s *Service) GetShopItems(ctx context.Context) ([]ShopItemResponse, error) {
	items, err := s.repo.GetPurchasableItems(ctx)
	if err != nil {
		return nil, fmt.Errorf("GetShopItems: %w", err)
	}

	// Map DB Entity sang Response DTO
	result := make([]ShopItemResponse, 0, len(items))
	for _, item := range items {
		result = append(result, ShopItemResponse{
			ID:          item.ID,
			Name:        item.Name,
			Type:        item.Type,
			Rarity:      item.Rarity,
			AssetKey:    item.AssetKey,
			SilverPrice: *item.SilverPrice,
		})
	}

	return result, nil
}

// ==========================================
// 3. GET INVENTORY FOR SALE (Đồ trong kho để bán lại cho Shop)
// ==========================================

func (s *Service) GetSellableItems(ctx context.Context, userID string) ([]SellableItemResponse, error) {
	inventory, err := s.repo.GetInventoryForSale(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("GetSellableItems: %w", err)
	}

	result := make([]SellableItemResponse, 0, len(inventory))
	for _, item := range inventory {

		// Gọi Helper function để tính giá
		buybackSilver, buybackGold := calculateBuybackPrice(item.OriginalPrice, item.Rarity)

		result = append(result, SellableItemResponse{
			InventoryID:   item.InventoryID,
			ItemID:        item.ItemID,
			Name:          item.Name,
			Type:          item.Type,
			Rarity:        item.Rarity,
			AssetKey:      item.AssetKey,
			BuybackSilver: buybackSilver,
			BuybackGold:   buybackGold,
		})
	}

	return result, nil
}
func calculateBuybackPrice(originalPrice *int, rarity string) (silver int, gold int) {
	silver = 0
	if originalPrice != nil {
		silver = int(math.Floor(float64(*originalPrice) * SilverBuybackRate))
	}

	gold = 0
	switch rarity {
	case "legendary":
		gold = BuybackGoldLegendary
	case "eternal":
		gold = BuybackGoldEternal
	}

	return silver, gold
}
