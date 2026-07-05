package garden

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/minhvq36/focus-flow/backend/pkg/apperr"
	"github.com/minhvq36/focus-flow/backend/pkg/logger"
)

type RepositoryInterface interface {
	GetUserGardenList(ctx context.Context, userID string) ([]gardenRow, error)
	GetUserGardenByID(ctx context.Context, userGardenID, userID string) (*gardenRow, error)
	GetPlacementsByUserGardenID(ctx context.Context, userGardenID string) ([]Placement, error)
	LockUserGarden(ctx context.Context, tx pgx.Tx, userGardenID, userID string) (baseSize, expansionLevel int, err error)
	GetInventoryItemsMap(ctx context.Context, inventoryIDs []string, userID string) (map[string]InventoryItemDetails, error)
	GetPlacementsBoundingBoxesTx(ctx context.Context, tx pgx.Tx, userGardenID string) ([]BoundingBox, error)
	CreatePlacementsAndUpdateInventory(ctx context.Context, tx pgx.Tx, params []CreatePlacementParams, userID string) ([]Placement, error)
	RemovePlacementsAndUpdateInventory(ctx context.Context, tx pgx.Tx, userGardenID string, inventoryIDs []string, userID string) ([]string, error)
}

type Service struct {
	db   *pgxpool.Pool
	repo RepositoryInterface
	log  *logger.Logger
}

func NewService(db *pgxpool.Pool, repo RepositoryInterface, log *logger.Logger) *Service {
	return &Service{db: db, repo: repo, log: log}
}
func (s *Service) GetUserGardenList(ctx context.Context, userID string) ([]GardenListItem, error) {
	gardens, err := s.repo.GetUserGardenList(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("GetUserGardenList: %w", err)
	}

	result := make([]GardenListItem, 0, len(gardens))
	for _, g := range gardens {
		result = append(result, GardenListItem{
			ID:             g.ID,
			GardenID:       g.GardenID,
			GardenIndex:    g.GardenIndex,
			ExpansionLevel: g.ExpansionLevel,
			IsExpandable:   g.IsExpandable,
			CanExpand:      g.IsExpandable && g.ExpansionLevel < maxExpansionLevel,
		})
	}
	return result, nil
}

// For garden view
func (s *Service) GetUserGardenByID(ctx context.Context, userGardenID, userID string) (*GardenResponse, error) {
	garden, err := s.repo.GetUserGardenByID(ctx, userGardenID, userID)
	if err != nil {
		return nil, err // apperr.NotFoundError đã wrap trong repo
	}

	placements, err := s.repo.GetPlacementsByUserGardenID(ctx, userGardenID)
	if err != nil {
		return nil, fmt.Errorf("GetUserGardenByID placements: %w", err)
	}

	placementResponses := make([]PlacementResponse, 0, len(placements))
	for _, p := range placements {
		placementResponses = append(placementResponses, PlacementResponse{
			ID:           p.ID,
			InventoryID:  p.InventoryID,
			ItemID:       p.ItemID,
			AssetKey:     p.AssetKey,
			GridX:        p.GridX,
			GridY:        p.GridY,
			ItemWidth:    p.ItemWidth,
			ItemHeight:   p.ItemHeight,
			Rotation:     p.Rotation,
			HealthStatus: p.HealthStatus,
			WiltedAt:     p.WiltedAt,
			PlacedAt:     p.PlacedAt,
		})
	}

	return &GardenResponse{
		ID:             garden.ID,
		GardenID:       garden.GardenID,
		GardenIndex:    garden.GardenIndex,
		ExpansionLevel: garden.ExpansionLevel,
		BaseSize:       garden.GridSize,
		CurrentSize:    computeCurrentSize(garden.GridSize, garden.ExpansionLevel),
		IsExpandable:   garden.IsExpandable,
		CanExpand:      garden.IsExpandable && garden.ExpansionLevel < maxExpansionLevel,
		LastWateredAt:  garden.LastWateredAt,
		AutoWaterUntil: garden.AutoWaterUntil,
		Placements:     placementResponses,
	}, nil
}

func (s *Service) PlaceItemsBatch(ctx context.Context, userID string, req MultiPlaceRequest) (*MultiPlaceResponse, error) {
	// Khởi tạo response ban đầu
	response := &MultiPlaceResponse{
		Results: make([]BatchPlacementItemResult, 0, len(req.Items)),
	}

	// 1. Lọc danh sách InventoryID để query DB 1 lần
	inventoryIDs := make([]string, 0, len(req.Items))
	for _, item := range req.Items {
		inventoryIDs = append(inventoryIDs, item.InventoryID)
	}

	// 2. Bắt đầu Transaction
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("PlaceItemsBatch begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	// 3. Lock Garden & Lấy GridSize
	baseSize, expansionLevel, err := s.repo.LockUserGarden(ctx, tx, req.UserGardenID, userID)
	if err != nil {
		return nil, err // apperr.NotFoundError đã được wrap trong repo
	}
	currentGridSize := computeCurrentSize(baseSize, expansionLevel)

	// 4. Fetch State vào RAM (Map Kho đồ và BoundingBox đang có trên Map)
	invMap, err := s.repo.GetInventoryItemsMap(ctx, inventoryIDs, userID)
	if err != nil {
		return nil, err
	}

	existingBoxes, err := s.repo.GetPlacementsBoundingBoxesTx(ctx, tx, req.UserGardenID)
	if err != nil {
		return nil, err
	}

	// 5. THUẬT TOÁN IN-MEMORY XỬ LÝ TỪNG ITEM (O(k))
	var createParams []CreatePlacementParams
	var successfulInvIDs []string
	var successReqItems []PlaceItemReq // Lưu lại req để lát nữa build Response

	currentStateBoxes := existingBoxes
	usedInvIDsInBatch := make(map[string]bool) // Chống client gửi 2 lần cùng 1 item trong mảng req

	for _, reqItem := range req.Items {
		// 5.1: Check trùng item_id ngay trong request
		if usedInvIDsInBatch[reqItem.InventoryID] {
			response.Results = append(response.Results, BatchPlacementItemResult{
				InventoryID: reqItem.InventoryID,
				Success:     false,
				ErrorReason: "duplicate inventory_id in request",
			})
			continue
		}

		// 5.2: Check kho đồ (có sở hữu không, đã đặt chưa)
		invInfo, exists := invMap[reqItem.InventoryID]
		if !exists {
			response.Results = append(response.Results, BatchPlacementItemResult{
				InventoryID: reqItem.InventoryID,
				Success:     false,
				ErrorReason: "item not found in inventory or already placed",
			})
			continue
		}

		// 5.3: Tính kích thước sau khi xoay và tạo BoundingBox
		effW, effH := GetEffectiveDimensions(invInfo.Width, invInfo.Height, reqItem.Rotation)
		newBox := BoundingBox{
			ID: reqItem.InventoryID,
			X:  reqItem.GridX,
			Y:  reqItem.GridY,
			W:  effW,
			H:  effH,
		}

		// 5.4: Kiểm tra có lọt ra ngoài bản đồ không (Bounds check)
		if !newBox.IsWithinBounds(currentGridSize) {
			response.Results = append(response.Results, BatchPlacementItemResult{
				InventoryID: reqItem.InventoryID,
				Success:     false,
				ErrorReason: "placement out of bounds",
			})
			continue
		}

		// 5.5: Kiểm tra có đè lên đồ khác không (Overlap check)
		isOverlapping := false
		for _, stateBox := range currentStateBoxes {
			if newBox.Overlaps(stateBox) {
				isOverlapping = true
				break
			}
		}

		if isOverlapping {
			response.Results = append(response.Results, BatchPlacementItemResult{
				InventoryID: reqItem.InventoryID,
				Success:     false,
				ErrorReason: "placement overlaps with an existing item",
			})
			continue
		}

		// --- ĐẾN ĐÂY LÀ ITEM HỢP LỆ ---
		usedInvIDsInBatch[reqItem.InventoryID] = true
		successfulInvIDs = append(successfulInvIDs, reqItem.InventoryID)
		successReqItems = append(successReqItems, reqItem)
		createParams = append(createParams, CreatePlacementParams{
			UserGardenID:    req.UserGardenID,
			InventoryID:     reqItem.InventoryID,
			GridX:           reqItem.GridX,
			GridY:           reqItem.GridY,
			EffectiveWidth:  effW,
			EffectiveHeight: effH,
			Rotation:        reqItem.Rotation,
		})

		// QUAN TRỌNG NHẤT: Thêm item vừa thành công vào currentStateBoxes
		// Để các item tiếp theo trong cùng Request sẽ va chạm với chính nó!
		currentStateBoxes = append(currentStateBoxes, newBox)
	}

	// 6. GHI DB HÀNG LOẠT (Chỉ chạy nếu có ít nhất 1 item thành công)
	if len(createParams) > 0 {
		placements, err := s.repo.CreatePlacementsAndUpdateInventory(ctx, tx, createParams, userID)
		if err != nil {
			return nil, err // Lỗi (bao gồm cả lỗi duplicate 23505) sẽ văng ra tại đây và kích hoạt Rollback
		}

		// Ráp dữ liệu trả về cho Frontend
		for i, p := range placements {
			reqItem := successReqItems[i]
			invInfo := invMap[reqItem.InventoryID]

			response.Results = append(response.Results, BatchPlacementItemResult{
				InventoryID: reqItem.InventoryID,
				Success:     true,
				Placement: &PlacementResponse{
					ID:              p.ID,
					InventoryID:     p.InventoryID,
					ItemID:          invInfo.ItemID,
					AssetKey:        invInfo.AssetKey,
					GridX:           p.GridX,
					GridY:           p.GridY,
					ItemWidth:       invInfo.Width,
					ItemHeight:      invInfo.Height,
					EffectiveWidth:  p.EffectiveWidth,
					EffectiveHeight: p.EffectiveHeight,
					Rotation:        p.Rotation,
					HealthStatus:    p.HealthStatus,
					WiltedAt:        p.WiltedAt,
					PlacedAt:        p.PlacedAt,
				},
			})
		}
	}

	// 7. Commit Transaction
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("PlaceItemsBatch commit tx: %w", err)
	}

	return response, nil
}

func (s *Service) PlaceItem(ctx context.Context, userID string, req PlaceRequest) (*PlacementResponse, error) {
	// 1. Build Multi request từ Single request
	batchReq := MultiPlaceRequest{
		UserGardenID: req.UserGardenID,
		Items: []PlaceItemReq{
			{
				InventoryID: req.InventoryID,
				GridX:       req.GridX,
				GridY:       req.GridY,
				Rotation:    req.Rotation,
			},
		},
	}

	// 2. Gọi hàm Batch
	batchRes, err := s.PlaceItemsBatch(ctx, userID, batchReq)
	if err != nil {
		return nil, err
	}

	// 3. Vì chỉ gửi lên 1 phần tử, nên kết quả trả về chắc chắn nằm ở index 0
	if len(batchRes.Results) == 0 {
		return nil, fmt.Errorf("unexpected error: no results returned from batch placement")
	}

	res := batchRes.Results[0]

	// Nếu placement đó báo false (Overlap, Out of bounds, Not found,...)
	if !res.Success {
		return nil, &apperr.ValidationError{Message: res.ErrorReason}
	}

	return res.Placement, nil
}

// Xóa/Thu hồi nhiều Items vào kho (Dùng cho cả Single Click và Quét Vùng)
func (s *Service) RemoveItemsBatch(ctx context.Context, userID string, req MultiRemoveRequest) (*MultiRemoveResponse, error) {
	// 1. Sanitize Input: Lọc bỏ các ID trùng lặp (Phòng trường hợp FE quét vùng bị overlap dẫn đến gửi 2 ID giống nhau)
	capacity := len(req.InventoryIDs)
	uniqueIDsMap := make(map[string]bool, capacity)
	cleanInventoryIDs := make([]string, 0, capacity)
	for _, id := range req.InventoryIDs {
		if !uniqueIDsMap[id] {
			uniqueIDsMap[id] = true
			cleanInventoryIDs = append(cleanInventoryIDs, id)
		}
	}

	if len(cleanInventoryIDs) == 0 {
		return &MultiRemoveResponse{SuccessfulInventoryIDs: []string{}}, nil
	}

	// 2. Bắt đầu Transaction
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("RemoveItemsBatch begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	// 3. Lock Garden (Ngăn Race condition với Placement/Move)
	// Dùng '_' bỏ qua baseSize và expansionLevel vì ta không cần check out-of-bounds khi xóa
	_, _, err = s.repo.LockUserGarden(ctx, tx, req.UserGardenID, userID)
	if err != nil {
		return nil, err // apperr.NotFoundError đã được wrap trong repo
	}

	// 4. Gọi DB thực thi Xóa và Cập nhật 1 phát ăn luôn (CTE)
	successfulIDs, err := s.repo.RemovePlacementsAndUpdateInventory(ctx, tx, req.UserGardenID, cleanInventoryIDs, userID)
	if err != nil {
		return nil, err
	}

	// 5. Commit Transaction
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("RemoveItemsBatch commit tx: %w", err)
	}

	// 6. Trả về cho FE danh sách những ID thực sự được gỡ, để FE update UI
	// Nếu FE gửi 5 cái, nhưng DB chỉ xóa được 3 cái, thì mảng này có length = 3
	if successfulIDs == nil {
		successfulIDs = []string{} // Tránh trả về null trong JSON
	}

	return &MultiRemoveResponse{
		SuccessfulInventoryIDs: successfulIDs,
	}, nil
}
