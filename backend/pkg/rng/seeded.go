package rng

import (
	"math/rand"
)

// SeededRNG provides deterministic seeded random number generation
type SeededRNG struct {
	source rand.Source
}

// NewSeededRNG creates a new seeded RNG
func NewSeededRNG(seed int64) *SeededRNG {
	return &SeededRNG{source: rand.NewSource(seed)}
}

// Intn returns a random integer in range [0, n)
func (sr *SeededRNG) Intn(n int) int {
	r := rand.New(sr.source)
	return r.Intn(n)
}
