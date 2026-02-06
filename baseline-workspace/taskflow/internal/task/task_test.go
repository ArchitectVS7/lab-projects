package task

import (
	"testing"
	"time"
)

func TestNewTask(t *testing.T) {
	task := NewTask("1", "Test task")

	if task.ID != "1" {
		t.Errorf("expected ID '1', got '%s'", task.ID)
	}
	if task.Title != "Test task" {
		t.Errorf("expected title 'Test task', got '%s'", task.Title)
	}
	if task.Status != StatusPending {
		t.Errorf("expected status 'pending', got '%s'", task.Status)
	}
	if task.Priority != PriorityMedium {
		t.Errorf("expected priority %d, got %d", PriorityMedium, task.Priority)
	}
}

func TestTask_Validate(t *testing.T) {
	tests := []struct {
		name    string
		task    *Task
		wantErr error
	}{
		{
			name:    "valid task",
			task:    NewTask("1", "Valid task"),
			wantErr: nil,
		},
		{
			name:    "empty title",
			task:    NewTask("1", ""),
			wantErr: ErrEmptyTitle,
		},
		{
			name: "priority too low",
			task: &Task{ID: "1", Title: "Test", Priority: 0},
			wantErr: ErrInvalidPriority,
		},
		{
			name: "priority too high",
			task: &Task{ID: "1", Title: "Test", Priority: 6},
			wantErr: ErrInvalidPriority,
		},
		{
			name: "valid priority boundaries",
			task: &Task{ID: "1", Title: "Test", Priority: PriorityHighest},
			wantErr: nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.task.Validate()
			if err != tt.wantErr {
				t.Errorf("Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestTask_Complete(t *testing.T) {
	task := NewTask("1", "Test task")
	task.Complete()

	if task.Status != StatusCompleted {
		t.Errorf("expected status 'completed', got '%s'", task.Status)
	}
	if task.CompletedAt == nil {
		t.Error("expected CompletedAt to be set")
	}
}

func TestTask_IsOverdue(t *testing.T) {
	tests := []struct {
		name     string
		task     *Task
		expected bool
	}{
		{
			name:     "no due date",
			task:     NewTask("1", "Test"),
			expected: false,
		},
		{
			name: "future due date",
			task: func() *Task {
				task := NewTask("1", "Test")
				future := time.Now().Add(24 * time.Hour)
				task.DueDate = &future
				return task
			}(),
			expected: false,
		},
		{
			name: "past due date",
			task: func() *Task {
				task := NewTask("1", "Test")
				past := time.Now().Add(-24 * time.Hour)
				task.DueDate = &past
				return task
			}(),
			expected: true,
		},
		{
			name: "past due but completed",
			task: func() *Task {
				task := NewTask("1", "Test")
				past := time.Now().Add(-24 * time.Hour)
				task.DueDate = &past
				task.Complete()
				return task
			}(),
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.task.IsOverdue(); got != tt.expected {
				t.Errorf("IsOverdue() = %v, want %v", got, tt.expected)
			}
		})
	}
}

func TestTask_PriorityString(t *testing.T) {
	tests := []struct {
		priority int
		expected string
	}{
		{PriorityHighest, "highest"},
		{PriorityHigh, "high"},
		{PriorityMedium, "medium"},
		{PriorityLow, "low"},
		{PriorityLowest, "lowest"},
		{99, "unknown"},
	}

	for _, tt := range tests {
		task := &Task{Priority: tt.priority}
		if got := task.PriorityString(); got != tt.expected {
			t.Errorf("PriorityString() for %d = %s, want %s", tt.priority, got, tt.expected)
		}
	}
}
