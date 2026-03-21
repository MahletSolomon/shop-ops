package infrastructure

import (
	"fmt"
	"time"

	"github.com/gin-gonic/gin"
)

// ANSI color codes for status
const (
	statusGreen  = "\033[97;42m" // white on green
	statusYellow = "\033[90;43m" // dark on yellow
	statusRed    = "\033[97;41m" // white on red
	statusCyan   = "\033[97;46m" // white on cyan
	methodColor  = "\033[97;44m" // white on blue
	resetColor   = "\033[0m"
)

// statusColor returns appropriate color for status code
func statusColor(code int) string {
	switch {
	case code >= 200 && code < 300:
		return statusGreen
	case code >= 300 && code < 400:
		return statusCyan
	case code >= 400 && code < 500:
		return statusYellow
	default:
		return statusRed
	}
}

// RequestLogger returns a Gin middleware that logs every HTTP request
// with method, path, status code, latency, and client IP.
func RequestLogger(logger *Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		if c.Request.URL.RawQuery != "" {
			path = path + "?" + c.Request.URL.RawQuery
		}

		// Process the request
		c.Next()

		latency := time.Since(start)
		status := c.Writer.Status()
		clientIP := c.ClientIP()
		method := c.Request.Method

		sColor := statusColor(status)

		msg := fmt.Sprintf("%s %3d %s | %13v | %15s | %s%-7s%s %s",
			sColor, status, resetColor,
			latency,
			clientIP,
			methodColor, method, resetColor,
			path,
		)

		// Choose log level based on status code
		switch {
		case status >= 500:
			logger.Error("HTTP", msg)
		case status >= 400:
			logger.Warn("HTTP", msg)
		default:
			logger.Info("HTTP", msg)
		}
	}
}
