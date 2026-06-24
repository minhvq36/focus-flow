package economy

import (
	"context"
	"fmt"
	"math"
	"sort"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/minhvq36/focus-flow/backend/pkg/apperr"
	"github.com/minhvq36/focus-flow/backend/pkg/logger"
)

// Khai báo Interface để Service gọi xuống Repo (Dễ Mock khi viết Unit Test)
type RepositoryInterface interface {
	// --- Các hàm Đọc (Read-only) ---
	GetUserWallet(ctx context.Context, userID string) (*UserWallet, error)
	GetPurchasableItems(ctx context.Context) ([]Item, error)
	GetInventoryForSale(ctx context.Context, userID string) ([]SellableInventoryRow, error)
	GetItemByID(ctx context.Context, itemID string) (*Item, error)

	// --- Các hàm Ghi (Write) yêu cầu Transaction ---
	GetWalletForUpdate(ctx context.Context, tx pgx.Tx, userID string) (*UserWallet, error)
	UpdateWalletBalance(ctx context.Context, tx pgx.Tx, userID string, silverChange int, goldChange int) error
	RecordTransaction(ctx context.Context, tx pgx.Tx, txn EconomyTransaction) error
	AddInventoryItems(ctx context.Context, tx pgx.Tx, userID, itemID string, quantity int) ([]string, error)
	GetInventoryItemsForUpdate(ctx context.Context, tx pgx.Tx, userID string, inventoryIDs []string) ([]LockedInventoryItem, error)
	DeleteInventoryItems(ctx context.Context, tx pgx.Tx, inventoryIDs []string) error
}

type Service struct {
	db       *pgxpool.Pool
	repo     RepositoryInterface
	currency *CurrencyService // Gọi sang Lõi Ví Tiền để thanh toán và ghi log
	log      *logger.Logger
}

// Cập nhật lại constructor để nhận thêm db pool và currency service
func NewService(db *pgxpool.Pool, repo RepositoryInterface, currency *CurrencyService, log *logger.Logger) *Service {
	return &Service{
		db:       db,
		repo:     repo,
		currency: currency,
		log:      log,
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
			Height:      item.Height,
			Width:       item.Width,
			SilverPrice: *item.SilverPrice,
		})
	}

	return result, nil
}

// ==========================================
// 3. GET INVENTORY FOR SALE (Đồ trong kho để bán lại cho Shop)
// ==========================================

func (s *Service) GetSellableItems(ctx context.Context, userID string) ([]SellableItemResponse, error) {
	inventoryRows, err := s.repo.GetInventoryForSale(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("GetSellableItems: %w", err)
	}

	// Tránh trả về null cho FE nếu kho đồ trống
	if inventoryRows == nil {
		return []SellableItemResponse{}, nil
	}

	result := make([]SellableItemResponse, 0, len(inventoryRows))
	for _, row := range inventoryRows {

		// Gọi Helper function để tính giá mua lại
		buybackSilver, buybackGold := calculateBuybackPrice(row.OriginalPrice, row.Rarity)

		result = append(result, SellableItemResponse{
			ItemID:        row.ItemID,
			Name:          row.Name,
			Type:          row.Type,
			Rarity:        row.Rarity,
			AssetKey:      row.AssetKey,
			Height:        row.Height,
			Width:         row.Width,
			Quantity:      row.Quantity,
			InstanceIDs:   row.InstanceIDs,
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

// ==========================================
// 4. BUY ITEM PROCESS (User mua đồ)
// ==========================================

func (s *Service) BuyItems(ctx context.Context, userID string, req BuyRequest) (*BuyResponse, error) {
	// 1. Validate Item
	item, err := s.repo.GetItemByID(ctx, req.ItemID)
	if err != nil {
		return nil, err
	}
	if !item.IsPurchasable || item.SilverPrice == nil {
		return nil, &apperr.ValidationError{Message: "Item is not purchasable"}
	}

	totalCost := *item.SilverPrice * req.Quantity

	// 2. Mở TX
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("BuyItem begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	// 3. Thanh toán tiền (Gọi qua CurrencyService)
	// Truyền -totalCost vì là trừ tiền
	desc := fmt.Sprintf("Bought %d x %s", req.Quantity, item.Name)
	wallet, err := s.currency.ChangeBalance(ctx, tx, userID, -totalCost, 0, ActionShopBuy, desc)
	if err != nil {
		return nil, err // Lỗi "not enough silver" sẽ được ném ra từ đây
	}

	// 4. Giao hàng (Thêm đồ vào kho)
	newInventoryIDs, err := s.repo.AddInventoryItems(ctx, tx, userID, req.ItemID, req.Quantity)
	if err != nil {
		return nil, err
	}

	// 5. Commit thành công
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("BuyItem commit: %w", err)
	}

	return &BuyResponse{
		TotalCost:    totalCost,
		NewSilver:    wallet.SilverBalance,
		InventoryIDs: newInventoryIDs,
	}, nil
}

// ==========================================
// 5. SELL ITEMS PROCESS (User bán đồ)
// ==========================================

func (s *Service) SellItems(ctx context.Context, userID string, req SellBatchRequest) (*SellBatchResponse, error) {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("SellItems begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	// 1. Lock đồ trong kho (Chống spam)
	sort.Strings(req.InventoryIDs)
	lockedItems, err := s.repo.GetInventoryItemsForUpdate(ctx, tx, userID, req.InventoryIDs)
	if err != nil {
		return nil, err
	}
	if len(lockedItems) != len(req.InventoryIDs) {
		return nil, &apperr.ValidationError{Message: "Some items are invalid, already sold, or placed in garden"}
	}

	// 2. Tính tiền hoàn trả dựa trên lựa chọn Vàng hay Bạc
	var totalSilverEarned, totalGoldEarned int
	for _, item := range lockedItems {
		silver, gold := calculateBuybackPrice(item.SilverPrice, item.Rarity)

		if req.ReceiveCurrency == "gold" {
			if gold <= 0 {
				return nil, &apperr.ValidationError{Message: fmt.Sprintf("Item with rarity '%s' cannot be sold for gold", item.Rarity)}
			}
			totalGoldEarned += gold
		} else {
			if silver <= 0 {
				return nil, &apperr.ValidationError{Message: "Item cannot be sold for silver"}
			}
			totalSilverEarned += silver
		}
	}

	// 3. Thu hồi đồ (Xóa khỏi túi)
	if err := s.repo.DeleteInventoryItems(ctx, tx, req.InventoryIDs); err != nil {
		return nil, err
	}

	// 4. Trả tiền cho User (Gọi qua CurrencyService)
	desc := fmt.Sprintf("Sold %d items for %s", len(req.InventoryIDs), req.ReceiveCurrency)
	wallet, err := s.currency.ChangeBalance(ctx, tx, userID, totalSilverEarned, totalGoldEarned, ActionShopSell, desc)
	if err != nil {
		return nil, err
	}

	// 5. Commit
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("SellItems commit: %w", err)
	}

	return &SellBatchResponse{
		SuccessfulInventoryIDs: req.InventoryIDs,
		TotalSilverEarned:      totalSilverEarned,
		TotalGoldEarned:        totalGoldEarned,
		NewSilver:              wallet.SilverBalance,
		NewGold:                wallet.GoldBalance,
	}, nil
}
