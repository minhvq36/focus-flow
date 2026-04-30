package logger

import (
	"fmt"
	"log"
	"os"
	"strings"
	"time"
)

// Logger provides structured logging capabilities
type Logger struct {
	prefix string
}

// NewLogger creates a new logger with given prefix
func NewLogger(prefix string) *Logger {
	return &Logger{prefix: prefix}
}

// Info logs info level message
func (l *Logger) Info(msg string, keyvals ...interface{}) {
	l.log("INFO", msg, keyvals...)
}

// Debug logs debug level message
func (l *Logger) Debug(msg string, keyvals ...interface{}) {
	l.log("DEBUG", msg, keyvals...)
}

// Error logs error level message
func (l *Logger) Error(msg string, keyvals ...interface{}) {
	l.log("ERROR", msg, keyvals...)
}

// Warn logs warning level message
func (l *Logger) Warn(msg string, keyvals ...interface{}) {
	l.log("WARN", msg, keyvals...)
}

// log is the internal logging function
func (l *Logger) log(level, msg string, keyvals ...interface{}) {
	timestamp := time.Now().Format("2006-01-02 15:04:05")
	prefix := l.prefix
	if prefix != "" {
		prefix = "[" + prefix + "]"
	}

	// Build the key-value string
	kvStr := ""
	if len(keyvals) > 0 {
		pairs := []string{}
		for i := 0; i < len(keyvals); i += 2 {
			if i+1 < len(keyvals) {
				pairs = append(pairs, fmt.Sprintf("%v=%v", keyvals[i], keyvals[i+1]))
			}
		}
		if len(pairs) > 0 {
			kvStr = " " + strings.Join(pairs, " ")
		}
	}

	logMsg := fmt.Sprintf("%s [%s] %s %s%s", timestamp, level, prefix, msg, kvStr)
	log.Println(logMsg)

	// Also write to file if in production
	if os.Getenv("ENV") == "production" {
		f, err := os.OpenFile("logs/server.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
		if err == nil {
			defer f.Close()
			fmt.Fprintln(f, logMsg)
		}
	}
}
