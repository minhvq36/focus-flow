package task

// Quota checks daily task quota
type Quota struct {
	dailyLimit int
}

// NewQuota creates a new quota instance
func NewQuota(dailyLimit int) *Quota {
	return &Quota{dailyLimit: dailyLimit}
}

// CheckQuota checks if user has reached daily quota
func (q *Quota) CheckQuota(userID string, tasksCompleted int) bool {
	return tasksCompleted < q.dailyLimit
}
