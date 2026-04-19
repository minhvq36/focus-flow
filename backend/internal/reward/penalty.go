package reward

// Penalty handles give up and inactive penalties
type Penalty struct {
	amount int
}

// NewPenalty creates a new penalty instance
func NewPenalty(amount int) *Penalty {
	return &Penalty{amount: amount}
}

// ApplyGiveUpPenalty applies penalty for giving up
func (p *Penalty) ApplyGiveUpPenalty() int {
	return p.amount
}

// ApplyInactivePenalty applies penalty for inactivity
func (p *Penalty) ApplyInactivePenalty(daysSinceActive int) int {
	return p.amount * daysSinceActive
}
