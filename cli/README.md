# TaskMan CLI

A command-line interface for TaskMan task management platform.

## Installation

### Global Installation
```bash
cd cli
npm install
npm run build
npm link
```

After installation, the `taskman` command will be available globally.

### Local Development
```bash
cd cli
npm install
npm run dev
```

## Quick Start

1. **Login** - Configure your API credentials:
```bash
taskman login
```

2. **Create a task**:
```bash
taskman create "Fix login bug" --priority HIGH --due tomorrow
```

3. **List tasks**:
```bash
taskman list
taskman list --status TODO
taskman list --project "My Project"
```

4. **Show task details**:
```bash
taskman show abc12345
```

5. **Update a task**:
```bash
taskman update abc12345 --status IN_PROGRESS
```

6. **Complete a task**:
```bash
taskman complete abc12345
```

7. **List projects**:
```bash
taskman projects
```

## Commands

### `taskman login`
Configure API credentials. You'll be prompted for:
- API URL (default: http://localhost:3000)
- API key (generate one in the TaskMan web UI under Profile > API Keys)

### `taskman create <title>`
Create a new task.

Options:
- `-p, --project <id>` - Project ID
- `-d, --description <text>` - Task description
- `--priority <level>` - Priority: LOW, MEDIUM, HIGH, URGENT (default: MEDIUM)
- `--due <date>` - Due date (YYYY-MM-DD, or "tomorrow", "next week", etc.)
- `-a, --assignee <id>` - Assignee user ID

Examples:
```bash
taskman create "Write documentation"
taskman create "Review PR" --priority HIGH --due tomorrow
taskman create "Database migration" --project abc123 --assignee user456
```

### `taskman list`
List tasks with optional filters.

Options:
- `-p, --project <name>` - Filter by project name
- `-s, --status <status>` - Filter by status (TODO, IN_PROGRESS, IN_REVIEW, DONE)
- `-a, --assignee <email>` - Filter by assignee email
- `--priority <priority>` - Filter by priority (LOW, MEDIUM, HIGH, URGENT)
- `--limit <number>` - Limit results (default: 20)

Examples:
```bash
taskman list
taskman list --status TODO
taskman list --priority HIGH --status IN_PROGRESS
```

### `taskman show <id>`
Show detailed information about a task. ID can be the short ID (first 8 characters).

Examples:
```bash
taskman show abc12345
taskman show abc12345-6789-1011-1213-141516171819
```

### `taskman update <id>`
Update task fields.

Options:
- `-t, --title <text>` - New title
- `-d, --description <text>` - New description
- `-s, --status <status>` - New status (TODO, IN_PROGRESS, IN_REVIEW, DONE)
- `-p, --priority <priority>` - New priority (LOW, MEDIUM, HIGH, URGENT)
- `-a, --assignee <id>` - New assignee ID
- `--due <date>` - New due date (YYYY-MM-DD)

Examples:
```bash
taskman update abc12345 --status IN_PROGRESS
taskman update abc12345 --priority URGENT --due 2024-12-31
```

### `taskman complete <id>`
Mark a task as completed (sets status to DONE).

Examples:
```bash
taskman complete abc12345
```

### `taskman projects`
List all accessible projects.

## Shell Completion

### Bash
Add to `~/.bashrc`:
```bash
source /path/to/TaskMan/cli/completions/taskman.bash
```

### Zsh
Copy completion file:
```bash
mkdir -p ~/.zsh/completions
cp /path/to/TaskMan/cli/completions/taskman.zsh ~/.zsh/completions/_taskman
```

Add to `~/.zshrc`:
```bash
fpath=(~/.zsh/completions $fpath)
autoload -Uz compinit && compinit
```

## Configuration

Configuration is stored in `~/.config/taskman-cli/config.json` and includes:
- API key
- Base URL
- Default project ID (optional)

To view config location:
```bash
taskman login
# Config path is displayed on successful login
```

To reset configuration, delete the config file or run `taskman login` again.

## Development

### Building
```bash
npm run build
```

### Running in development
```bash
npm run dev -- list
npm run dev -- create "Test task"
```

## Requirements

- Node.js 20 or later
- TaskMan backend server running
- Valid API key (generate in web UI)
