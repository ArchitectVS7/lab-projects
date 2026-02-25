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

**This is worth keeping and completing.** The open question is what the "external agent" actually is and who operates it (see Discussion below).

---

### 2. Task Decomposition Assistant

**Use case:** User enters a high-level goal — "Launch the marketing site for Product X" — and an AI assistant breaks it into concrete sub-tasks, proposes assignments, due dates, and dependencies. The user reviews the proposed task tree and approves or edits it before anything is committed to the database.

Key design constraints:
- The AI must present a plan for **approval before writing** — no tasks are created automatically
- The result should populate the existing task creation flow, not bypass it
- The decomposition should respect the current project structure (members, roles)

This would likely surface as a modal or side panel triggered from the "New Task" flow: a "Help me break this down" button that opens a conversation, produces a proposed task list, and feeds it into the bulk-create API on approval.

---

### 3. Task-Level Chat Assistant

**Use case:** On any open task, the user can open a chat panel and ask questions like:
- "What should I do first on this?"
- "Help me think through an alternate approach"
- "This is blocked — what are my options?"

The AI has context: the task title, description, status, assignee, due date, dependencies, and recent comments. It does not take actions — it only advises. The user decides what (if anything) to do next.

This would likely live as a new tab in the `TaskDetailModal` alongside Comments, Activity, and Files.

---

## Discussion Required

### Should we build an orchestrator?

**The concern:** Building a reliable AI orchestrator — one that actually executes multi-step tasks, manages retries, handles partial failures, and produces safe outputs — is a significant product in itself. It is not a feature; it is a platform. Getting into that business would pull focus from TaskMan's core value.

**The alternative view:** We don't need to build an orchestrator. The handoff model already separates concerns cleanly:
- TaskMan owns the queue, status tracking, and UI
- The AI worker is an external service — could be a Claude API call wrapped in a small function, a third-party automation (Zapier, Make, n8n), or a future dedicated service
- TaskMan only needs to fire the webhook and trust the callback

**Tentative position:** We do not build an orchestrator. We make TaskMan an excellent **delegation target and status consumer**. Any AI that can receive a webhook and call a REST endpoint can integrate. This keeps the surface area small and the system composable.

### What is the right AI for Use Cases 2 and 3?

Both the decomposition assistant and the task chat would call an LLM directly from the backend (Claude API). The key questions:

- **Where does the API key live?** Backend environment variable — never exposed to the frontend.
- **What is the context window?** For task chat, the task object + last N comments is manageable. For decomposition, the project member list and existing task titles would also be useful context.
- **Do we stream responses?** Streaming would make the chat feel responsive. The backend would need a streaming endpoint (SSE or chunked response); the frontend would render incrementally.
- **Do we store conversations?** For task chat, storing the conversation in the database (similar to comments) would be valuable for audit and continuity. For decomposition, the conversation only matters until the user approves or discards — ephemeral is fine.

### Scope and priority

| Feature | Complexity | Value | Readiness |
|---|---|---|---|
| Handoff + status signal (complete existing infra) | Low | High | Infrastructure exists |
| Task decomposition assistant | Medium | High | Needs design + API integration |
| Task-level chat | Medium | High | Needs design + API integration |
| Full orchestrator | Very High | Uncertain | Not recommended |

---

## Proposed Next Steps (not yet scheduled)

1. **Decision meeting:** Confirm we are not building an orchestrator. Decide whether the "external agent" for handoff will be a first-party Claude integration or a third-party hook.
2. **Design spike:** Wireframe the task decomposition flow — specifically the approval step. How does the user edit the proposed task list before committing?
3. **Design spike:** Wireframe the task chat panel. Does it live in `TaskDetailModal`? Is it a floating assistant? Does it need its own route?
4. **API key management:** Decide where the Anthropic API key is configured (env var, per-user setting, or org-level setting).
5. **Implementation:** Once designs are approved, implement in order: task chat (simpler, self-contained) → task decomposition (more complex approval flow).
