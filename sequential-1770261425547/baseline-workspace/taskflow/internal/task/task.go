// Package task defines the Task model and related types.
package task

import (
	"errors"
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

// Validation errors
var (
	ErrEmptyTitle       = errors.New("title cannot be empty")
	ErrInvalidPriority  = errors.New("priority must be between 1 and 5")
	ErrTaskNotFound     = errors.New("task not found")
)

// Task represents a single task in the system.
type Task struct {
	ID          string     `json:"id"`
	Title       string     `json:"title"`
	Description string     `json:"description,omitempty"`
	Priority    int        `json:"priority"`
	DueDate     *time.Time `json:"due_date,omitempty"`
	Status      Status     `json:"status"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	CompletedAt *time.Time `json:"completed_at,omitempty"`
}

// NewTask creates a new task with the given title and sensible defaults.
func NewTask(id, title string) *Task {
	now := time.Now()
	return &Task{
		ID:        id,
		Title:     title,
		Priority:  PriorityMedium,
		Status:    StatusPending,
		CreatedAt: now,
		UpdatedAt: now,
	}
}

// Validate checks if the task has valid data.
func (t *Task) Validate() error {
	if t.Title == "" {
		return ErrEmptyTitle
	}
	if t.Priority < PriorityHighest || t.Priority > PriorityLowest {
		return ErrInvalidPriority
	}
	return nil
}

// Complete marks the task as completed.
func (t *Task) Complete() {
	now := time.Now()
	t.Status = StatusCompleted
	t.CompletedAt = &now
	t.UpdatedAt = now
}

// Start marks the task as in progress.
func (t *Task) Start() {
	t.Status = StatusInProgress
	t.UpdatedAt = time.Now()
}

// IsOverdue returns true if the task is past its due date and not completed.
func (t *Task) IsOverdue() bool {
	if t.DueDate == nil || t.Status == StatusCompleted {
		return false
	}
	return time.Now().After(*t.DueDate)
}

// SetDueDate sets the due date for the task.
func (t *Task) SetDueDate(dueDate time.Time) {
	t.DueDate = &dueDate
	t.UpdatedAt = time.Now()
}

// PriorityString returns a human-readable priority label.
func (t *Task) PriorityString() string {
	switch t.Priority {
	case PriorityHighest:
		return "highest"
	case PriorityHigh:
		return "high"
	case PriorityMedium:
		return "medium"
	case PriorityLow:
		return "low"
	case PriorityLowest:
		return "lowest"
	default:
		return "unknown"
	}
}
