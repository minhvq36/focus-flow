package reward

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/binary"
	"fmt"
	"time"
)

// ── Tier table ───────────────────────────────────────────────────────────────

var tierTable = [][]rarityWeight{
	// Tier 1: level 1–4
	{
		{RarityCommon, 6999},
		{RarityUncommon, 2000},
		{RarityRare, 700},
		{RarityEpic, 250},
		{RarityLegendary, 50},
		{RarityEternal, 1},
	},
	// Tier 2: level 5–9
	{
		{RarityCommon, 5799},
		{RarityUncommon, 2200},
		{RarityRare, 1200},
		{RarityEpic, 750},
		{RarityLegendary, 50},
		{RarityEternal, 1},
	},
	// Tier 3: level 10–14
	{
		{RarityCommon, 4399},
		{RarityUncommon, 2200},
		{RarityRare, 1800},
		{RarityEpic, 1550},
		{RarityLegendary, 50},
		{RarityEternal, 1},
	},
	// Tier 4: level 15–19
	{
		{RarityCommon, 2799},
		{RarityUncommon, 2200},
		{RarityRare, 2200},
		{RarityEpic, 2750},
		{RarityLegendary, 50},
		{RarityEternal, 1},
	},
	// Tier 5: level 20+
	{
		{RarityCommon, 1649},
		{RarityUncommon, 2000},
		{RarityRare, 2500},
		{RarityEpic, 3800},
		{RarityLegendary, 50},
		{RarityEternal, 1},
	},
}

func tierFromLevel(level int) []rarityWeight {
	switch {
	case level < 5:
		return tierTable[0]
	case level < 10:
		return tierTable[1]
	case level < 15:
		return tierTable[2]
	case level < 20:
		return tierTable[3]
	default:
		return tierTable[4]
	}
}

// ── EXP ──────────────────────────────────────────────────────────────────────

func ExpPerTask(level int) int {
	switch {
	case level == 1:
		return 10 // 1 task lên level 2
	case level < 4:
		return 20 // 2→3: 2 tasks, 3→4: 5 tasks
	case level < 8:
		return 35 // 4→5: ~5 tasks, smooth hơn
	case level < 12:
		return 55
	case level < 17:
		return 75
	default:
		return 85 + (level-17)*5
	}
}

// To calculate level from total EXP
func LevelFromExp(totalExp int) int {
	level := 1
	cumulative := 0
	for {
		needed := 10 * level * level
		if cumulative+needed > totalExp {
			return level
		}
		cumulative += needed
		level++
	}
}

// ── Silver ───────────────────────────────────────────────────────────────────

func silverRange(level int) (min, max int) {
	switch {
	case level < 5:
		return 60, 120
	case level < 10:
		return 150, 250
	case level < 15:
		return 280, 420
	case level < 20:
		return 450, 650
	default:
		return 700, 1200
	}
}

// ── Public API ───────────────────────────────────────────────────────────────
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

// RollRarity rolls a rarity based on tier table, mixed with user seed.
func RollRarity(level int, taskID, userID string) (Rarity, error) {
	tier := tierFromLevel(level)
	seed := []byte(fmt.Sprintf("%s:%s:%d", taskID, userID, time.Now().UnixNano()))
	n, err := cryptoRandNWithSeed(10000, seed)
	if err != nil {
		return "", err
	}
	cumulative := 0
	for _, w := range tier {
		cumulative += int(w.weight)
		if n < cumulative {
			return w.rarity, nil
		}
	}
	return RarityCommon, nil
}

// RollSilver rolls a silver amount for the given level.
func RollSilver(level int) (int, error) {
	min, max := silverRange(level)
	n, err := cryptoRandN(max - min + 1)
	if err != nil {
		return 0, err
	}
	return min + n, nil
}

// FallbackRarity returns the next lower rarity if DB has no item at current rarity.
// Returns "" if no fallback available.
func FallbackRarity(r Rarity) Rarity {
	return rarityFallback[r]
}
