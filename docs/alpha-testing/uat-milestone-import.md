# UAT: Milestone Import API

## Overview

The Milestone Import API lets you bulk-create tasks in TaskMan from any external tool — especially Claude Code sessions. You POST a batch of up to 100 milestones (with tags, domains, and dependencies) and they appear in the target project instantly.

Primary use case: start a Claude Code session on any project, paste the drop-in prompt, and tell Claude to import the plan.

## Prerequisites

- A TaskMan account (production or local)
- A project you own or are a MEMBER of
- An API key: **Settings → API Keys → Create Key** (requires PRO plan)
- `curl` and `jq` available in your terminal

## Environment Setup

```bash
export TASKMAN_API_KEY="taskman_..."
export TASKMAN_URL="https://your-app.up.railway.app"   # or http://localhost:4000
export TASKMAN_PROJECT="My Project Name"               # your project name
```

---

## Test Cases

### TC-1: Basic smoke test — single task import

```bash
curl -s -X POST "$TASKMAN_URL/api/import/milestones" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $TASKMAN_API_KEY" \
  -d '{
    "project": "'"$TASKMAN_PROJECT"'",
    "source": "uat-test",
    "milestones": [
      { "title": "UAT Smoke Test Task", "priority": "LOW" }
    ]
  }' | jq .
```

**Expected:** HTTP 201, `imported: 1`, `warnings: []`

Open TaskMan → your project → verify the task appears with priority LOW.

---

### TC-2: No auth returns 401

```bash
curl -s -o /dev/null -w "%{http_code}" -X POST "$TASKMAN_URL/api/import/milestones" \
  -H "Content-Type: application/json" \
  -d '{ "project": "'"$TASKMAN_PROJECT"'", "milestones": [{ "title": "Anon" }] }'
```

**Expected:** `401`

---

### TC-3: Invalid API key returns 401

```bash
curl -s -o /dev/null -w "%{http_code}" -X POST "$TASKMAN_URL/api/import/milestones" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: taskman_thisisnotavalidkey" \
  -d '{ "project": "'"$TASKMAN_PROJECT"'", "milestones": [{ "title": "Bad Key" }] }'
```

**Expected:** `401`

---

### TC-4: Empty milestones array returns 400

```bash
curl -s -o /dev/null -w "%{http_code}" -X POST "$TASKMAN_URL/api/import/milestones" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $TASKMAN_API_KEY" \
  -d '{ "project": "'"$TASKMAN_PROJECT"'", "milestones": [] }'
```

**Expected:** `400`

---

### TC-5: Invalid priority value returns 400

```bash
curl -s -o /dev/null -w "%{http_code}" -X POST "$TASKMAN_URL/api/import/milestones" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $TASKMAN_API_KEY" \
  -d '{ "project": "'"$TASKMAN_PROJECT"'", "milestones": [{ "title": "Bad Priority", "priority": "CRITICAL" }] }'
```

**Expected:** `400` (valid values: `LOW`, `MEDIUM`, `HIGH`, `URGENT`)

---

### TC-6: Invalid status value returns 400

```bash
curl -s -o /dev/null -w "%{http_code}" -X POST "$TASKMAN_URL/api/import/milestones" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $TASKMAN_API_KEY" \
  -d '{ "project": "'"$TASKMAN_PROJECT"'", "milestones": [{ "title": "Bad Status", "status": "BLOCKED" }] }'
```

**Expected:** `400` (valid values: `TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`)

---

### TC-7: Project lookup by name (case-insensitive)

```bash
# Use all-lowercase version of your project name
LOWER_NAME=$(echo "$TASKMAN_PROJECT" | tr '[:upper:]' '[:lower:]')

curl -s -X POST "$TASKMAN_URL/api/import/milestones" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $TASKMAN_API_KEY" \
  -d '{
    "project": "'"$LOWER_NAME"'",
    "milestones": [{ "title": "Case Insensitive Lookup" }]
  }' | jq .project.name
```

**Expected:** Returns your project's canonical name (original casing), `imported: 1`

---

### TC-8: Project lookup by UUID

Find your project's UUID in the TaskMan UI (URL bar on the project page, or from a previous import response), then:

```bash
curl -s -X POST "$TASKMAN_URL/api/import/milestones" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $TASKMAN_API_KEY" \
  -d '{
    "project": "YOUR-PROJECT-UUID-HERE",
    "milestones": [{ "title": "UUID Lookup" }]
  }' | jq .project
```

**Expected:** 201, project object contains the same UUID

---

### TC-9: Non-existent project returns 404

```bash
curl -s -o /dev/null -w "%{http_code}" -X POST "$TASKMAN_URL/api/import/milestones" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $TASKMAN_API_KEY" \
  -d '{ "project": "zzz-project-that-does-not-exist", "milestones": [{ "title": "Nope" }] }'
```

**Expected:** `404`

---

### TC-10: Tags auto-created and reused

```bash
curl -s -X POST "$TASKMAN_URL/api/import/milestones" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $TASKMAN_API_KEY" \
  -d '{
    "project": "'"$TASKMAN_PROJECT"'",
    "milestones": [
      { "title": "Tag Task Alpha", "tags": ["phase-1", "backend"] },
      { "title": "Tag Task Beta",  "tags": ["phase-1", "frontend"] }
    ]
  }' | jq .warnings
```

**Expected:** 201, `warnings: []`

In TaskMan UI: open one of the two created tasks. Verify `phase-1`, `backend` / `frontend` tags appear. Run the same import again — only one tag named `phase-1` should exist in the project (no duplicates).

---

### TC-11: Domain matching — valid domain

First, identify your domain names: **Profile → Life Areas** (or the Domains section). The defaults are: `Coding`, `Health`, `Finance`, `Learning`, `Personal`.

```bash
curl -s -X POST "$TASKMAN_URL/api/import/milestones" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $TASKMAN_API_KEY" \
  -d '{
    "project": "'"$TASKMAN_PROJECT"'",
    "milestones": [
      { "title": "Coding Domain Task", "domains": ["Coding"] }
    ]
  }' | jq .warnings
```

**Expected:** 201, `warnings: []`

Open the task in TaskMan → Life Areas chip/tag for "Coding" should appear.

---

### TC-12: Domain matching — unknown domain produces warning, not failure

```bash
curl -s -X POST "$TASKMAN_URL/api/import/milestones" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $TASKMAN_API_KEY" \
  -d '{
    "project": "'"$TASKMAN_PROJECT"'",
    "milestones": [
      { "title": "Unknown Domain Task", "domains": ["MadeUpDomain"] }
    ]
  }' | jq '{status: .imported, warnings: .warnings}'
```

**Expected:** 201, `imported: 1`, `warnings` array contains a message mentioning `"MadeUpDomain"`. The task is still created — domains are best-effort.

---

### TC-13: Dependencies wired within the batch

```bash
curl -s -X POST "$TASKMAN_URL/api/import/milestones" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $TASKMAN_API_KEY" \
  -d '{
    "project": "'"$TASKMAN_PROJECT"'",
    "milestones": [
      { "title": "Step 1 — Design" },
      { "title": "Step 2 — Build", "dependsOn": ["Step 1 — Design"] },
      { "title": "Step 3 — Ship",  "dependsOn": ["Step 2 — Build"] }
    ]
  }' | jq .warnings
```

**Expected:** 201, `warnings: []`, `imported: 3`

In TaskMan: open "Step 2 — Build" → **Dependencies** section shows "blocked by Step 1". Open "Step 3 — Ship" → blocked by "Step 2 — Build".

---

### TC-14: Missing dependency title produces warning, not failure

```bash
curl -s -X POST "$TASKMAN_URL/api/import/milestones" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $TASKMAN_API_KEY" \
  -d '{
    "project": "'"$TASKMAN_PROJECT"'",
    "milestones": [
      { "title": "Orphan Task", "dependsOn": ["Task That Does Not Exist"] }
    ]
  }' | jq .warnings
```

**Expected:** 201, task is created, `warnings` contains a message mentioning `"Task That Does Not Exist"`.

---

### TC-15: Bulk import — 5 tasks with mixed priorities

```bash
curl -s -X POST "$TASKMAN_URL/api/import/milestones" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $TASKMAN_API_KEY" \
  -d '{
    "project": "'"$TASKMAN_PROJECT"'",
    "source": "uat-bulk",
    "milestones": [
      { "title": "Bulk 1", "priority": "URGENT",  "status": "TODO" },
      { "title": "Bulk 2", "priority": "HIGH",    "status": "IN_PROGRESS" },
      { "title": "Bulk 3", "priority": "MEDIUM",  "status": "IN_REVIEW" },
      { "title": "Bulk 4", "priority": "LOW",     "status": "DONE" },
      { "title": "Bulk 5", "priority": "MEDIUM",  "dueDate": "2026-03-31T00:00:00.000Z" }
    ]
  }' | jq '{imported: .imported, source: .source}'
```

**Expected:** `imported: 5`, `source: "uat-bulk"`

In TaskMan: all five tasks visible. Bulk 2 shows IN_PROGRESS status; Bulk 4 shows DONE. Bulk 5 has due date March 31.

---

### TC-16: Response shape

Verify the full response structure is correct:

```bash
curl -s -X POST "$TASKMAN_URL/api/import/milestones" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $TASKMAN_API_KEY" \
  -d '{
    "project": "'"$TASKMAN_PROJECT"'",
    "source": "shape-check",
    "milestones": [{ "title": "Shape Check", "priority": "URGENT", "status": "TODO" }]
  }' | jq 'keys'
```

**Expected:** Response contains `["imported", "project", "source", "tasks", "warnings"]`

```bash
# Verify task object shape
... | jq '.tasks[0] | keys'
```

**Expected:** `["id", "priority", "status", "title"]`

---

## End-to-End: Claude Code Integration

This is the primary alpha use case — a real Claude Code session importing a project plan.

### Steps

1. Open a Claude Code session on any codebase or project.

2. Set env vars in the session's terminal:
   ```bash
   export TASKMAN_API_KEY="taskman_..."
   export TASKMAN_URL="https://your-app.up.railway.app"
   ```

3. Paste this drop-in prompt at the start of the conversation:

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

4. Ask Claude to plan something:
   > "Create a milestone plan for a new feature launch and import it to TaskMan under project YOUR_PROJECT_NAME"

5. Verify in TaskMan:
   - [ ] Tasks appear in the correct project
   - [ ] Tags are created and linked
   - [ ] Domains are linked (if Claude used valid domain names)
   - [ ] Dependencies appear in task detail view
   - [ ] Any unmatched domains are reported as warnings, not errors
   - [ ] The `source` field shows `"claude-code"` in the response

---

## Known Constraints

| Constraint | Detail |
|---|---|
| Max batch size | 100 milestones per request |
| Title length | 1–200 characters |
| Description length | Max 2000 characters |
| Tag name length | Max 50 characters |
| `dependsOn` lookup | Title-based, within the same batch only — cannot reference pre-existing tasks |
| Domain matching | Case-insensitive name match against the caller's own domains only |
| Auth | API key (PRO plan required) or cookie session |
| Permissions | OWNER, ADMIN, MEMBER can import; VIEWER gets 403 |
