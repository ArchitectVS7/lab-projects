package task

import (
	"sort"
	"time"
)

// Storage defines what the service needs from a storage backend.
type Storage interface {
	Save(t *Task) error
	FindByID(id string) (*Task, error)
	FindAll() ([]*Task, error)
	Delete(id string) error
	NextID() (string, error)
}

// Service provides task management operations.
type Service struct {
	storage Storage
}

// NewService creates a new task service.
func NewService(storage Storage) *Service {
	return &Service{storage: storage}
}

// Create creates a new task with the given title.
func (s *Service) Create(title, description string, priority int, dueDate *time.Time) (*Task, error) {
	id, err := s.storage.NextID()
	if err != nil {
		return nil, err
	}

	task := NewTask(id, title)
	task.Description = description
	task.Priority = priority
	if dueDate != nil {
		task.DueDate = dueDate
	}

	if err := task.Validate(); err != nil {
		return nil, err
	}

	if err := s.storage.Save(task); err != nil {
		return nil, err
	}

	return task, nil
}

// Get retrieves a task by ID.
func (s *Service) Get(id string) (*Task, error) {
	return s.storage.FindByID(id)
}

// List returns all tasks, optionally filtered.
func (s *Service) List(filter ListFilter) ([]*Task, error) {
	tasks, err := s.storage.FindAll()
	if err != nil {
		return nil, err
	}

	// Apply filters
	filtered := make([]*Task, 0, len(tasks))
	for _, t := range tasks {
		if filter.Match(t) {
			filtered = append(filtered, t)
		}
	}

	// Sort by priority (highest first), then by due date
	sort.Slice(filtered, func(i, j int) bool {
		// Priority first (lower number = higher priority)
		if filtered[i].Priority != filtered[j].Priority {
			return filtered[i].Priority < filtered[j].Priority
		}
		// Then by due date (earlier first, nil last)
		if filtered[i].DueDate == nil && filtered[j].DueDate == nil {
			return false
		}
		if filtered[i].DueDate == nil {
			return false
		}
		if filtered[j].DueDate == nil {
			return true
		}
		return filtered[i].DueDate.Before(*filtered[j].DueDate)
	})

	return filtered, nil
}

// Complete marks a task as completed.
func (s *Service) Complete(id string) (*Task, error) {
	task, err := s.storage.FindByID(id)
	if err != nil {
		return nil, err
	}

	task.Complete()

	if err := s.storage.Save(task); err != nil {
		return nil, err
	}

	return task, nil
}

// Start marks a task as in progress.
func (s *Service) Start(id string) (*Task, error) {
	task, err := s.storage.FindByID(id)
	if err != nil {
		return nil, err
	}

	task.Start()

	if err := s.storage.Save(task); err != nil {
		return nil, err
	}

	return task, nil
}

// Update updates a task's fields.
func (s *Service) Update(id string, updates TaskUpdate) (*Task, error) {
	task, err := s.storage.FindByID(id)
	if err != nil {
		return nil, err
	}

	if updates.Title != nil {
		task.Title = *updates.Title
	}
	if updates.Description != nil {
		task.Description = *updates.Description
	}
	if updates.Priority != nil {
		task.Priority = *updates.Priority
	}
	if updates.DueDate != nil {
		task.DueDate = updates.DueDate
	}
	task.UpdatedAt = time.Now()

	if err := task.Validate(); err != nil {
		return nil, err
	}

	if err := s.storage.Save(task); err != nil {
		return nil, err
	}

	return task, nil
}

// Delete removes a task.
func (s *Service) Delete(id string) error {
	return s.storage.Delete(id)
}

// TaskUpdate holds optional fields for updating a task.
type TaskUpdate struct {
	Title       *string
	Description *string
	Priority    *int
	DueDate     *time.Time
}

// ListFilter defines criteria for filtering tasks.
type ListFilter struct {
	Status      *Status
	MaxPriority *int  // Show tasks with this priority or higher (lower number = higher priority)
	IncludeAll  bool  // If false, excludes completed tasks
	OverdueOnly bool
}

// Match returns true if the task matches the filter criteria.
func (f ListFilter) Match(t *Task) bool {
	// Exclude completed by default
	if !f.IncludeAll && t.Status == StatusCompleted {
		return false
	}

	// Filter by status
	if f.Status != nil && t.Status != *f.Status {
		return false
	}

	// Filter by priority (show tasks with priority <= MaxPriority, i.e., higher or equal importance)
	if f.MaxPriority != nil && t.Priority > *f.MaxPriority {
		return false
	}

	// Filter overdue only
	if f.OverdueOnly && !t.IsOverdue() {
		return false
	}

	return true
}
