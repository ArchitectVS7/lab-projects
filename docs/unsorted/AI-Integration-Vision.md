# AI Integration Vision

**Status: Future Feature — Discussion Required**
**Last updated: 2026-02-25**

---

## Current State

The Feb 2026 upgrade shipped an `AgentDelegation` model and the surrounding API infrastructure (`POST /api/agents/delegate`, `PUT /api/agents/:id/status`, webhook events, real-time socket updates, and the Agent Queue UI). This is the **job queue half** of an agentic system — it tracks delegations and provides a callback endpoint for an external agent to report status and results.

What does not exist yet: an actual AI worker. No agent reads the delegation, performs work, or calls back to the status endpoint. The feature is wired and waiting.

---

## What We Know We Want

### 1. Task Handoff + Completion Signal

The simplest and highest-value pattern: hand a task off to an external agent and get a status update when it is done (or failed).

The existing infrastructure supports this exactly:
- User delegates → webhook fires with task + instructions payload
- External agent does the work
- External agent calls `PUT /api/agents/:id/status` with an API key to report COMPLETED + result
- User sees the status change in real time

**This is worth keeping and completing.** The open question is what the "external agent" actually is (see Discussion below).

---

### 2. Task Decomposition Assistant

**Use case:** User is inside a **Project** and enters a high-level goal — "Launch the marketing site for Product X" — and an AI assistant breaks it into concrete sub-tasks, proposes assignments, due dates, and dependencies. The user reviews the proposed task tree and approves or edits it before anything is committed to the database.

**Where it lives:** Inside the Project dialog/page, not the generic task creation flow. Projects are always long-running and multi-task by nature (active development, shipped products needing marketing, content creation, music production, etc.), so decomposition belongs in that context.

**AI backend for this use case:** Native integration required — the AI needs to read the project's existing tasks and members, then write new tasks on approval. This means a configurable backend (see AI Backend section below).

Key design constraints:
- The AI presents a plan for **approval before writing** — no tasks are created automatically
- The user can add, remove, or edit proposed tasks in the approval screen before confirming
- The AI is given context: project name, existing tasks, team members
- On approval, tasks are created via the normal bulk-create path (same validation, same permissions)

---

### 3. Task-Level Chat Assistant

**Use case:** On any open task, the user can open a chat panel and ask questions like:
- "What should I do first on this?"
- "Help me think through an alternate approach"
- "This is blocked — what are my options?"

**Where it lives:** New tab in `TaskDetailModal` alongside Comments, Activity, and Files.

**AI backend for this use case:** Two modes, user-configurable:

**Mode A — Open in Claude (lightweight):**
A button that opens Claude.ai in a new tab with the task context pre-filled as the opening message. The conversation happens in the Claude.ai interface using the user's existing subscription. No API key required, benefits from Claude's session-based project memory, zero backend cost. Appropriate for open-ended advisory conversations.

**Mode B — Native chat (integrated):**
A chat panel inside TaskMan that calls the configured AI backend directly. Conversation history is stored in the database (see Memory Storage below). Appropriate when the user wants the conversation to stay inside TaskMan or wants the AI to take actions (e.g. update the task description based on the conversation).

The choice between modes can be a user preference setting.

---

## AI Backend — Configurable by Design

No single AI provider should be hardcoded. A settings screen (user-level or system-level) should let the operator choose:

| Backend | Cost model | Good for |
|---|---|---|
| Anthropic API (Claude) | Pay per token | Native integration, task decomposition |
| Open in Claude.ai | Flat subscription | Advisory chat, session memory |
| Ollama (local model) | Free, self-hosted | Privacy-sensitive environments |

For native integrations (decomposition, Mode B chat), the API key is stored as a backend environment variable — never exposed to the frontend. The frontend only knows which provider is active, not the key.

---

## Memory Storage for Task Chat

Storing conversation history in TaskMan's own database (like comments) is the right baseline. For enriched memory — summarization, semantic search across past conversations, facts that persist across tasks — an open-source memory layer is worth evaluating:

### [mem0](https://github.com/mem0ai/mem0) ⭐ Recommended starting point
- Node.js SDK with TypeScript support
- Can use SQLite locally or PostgreSQL (already in our stack)
- Integrates with Vercel AI SDK
- Simple API: `add`, `search`, `getAll` per user
- Self-hostable, no external service required

### [Zep](https://www.getzep.com/)
- TypeScript SDK
- Temporal knowledge graph — tracks how facts change over time
- More powerful for complex, long-running agent scenarios
- More infrastructure to operate than mem0
- Better fit if conversations become deeply cross-referenced

### Recommendation
Start with mem0 on PostgreSQL (no new infrastructure, same DB we already use). If conversations grow complex enough to need relationship modeling across tasks and projects, revisit Zep.

For the initial implementation, plain database storage (a `TaskChatMessage` model with `taskId`, `role`, `content`, `createdAt`) is sufficient and keeps the data in our schema without any new dependency. mem0 becomes relevant when we want semantic retrieval ("what did we decide about X last month?") rather than just chronological replay.

---

## What We Are Not Building

**We are not building an orchestrator.** An orchestrator that executes multi-step tasks, manages retries, handles tool calls, and produces reliable outputs is a platform in itself — not a feature. It would pull focus from TaskMan's core value.

TaskMan's role in the AI ecosystem is:
1. A **task context provider** — gives AI the richest possible view of what needs to be done
2. A **work queue** — tracks delegations and receives status callbacks
3. A **task writer** — AI proposes, human approves, TaskMan creates

The AI that does the actual work (for handoff scenarios) is an external service. Any agent that can receive a webhook and call a REST endpoint can integrate. This keeps the surface small and the system composable.

---

## Proposed Next Steps (not yet scheduled)

1. **Decision:** Confirm which handoff scenario to support first — a simple Claude API call wrapper, or a third-party automation hook (Zapier/Make/n8n).
2. **Design spike:** Approval screen for task decomposition inside the Project dialog. Specifically: how does the user edit the proposed task list? Inline editable rows? A separate confirmation modal?
3. **Settings design:** What does the AI backend configuration screen look like? Per-user or system-wide?
4. **Implementation order (suggested):**
   - Task chat Mode A (open in Claude.ai tab) — trivial, immediate value, no backend work
   - Task chat Mode B (native, stored history) — adds chat panel + `TaskChatMessage` model
   - Task decomposition — largest scope, requires approval UX design first
   - mem0 integration — add after native chat is working, when retrieval becomes useful
