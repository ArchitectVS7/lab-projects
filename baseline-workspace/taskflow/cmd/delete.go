package cmd

import (
	"bufio"
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/spf13/cobra"

	"taskflow/store"
)

var deleteForce bool

var deleteCmd = &cobra.Command{
	Use:   "delete <task-id>",
	Short: "Delete a task",
	Long: `Delete a task by its ID.

Examples:
  taskflow delete 1
  taskflow delete 5 -f`,
	Aliases: []string{"rm", "remove"},
	Args:    cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		id, err := strconv.Atoi(args[0])
		if err != nil {
			return fmt.Errorf("invalid task ID: %s", args[0])
		}

		// Get task first to show title
		t, err := taskStore.Get(id)
		if err != nil {
			if err == store.ErrTaskNotFound {
				return fmt.Errorf("task #%d not found", id)
			}
			return err
		}

		// Confirm unless -f flag
		if !deleteForce {
			fmt.Printf("Delete task #%d: %s? [y/N] ", t.ID, t.Title)
			reader := bufio.NewReader(os.Stdin)
			response, _ := reader.ReadString('\n')
			response = strings.TrimSpace(strings.ToLower(response))

			if response != "y" && response != "yes" {
				fmt.Println("Cancelled.")
				return nil
			}
		}

		if err := taskStore.Delete(id); err != nil {
			return fmt.Errorf("failed to delete task: %w", err)
		}

		fmt.Printf("🗑️  Deleted: #%d %s\n", t.ID, t.Title)

		return nil
	},
}

func init() {
	rootCmd.AddCommand(deleteCmd)

	deleteCmd.Flags().BoolVarP(&deleteForce, "force", "f", false, "skip confirmation")
}
