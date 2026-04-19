package metrics

import (
	"github.com/prometheus/client_golang/prometheus"
)

// Metrics holds Prometheus metric definitions
type Metrics struct {
	TasksCreated    prometheus.Counter
	TasksCompleted  prometheus.Counter
	SessionsStarted prometheus.Counter
}

// NewMetrics creates new metrics
func NewMetrics() *Metrics {
	return &Metrics{
		TasksCreated: prometheus.NewCounter(prometheus.CounterOpts{
			Name: "tasks_created_total",
			Help: "Total tasks created",
		}),
		TasksCompleted: prometheus.NewCounter(prometheus.CounterOpts{
			Name: "tasks_completed_total",
			Help: "Total tasks completed",
		}),
		SessionsStarted: prometheus.NewCounter(prometheus.CounterOpts{
			Name: "sessions_started_total",
			Help: "Total sessions started",
		}),
	}
}
