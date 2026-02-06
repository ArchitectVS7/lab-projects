package cmd

import (
	"fmt"
	"strconv"

	"github.com/spf13/cobra"

	"taskflow/store"
)

var completeCmd = &cobra.Command{
	Use:   "complete <task-id>",
	Short: "Mark a task as completed",
	Long: `Mark a task as completed by its ID.

Examples:
  taskflow complete 1
  taskflow complete 5`,
	Aliases: []string{"done", "finish"},
	Args:    cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		id, err := strconv.Atoi(args[0])
		if err != nil {
			return fmt.Errorf("invalid task ID: %s", args[0])
		}

		t, err := taskStore.Complete(id)
		if err != nil {
			if err == store.ErrTaskNotFound {
				return fmt.Errorf("task #%d not found", id)
			}
			return fmt.Errorf("failed to complete task: %w", err)
		}

		fmt.Printf("✅ Completed: #%d %s\n", t.ID, t.Title)

		return nil
	},
}

func init() {
	rootCmd.AddCommand(completeCmd)
}
