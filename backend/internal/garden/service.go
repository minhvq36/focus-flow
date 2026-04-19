package garden

// Service contains business logic for garden
type Service struct {
	repo *Repository
}

// NewService creates a new garden service
func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

// PlaceItem handles item placement and level unlocks
func (s *Service) PlaceItem(userID string, itemID string, x int, y int) error {
	// Placement logic
	return nil
}

// GetGardenLevel gets current garden level
func (s *Service) GetGardenLevel(userID string) (int, error) {
	// Get level logic
	return 1, nil
}
