package cmd

import (
	"fmt"
	"os"
	"text/tabwriter"

	"github.com/spf13/cobra"

	"taskflow/store"
	"taskflow/task"
)

var (
	listAll      bool
	listStatus   string
	listPriority int
)

var listCmd = &cobra.Command{
	Use:   "list",
	Short: "List all tasks",
	Long: `List all tasks sorted by priority and due date.

By default, completed tasks are hidden. Use -a to show all.

Filter examples:
  taskflow list                     # all pending tasks
  taskflow list -a                  # include completed
  taskflow list -s pending          # only pending
  taskflow list -s in_progress      # only in progress
  taskflow list -s completed        # only completed
  taskflow list -p 2                # priority 2 (high) or higher
  taskflow list -p 1                # only highest priority
  taskflow list -s pending -p 2     # pending + high priority`,
	Aliases: []string{"ls"},
	RunE: func(cmd *cobra.Command, args []string) error {
		opts := store.ListOptions{
			IncludeCompleted: listAll,
			MinPriority:      listPriority,
		}

		// Parse status filter
		if listStatus != "" {
			switch listStatus {
			case "pending":
				opts.Status = task.StatusPending
				opts.IncludeCompleted = true // Don't exclude based on completed flag
			case "in_progress", "in-progress":
				opts.Status = task.StatusInProgress
				opts.IncludeCompleted = true
			case "completed", "done":
				opts.Status = task.StatusCompleted
				opts.IncludeCompleted = true
			default:
				return fmt.Errorf("invalid status: %s (use: pending, in_progress, completed)", listStatus)
			}
		}

		// Validate priority
		if listPriority < 0 || listPriority > 5 {
			return fmt.Errorf("priority must be between 1 and 5")
		}

		tasks := taskStore.List(opts)

		if len(tasks) == 0 {
			if listStatus != "" || listPriority > 0 {
				fmt.Println("No tasks match the filter criteria.")
			} else {
				fmt.Println("No tasks found. Add one with: taskflow add \"Your task\"")
			}
			return nil
		}

		w := tabwriter.NewWriter(os.Stdout, 0, 0, 2, ' ', 0)
		fmt.Fprintln(w, "ID\tPRIORITY\tSTATUS\tDUE\tTITLE")
		fmt.Fprintln(w, "--\t--------\t------\t---\t-----")

		for _, t := range tasks {
			fmt.Fprintf(w, "%d\t%s\t%s\t%s\t%s\n",
				t.ID,
				t.PriorityString(),
				t.StatusString(),
				t.DueDateString(),
				truncate(t.Title, 40),
			)
		}

		w.Flush()

		// Show stats
		total, pending, completed, overdue := taskStore.Stats()
		fmt.Printf("\n📊 %d total, %d pending, %d completed", total, pending, completed)
		if overdue > 0 {
			fmt.Printf(", ⚠️  %d overdue", overdue)
		}
		fmt.Println()

		return nil
	},
}

func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max-3] + "..."
}

func init() {
	rootCmd.AddCommand(listCmd)

	listCmd.Flags().BoolVarP(&listAll, "all", "a", false, "show completed tasks")
	listCmd.Flags().StringVarP(&listStatus, "status", "s", "", "filter by status (pending, in_progress, completed)")
	listCmd.Flags().IntVarP(&listPriority, "priority", "p", 0, "show tasks with this priority or higher (1-5)")
}
