// Package store handles task persistence using JSON file storage.
package store

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"sort"

	"taskflow/task"
)

var (
	ErrTaskNotFound = errors.New("task not found")
)

// Store manages task persistence.
type Store struct {
	path   string
	tasks  []*task.Task
	nextID int
}

// Data represents the JSON file structure.
type Data struct {
	NextID int          `json:"next_id"`
	Tasks  []*task.Task `json:"tasks"`
}

// New creates a new Store with the given file path.
func New(path string) (*Store, error) {
	s := &Store{
		path:   path,
		tasks:  make([]*task.Task, 0),
		nextID: 1,
	}

	if err := s.ensureDir(); err != nil {
		return nil, err
	}

	if err := s.load(); err != nil && !os.IsNotExist(err) {
		return nil, err
	}

	return s, nil
}

// DefaultPath returns the default storage path.
func DefaultPath() string {
	home, _ := os.UserHomeDir()
	return filepath.Join(home, ".taskflow", "tasks.json")
}

func (s *Store) ensureDir() error {
	dir := filepath.Dir(s.path)
	return os.MkdirAll(dir, 0755)
}

func (s *Store) load() error {
	data, err := os.ReadFile(s.path)
	if err != nil {
		return err
	}

	var d Data
	if err := json.Unmarshal(data, &d); err != nil {
		return err
	}

	s.tasks = d.Tasks
	s.nextID = d.NextID
	return nil
}

func (s *Store) save() error {
	d := Data{
		NextID: s.nextID,
		Tasks:  s.tasks,
	}

	data, err := json.MarshalIndent(d, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(s.path, data, 0644)
}

// Add creates a new task and returns it.
func (s *Store) Add(t *task.Task) (*task.Task, error) {
	t.ID = s.nextID
	s.nextID++
	s.tasks = append(s.tasks, t)

	if err := s.save(); err != nil {
		return nil, err
	}

	return t, nil
}

// Get returns a task by ID.
func (s *Store) Get(id int) (*task.Task, error) {
	for _, t := range s.tasks {
		if t.ID == id {
			return t, nil
		}
	}
	return nil, ErrTaskNotFound
}

// ListOptions configures task filtering.
type ListOptions struct {
	IncludeCompleted bool
	Status           task.Status // empty = all statuses
	MinPriority      int         // 0 = no filter, otherwise 1-5 (shows tasks with priority <= this value)
	MaxPriority      int         // 0 = no filter, otherwise 1-5 (shows tasks with priority >= this value)
}

// List returns all tasks, optionally filtered.
func (s *Store) List(opts ListOptions) []*task.Task {
	result := make([]*task.Task, 0)

	for _, t := range s.tasks {
		// Filter by completed status
		if !opts.IncludeCompleted && t.Status == task.StatusCompleted {
			continue
		}

		// Filter by specific status
		if opts.Status != "" && t.Status != opts.Status {
			continue
		}

		// Filter by priority (1 = highest, 5 = lowest)
		// MinPriority means "at least this important" (priority value <= MinPriority)
		if opts.MinPriority > 0 && t.Priority > opts.MinPriority {
			continue
		}

		// MaxPriority means "at most this important" (priority value >= MaxPriority)
		if opts.MaxPriority > 0 && t.Priority < opts.MaxPriority {
			continue
		}

		result = append(result, t)
	}

	// Sort by priority (highest first), then by due date
	sort.Slice(result, func(i, j int) bool {
		if result[i].Priority != result[j].Priority {
			return result[i].Priority < result[j].Priority
		}
		// Tasks with due dates come before those without
		if result[i].DueDate.IsZero() != result[j].DueDate.IsZero() {
			return !result[i].DueDate.IsZero()
		}
		return result[i].DueDate.Before(result[j].DueDate)
	})

	return result
}

// Update saves changes to an existing task.
func (s *Store) Update(t *task.Task) error {
	for i, existing := range s.tasks {
		if existing.ID == t.ID {
			s.tasks[i] = t
			return s.save()
		}
	}
	return ErrTaskNotFound
}

// Delete removes a task by ID.
func (s *Store) Delete(id int) error {
	for i, t := range s.tasks {
		if t.ID == id {
			s.tasks = append(s.tasks[:i], s.tasks[i+1:]...)
			return s.save()
		}
	}
	return ErrTaskNotFound
}

// Complete marks a task as completed.
func (s *Store) Complete(id int) (*task.Task, error) {
	t, err := s.Get(id)
	if err != nil {
		return nil, err
	}

	t.Complete()

	if err := s.save(); err != nil {
		return nil, err
	}

	return t, nil
}

// Stats returns task statistics.
func (s *Store) Stats() (total, pending, completed, overdue int) {
	for _, t := range s.tasks {
		total++
		switch t.Status {
		case task.StatusCompleted:
			completed++
		default:
			pending++
			if t.IsOverdue() {
				overdue++
			}
		}
	}
	return
}
