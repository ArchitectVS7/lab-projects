// Package task defines the Task model and related types.
package task

import (
	"fmt"
	"time"
)

// Status represents the current state of a task.
type Status string

const (
	StatusPending    Status = "pending"
	StatusInProgress Status = "in_progress"
	StatusCompleted  Status = "completed"
)

// Priority levels (1 = highest, 5 = lowest)
const (
	PriorityHighest = 1
	PriorityHigh    = 2
	PriorityMedium  = 3
	PriorityLow     = 4
	PriorityLowest  = 5
)

// Task represents a single task item.
type Task struct {
	ID          int       `json:"id"`
	Title       string    `json:"title"`
	Description string    `json:"description,omitempty"`
	Priority    int       `json:"priority"`
	DueDate     time.Time `json:"due_date,omitempty"`
	Status      Status    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
	CompletedAt time.Time `json:"completed_at,omitempty"`
}

// NewTask creates a new task with the given title.
func NewTask(id int, title string) *Task {
	return &Task{
		ID:        id,
		Title:     title,
		Priority:  PriorityMedium,
		Status:    StatusPending,
		CreatedAt: time.Now(),
	}
}

// Complete marks the task as completed.
func (t *Task) Complete() {
	t.Status = StatusCompleted
	t.CompletedAt = time.Now()
}

// IsOverdue returns true if the task is past its due date.
func (t *Task) IsOverdue() bool {
	if t.DueDate.IsZero() || t.Status == StatusCompleted {
		return false
	}
	return time.Now().After(t.DueDate)
}

// PriorityString returns a human-readable priority.
func (t *Task) PriorityString() string {
	switch t.Priority {
	case 1:
		return "🔴 Highest"
	case 2:
		return "🟠 High"
	case 3:
		return "🟡 Medium"
	case 4:
		return "🟢 Low"
	case 5:
		return "⚪ Lowest"
	default:
		return "Unknown"
	}
}

// StatusString returns a human-readable status.
func (t *Task) StatusString() string {
	switch t.Status {
	case StatusPending:
		return "⏳ Pending"
	case StatusInProgress:
		return "🔄 In Progress"
	case StatusCompleted:
		return "✅ Completed"
	default:
		return string(t.Status)
	}
}

// DueDateString returns formatted due date or empty string.
func (t *Task) DueDateString() string {
	if t.DueDate.IsZero() {
		return "-"
	}
	if t.IsOverdue() {
		return fmt.Sprintf("⚠️  %s (overdue)", t.DueDate.Format("2006-01-02"))
	}
	return t.DueDate.Format("2006-01-02")
}

// ValidatePriority checks if priority is in valid range.
func ValidatePriority(p int) bool {
	return p >= PriorityHighest && p <= PriorityLowest
}
