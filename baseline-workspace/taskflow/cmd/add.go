package cmd

import (
	"fmt"
	"strings"
	"time"

	"github.com/spf13/cobra"

	"taskflow/task"
)

var (
	addPriority    int
	addDueDate     string
	addDescription string
)

var addCmd = &cobra.Command{
	Use:   "add <title>",
	Short: "Add a new task",
	Long: `Add a new task with optional priority and due date.

Priority levels:
  1 = Highest (🔴)
  2 = High (🟠)
  3 = Medium (🟡) [default]
  4 = Low (🟢)
  5 = Lowest (⚪)

Examples:
  taskflow add "Write tests"
  taskflow add "Fix critical bug" -p 1
  taskflow add "Review PR" -p 2 -d 2024-12-31
  taskflow add "Update docs" -D "Add API documentation"`,
	Args: cobra.MinimumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		title := strings.Join(args, " ")

		// Validate priority
		if !task.ValidatePriority(addPriority) {
			return fmt.Errorf("priority must be between 1 and 5")
		}

		// Create task
		t := task.NewTask(0, title)
		t.Priority = addPriority
		t.Description = addDescription

		// Parse due date if provided
		if addDueDate != "" {
			dueDate, err := time.Parse("2006-01-02", addDueDate)
			if err != nil {
				return fmt.Errorf("invalid date format (use YYYY-MM-DD): %w", err)
			}
			t.DueDate = dueDate
		}

		// Save task
		t, err := taskStore.Add(t)
		if err != nil {
			return fmt.Errorf("failed to add task: %w", err)
		}

		fmt.Printf("✅ Added task #%d: %s\n", t.ID, t.Title)
		if !t.DueDate.IsZero() {
			fmt.Printf("   Due: %s\n", t.DueDateString())
		}

		return nil
	},
}

func init() {
	rootCmd.AddCommand(addCmd)

	addCmd.Flags().IntVarP(&addPriority, "priority", "p", 3, "priority (1-5, 1=highest)")
	addCmd.Flags().StringVarP(&addDueDate, "due", "d", "", "due date (YYYY-MM-DD)")
	addCmd.Flags().StringVarP(&addDescription, "desc", "D", "", "task description")
}
