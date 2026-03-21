package infrastructure

import (
	"fmt"
	"io"
	"log"
	"os"
	"strings"
)

// Log levels
const (
	LevelDebug = iota
	LevelInfo
	LevelWarn
	LevelError
	LevelFatal
)

// ANSI color codes
const (
	colorReset  = "\033[0m"
	colorGray   = "\033[90m"
	colorGreen  = "\033[32m"
	colorYellow = "\033[33m"
	colorRed    = "\033[31m"
	colorPurple = "\033[35m"
)

// Logger provides structured, leveled logging.
type Logger struct {
	level  int
	debug  *log.Logger
	info   *log.Logger
	warn   *log.Logger
	errLog *log.Logger
	fatal  *log.Logger
}

// NewLogger creates a Logger that writes to stdout and optionally to a file.
// level: "debug", "info", "warn", "error" (case-insensitive, default: info)
// filePath: if non-empty, logs are also written to this file
func NewLogger(level string, filePath string) *Logger {
	var writer io.Writer = os.Stdout

	if filePath != "" {
		file, err := os.OpenFile(filePath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
		if err != nil {
			log.Printf("Failed to open log file %s, falling back to stdout: %v", filePath, err)
		} else {
			writer = io.MultiWriter(os.Stdout, file)
		}
	}

	flags := log.Ldate | log.Ltime

	return &Logger{
		level:  parseLevel(level),
		debug:  log.New(writer, "", flags),
		info:   log.New(writer, "", flags),
		warn:   log.New(writer, "", flags),
		errLog: log.New(writer, "", flags),
		fatal:  log.New(writer, "", flags),
	}
}

// Debug logs a message at DEBUG level.
func (l *Logger) Debug(tag string, format string, args ...interface{}) {
	if l.level <= LevelDebug {
		l.debug.Printf("%s[DEBUG]%s [%s] %s", colorGray, colorReset, tag, fmt.Sprintf(format, args...))
	}
}

// Info logs a message at INFO level.
func (l *Logger) Info(tag string, format string, args ...interface{}) {
	if l.level <= LevelInfo {
		l.info.Printf("%s[INFO]%s  [%s] %s", colorGreen, colorReset, tag, fmt.Sprintf(format, args...))
	}
}

// Warn logs a message at WARN level.
func (l *Logger) Warn(tag string, format string, args ...interface{}) {
	if l.level <= LevelWarn {
		l.warn.Printf("%s[WARN]%s  [%s] %s", colorYellow, colorReset, tag, fmt.Sprintf(format, args...))
	}
}

// Error logs a message at ERROR level.
func (l *Logger) Error(tag string, format string, args ...interface{}) {
	if l.level <= LevelError {
		l.errLog.Printf("%s[ERROR]%s [%s] %s", colorRed, colorReset, tag, fmt.Sprintf(format, args...))
	}
}

// Fatal logs a message at FATAL level and exits the process.
func (l *Logger) Fatal(tag string, format string, args ...interface{}) {
	l.fatal.Fatalf("%s[FATAL]%s [%s] %s", colorPurple, colorReset, tag, fmt.Sprintf(format, args...))
}

// parseLevel converts a string level name to its integer constant.
func parseLevel(level string) int {
	switch strings.ToLower(strings.TrimSpace(level)) {
	case "debug":
		return LevelDebug
	case "info", "":
		return LevelInfo
	case "warn", "warning":
		return LevelWarn
	case "error":
		return LevelError
	default:
		return LevelInfo
	}
}
