package storage

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"

	"github.com/taskflow/internal/task"
)

// JSONStorage implements Storage using a JSON file.
type JSONStorage struct {
	filepath string
	mu       sync.RWMutex
}

// data represents the JSON file structure.
type data struct {
	NextID int          `json:"next_id"`
	Tasks  []*task.Task `json:"tasks"`
}

// NewJSONStorage creates a new JSON file storage.
// If the file doesn't exist, it will be created on first write.
func NewJSONStorage(path string) (*JSONStorage, error) {
	s := &JSONStorage{filepath: path}

	// Ensure directory exists
	dir := filepath.Dir(path)
	if dir != "" && dir != "." {
		if err := os.MkdirAll(dir, 0755); err != nil {
			return nil, fmt.Errorf("failed to create directory: %w", err)
		}
	}

	// Initialize file if it doesn't exist
	if _, err := os.Stat(path); os.IsNotExist(err) {
		if err := s.save(&data{NextID: 1, Tasks: []*task.Task{}}); err != nil {
			return nil, err
		}
	}

	return s, nil
}

// filename returns just the filename from the path.
func (s *JSONStorage) filename() string {
	return filepath.Base(s.filepath)
}

// load reads data from the JSON file.
func (s *JSONStorage) load() (*data, error) {
	file, err := os.ReadFile(s.filepath)
	if err != nil {
		return nil, fmt.Errorf("failed to read file: %w", err)
	}

	var d data
	if err := json.Unmarshal(file, &d); err != nil {
		return nil, fmt.Errorf("failed to parse JSON: %w", err)
	}

	return &d, nil
}

// save writes data to the JSON file.
func (s *JSONStorage) save(d *data) error {
	file, err := json.MarshalIndent(d, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal JSON: %w", err)
	}

	if err := os.WriteFile(s.filepath, file, 0644); err != nil {
		return fmt.Errorf("failed to write file: %w", err)
	}

	return nil
}

// Save persists a task (creates or updates).
func (s *JSONStorage) Save(t *task.Task) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	d, err := s.load()
	if err != nil {
		return err
	}

	// Check if task exists (update) or is new (create)
	found := false
	for i, existing := range d.Tasks {
		if existing.ID == t.ID {
			d.Tasks[i] = t
			found = true
			break
		}
	}

	if !found {
		d.Tasks = append(d.Tasks, t)
	}

	return s.save(d)
}

// FindByID retrieves a task by its ID.
func (s *JSONStorage) FindByID(id string) (*task.Task, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	d, err := s.load()
	if err != nil {
		return nil, err
	}

	for _, t := range d.Tasks {
		if t.ID == id {
			return t, nil
		}
	}

	return nil, task.ErrTaskNotFound
}

// FindAll retrieves all tasks.
func (s *JSONStorage) FindAll() ([]*task.Task, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	d, err := s.load()
	if err != nil {
		return nil, err
	}

	return d.Tasks, nil
}

// Delete removes a task by ID.
func (s *JSONStorage) Delete(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	d, err := s.load()
	if err != nil {
		return err
	}

	// Find and remove the task
	found := false
	for i, t := range d.Tasks {
		if t.ID == id {
			d.Tasks = append(d.Tasks[:i], d.Tasks[i+1:]...)
			found = true
			break
		}
	}

	if !found {
		return task.ErrTaskNotFound
	}

	return s.save(d)
}

// NextID generates the next available ID.
func (s *JSONStorage) NextID() (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	d, err := s.load()
	if err != nil {
		return "", err
	}

	id := fmt.Sprintf("%d", d.NextID)
	d.NextID++

	if err := s.save(d); err != nil {
		return "", err
	}

	return id, nil
}
