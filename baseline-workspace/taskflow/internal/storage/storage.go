// Package storage provides persistence for tasks.
package storage

import "github.com/taskflow/internal/task"

// Storage defines the interface for task persistence.
type Storage interface {
	// Save persists a task (creates or updates).
	Save(t *task.Task) error

	// FindByID retrieves a task by its ID.
	FindByID(id string) (*task.Task, error)

	// FindAll retrieves all tasks.
	FindAll() ([]*task.Task, error)

	// Delete removes a task by ID.
	Delete(id string) error

	// NextID generates the next available ID.
	NextID() (string, error)
}
