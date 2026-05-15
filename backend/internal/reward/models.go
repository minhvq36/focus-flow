package reward

// Rarity represents the rarity of an item.
type Rarity string

const (
	RarityCommon    Rarity = "common"
	RarityUncommon  Rarity = "uncommon"
	RarityRare      Rarity = "rare"
	RarityEpic      Rarity = "epic"
	RarityLegendary Rarity = "legendary"
	RarityEternal   Rarity = "eternal"
)

var rarityFallback = map[Rarity]Rarity{
	RarityEternal:   RarityLegendary,
	RarityLegendary: RarityEpic,
	RarityEpic:      RarityRare,
	RarityRare:      RarityUncommon,
	RarityUncommon:  RarityCommon,
	RarityCommon:    "",
}

type rarityWeight struct {
	rarity Rarity
	weight uint32 // basis points: 10000 = 100%
}

// RollResult is the result of a reward roll.
type RollResult struct {
	Silver       int
	Exp          int
	RolledRarity Rarity // rarity đã roll (trước fallback)
	ItemRarity   Rarity // rarity thực tế query DB (sau fallback)
	Seed         string // set bởi caller: task_id + user_id + timestamp
}

// PenaltyResult is the result of a penalty roll.
type PenaltyResult struct {
	InventoryID string
	ItemID      string
	ItemRarity  Rarity
}
