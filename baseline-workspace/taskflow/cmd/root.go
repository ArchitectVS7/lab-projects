// Package cmd implements the CLI commands.
package cmd

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"

	"taskflow/store"
)

var (
	dataFile string
	taskStore *store.Store
)

// rootCmd represents the base command.
var rootCmd = &cobra.Command{
	Use:   "taskflow",
	Short: "TaskFlow - A simple task management CLI",
	Long: `TaskFlow is a command-line task manager that helps you
organize your work with priorities and due dates.

Examples:
  taskflow add "Write documentation"
  taskflow add "Fix bug" -p 1 -d 2024-12-31
  taskflow list
  taskflow complete 1`,
	PersistentPreRunE: func(cmd *cobra.Command, args []string) error {
		// Skip store initialization for help commands
		if cmd.Name() == "help" || cmd.Name() == "version" {
			return nil
		}

		var err error
		path := dataFile
		if path == "" {
			path = store.DefaultPath()
		}

		taskStore, err = store.New(path)
		if err != nil {
			return fmt.Errorf("failed to initialize store: %w", err)
		}

		return nil
	},
}

// Execute runs the root command.
func Execute() {
	if err := rootCmd.Execute(); err != nil {
		os.Exit(1)
	}
}

func init() {
	rootCmd.PersistentFlags().StringVar(&dataFile, "file", "", "data file path (default: ~/.taskflow/tasks.json)")
}
