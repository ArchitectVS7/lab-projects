# Milestone Import API

## Overview

The Milestone Import API lets you bulk-create tasks in TaskMan from any external tool — especially Claude Code sessions. Instead of manually creating tasks one by one, you POST a batch of milestones with tags, domains, and dependencies, and they all appear in your project instantly.

## Setup

1. **Generate an API key** in TaskMan: Settings > API Keys > Create Key
2. **Export as environment variables** in the shell where you'll call the API:

```bash
export TASKMAN_API_KEY="taskman_..."
export TASKMAN_URL="http://localhost:4000"  # or your production URL
```

## API Reference

### `POST /api/import/milestones`

**Headers:**
| Header | Value |
|--------|-------|
| `Content-Type` | `application/json` |
| `X-API-Key` | Your TaskMan API key (`taskman_...`) |

**Request Body:**

```json
{
  "project": "My Project",
  "source": "claude-code",
  "milestones": [
    {
      "title": "Design database schema",
      "description": "Define tables for users, posts, and comments",
      "priority": "HIGH",
      "status": "TODO",
      "dueDate": "2026-03-15T00:00:00.000Z",
      "tags": ["backend", "database"],
      "domains": ["Coding"],
      "dependsOn": []
    },
    {
      "title": "Implement API endpoints",
      "description": "REST endpoints for CRUD operations",
      "priority": "HIGH",
      "status": "TODO",
      "tags": ["backend", "api"],
      "domains": ["Coding"],
      "dependsOn": ["Design database schema"]
    },
    {
      "title": "Write integration tests",
      "priority": "MEDIUM",
      "tags": ["testing"],
      "dependsOn": ["Implement API endpoints"]
    }
  ]
}
```

**Field Reference:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `project` | string | Yes | Project name (case-insensitive) or UUID |
| `source` | string | No | Label for where the import came from (max 200 chars) |
| `milestones` | array | Yes | 1–100 milestone objects |
| `milestones[].title` | string | Yes | Task title (1–200 chars) |
| `milestones[].description` | string | No | Task description (max 2000 chars) |
| `milestones[].priority` | enum | No | `LOW`, `MEDIUM` (default), `HIGH`, `URGENT` |
| `milestones[].status` | enum | No | `TODO` (default), `IN_PROGRESS`, `IN_REVIEW`, `DONE` |
| `milestones[].dueDate` | datetime | No | ISO 8601 datetime string |
| `milestones[].tags` | string[] | No | Tag names — auto-created if they don't exist |
| `milestones[].domains` | string[] | No | Domain names — must match existing domains (warns on miss) |
| `milestones[].dependsOn` | string[] | No | Titles of other milestones in the same batch |

**Response (201):**

```json
{
  "imported": 3,
  "project": { "id": "uuid", "name": "My Project" },
  "source": "claude-code",
  "tasks": [
    { "id": "uuid", "title": "Design database schema", "status": "TODO", "priority": "HIGH" },
    { "id": "uuid", "title": "Implement API endpoints", "status": "TODO", "priority": "HIGH" },
    { "id": "uuid", "title": "Write integration tests", "status": "TODO", "priority": "MEDIUM" }
  ],
  "warnings": []
}
```

**Error Responses:**

| Status | Meaning |
|--------|---------|
| 400 | Validation error (missing fields, invalid enum values, etc.) |
| 401 | Authentication required or invalid API key |
| 403 | User is a VIEWER on the project (needs MEMBER or above) |
| 404 | Project not found or user is not a member |

## Claude Code Drop-In Prompt

Copy-paste this block into any Claude Code session to enable milestone import. Set the environment variables first.

````
You have access to a TaskMan instance for tracking milestones. When I ask you to
"import milestones", "send milestones to TaskMan", or "sync the plan", do this:

1. Gather all milestones/deliverables from our current session.
2. Format them as a JSON body matching this schema:

   {
     "project": "<project name in TaskMan>",
     "source": "claude-code",
     "milestones": [
       {
         "title": "string (required)",
         "description": "string (optional)",
         "priority": "LOW | MEDIUM | HIGH | URGENT (optional)",
         "status": "TODO | IN_PROGRESS | IN_REVIEW | DONE (optional)",
         "dueDate": "ISO datetime (optional)",
         "tags": ["string array (optional)"],
         "domains": ["string array (optional)"],
         "dependsOn": ["titles of other milestones in this batch (optional)"]
       }
     ]
   }

3. POST it using curl:

   curl -s -X POST "$TASKMAN_URL/api/import/milestones" \
     -H "Content-Type: application/json" \
     -H "X-API-Key: $TASKMAN_API_KEY" \
     -d '<the JSON>'

4. Report the result: how many tasks were imported, any warnings, and the task IDs.

Environment variables available:
- TASKMAN_URL: The TaskMan API base URL
- TASKMAN_API_KEY: A valid TaskMan API key

If either env var is missing, ask the user to set them before proceeding.
````

## UAT Procedure

### Prerequisites
- TaskMan running locally (`docker-compose up` or backend + frontend dev servers)
- At least one project exists in TaskMan
- PostgreSQL running

### Steps

1. **Generate an API key** — Go to TaskMan Settings > API Keys, create a key, copy the value.

2. **Export environment variables:**
   ```bash
   export TASKMAN_API_KEY="taskman_..."
   export TASKMAN_URL="http://localhost:4000"
   ```

3. **Quick smoke test with curl:**
   ```bash
   curl -s -X POST "$TASKMAN_URL/api/import/milestones" \
     -H "Content-Type: application/json" \
     -H "X-API-Key: $TASKMAN_API_KEY" \
     -d '{
       "project": "YOUR_PROJECT_NAME",
       "source": "uat-test",
       "milestones": [
         { "title": "UAT Smoke Test", "priority": "LOW", "tags": ["uat"] }
       ]
     }' | jq .
   ```
   Expected: 201 with `imported: 1`.

4. **Open a separate Claude Code session** on any project.

5. **Paste the drop-in prompt** from the section above.

6. **Ask Claude to plan and import:**
   > "Create a milestone plan for this project and import it to TaskMan under project YOUR_PROJECT_NAME"

7. **Verify in TaskMan UI:**
   - [ ] Tasks appear in the correct project
   - [ ] Tags are created and linked
   - [ ] Domains are linked (if domains matched)
   - [ ] Dependencies appear in the task detail view
   - [ ] Warnings are reported for unmatched domains

## Future: MCP Server

This REST endpoint is designed to become the backing implementation for an MCP (Model Context Protocol) `import_milestones` tool:

- **Eliminates env vars** — Claude calls the tool natively via MCP, no curl needed
- **Bidirectional** — MCP could also expose `list_projects`, `list_tasks`, `update_task` as tools, letting Claude read task status and update progress
- **Richer integration** — Claude could check existing tasks before importing to avoid duplicates, update statuses as work progresses, and close tasks when done
- **Composable** — Other AI tools (Cursor, Windsurf, etc.) could use the same MCP server
