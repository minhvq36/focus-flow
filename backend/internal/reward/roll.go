package reward

// Roll determines reward from seeded RNG
type Roll struct {
	seed int64
}

// NewRoll creates a new roll instance
func NewRoll(seed int64) *Roll {
	return &Roll{seed: seed}
}

// Execute performs reward roll with drop rates
func (r *Roll) Execute() string {
	// Seeded RNG, drop rates logic
	return "reward"
}
