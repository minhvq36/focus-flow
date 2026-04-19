package reward

// Pity manages pity counter logic
type Pity struct {
	count int
}

// NewPity creates a new pity instance
func NewPity() *Pity {
	return &Pity{count: 0}
}

// Increment increments pity counter
func (p *Pity) Increment() {
	p.count++
}

// ShouldTrigger checks if pity should trigger
func (p *Pity) ShouldTrigger() bool {
	return p.count >= 90
}

// Reset resets pity counter
func (p *Pity) Reset() {
	p.count = 0
}
