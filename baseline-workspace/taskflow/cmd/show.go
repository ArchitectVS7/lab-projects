package cmd

import (
	"fmt"
	"strconv"

	"github.com/spf13/cobra"

	"taskflow/store"
)

var showCmd = &cobra.Command{
	Use:   "show <task-id>",
	Short: "Show task details",
	Long: `Show detailed information about a specific task.

Examples:
  taskflow show 1`,
	Aliases: []string{"view", "get"},
	Args:    cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		id, err := strconv.Atoi(args[0])
		if err != nil {
			return fmt.Errorf("invalid task ID: %s", args[0])
		}

		t, err := taskStore.Get(id)
		if err != nil {
			if err == store.ErrTaskNotFound {
				return fmt.Errorf("task #%d not found", id)
			}
			return err
		}

		fmt.Printf("Task #%d\n", t.ID)
		fmt.Printf("═══════════════════════════════════════\n")
		fmt.Printf("Title:       %s\n", t.Title)
		if t.Description != "" {
			fmt.Printf("Description: %s\n", t.Description)
		}
		fmt.Printf("Priority:    %s\n", t.PriorityString())
		fmt.Printf("Status:      %s\n", t.StatusString())
		fmt.Printf("Due Date:    %s\n", t.DueDateString())
		fmt.Printf("Created:     %s\n", t.CreatedAt.Format("2006-01-02 15:04"))
		if !t.CompletedAt.IsZero() {
			fmt.Printf("Completed:   %s\n", t.CompletedAt.Format("2006-01-02 15:04"))
		}

		return nil
	},
}

func init() {
	rootCmd.AddCommand(showCmd)
}
