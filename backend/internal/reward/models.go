package reward

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/binary"
)

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
	RolledRarity Rarity // trước fallback — để log/debug
	ItemRarity   Rarity // sau fallback — rarity thực tế
	ItemID       string // id item trong DB, "" nếu không có
	Silver       int
	Exp          int
	Seed         string
}

// PenaltyResult is the result of a penalty roll.
type PenaltyResult struct {
	InventoryID string
	ItemID      string
	ItemRarity  Rarity
}

// TODO: increase performance in hmac and gc
// cryptoRandN returns a random int in [0, n) using crypto/rand, bias-free.
func cryptoRandN(n int) (int, error) {
	limit := ^uint64(0) - (^uint64(0) % uint64(n))
	for {
		b := make([]byte, 8)
		_, err := rand.Read(b)
		if err != nil {
			return 0, err
		}
		v := binary.BigEndian.Uint64(b)
		if v < limit {
			return int(v % uint64(n)), nil
		}
	}
}

// cryptoRandNWithSeed returns a random int in [0, n) mixed with user seed, bias-free.
func cryptoRandNWithSeed(n int, seed []byte) (int, error) {
	limit := ^uint64(0) - (^uint64(0) % uint64(n))
	for {
		b := make([]byte, 8)
		_, err := rand.Read(b)
		if err != nil {
			return 0, err
		}
		mac := hmac.New(sha256.New, seed)
		mac.Write(b)
		sum := mac.Sum(nil)
		v := binary.BigEndian.Uint64(sum[:8])
		if v < limit {
			return int(v % uint64(n)), nil
		}
	}
}
