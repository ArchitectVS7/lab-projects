TaskMan Commercialization Plan

 Context

 TaskMan is a feature-rich task management app (Express/Prisma/React) deployed on Railway. The
 user wants to explore publishing it as a commercial product. This plan covers market positioning,
  feature strategy, realistic cost forecasting, and pricing tiers. Decisions here affect
 architecture (auth, rate limiting, AI integration, abuse prevention) so they need to be made
 before further development.

 Target: Solo creators/freelancers first, growing into small teams.
 AI strategy: Haiku-powered intelligence on free tier; Sonnet/Opus autonomous agents for Pro.
 Domain: .app TLD (e.g., taskman.app).

 ---
 Part A — Competitive Landscape & Positioning

 The market we're entering

 ┌────────────┬───────────────────┬──────────────┬────────────────────┬──────────────────────┐
 │ Competitor │     Free tier     │  Cheapest    │        AI?         │    Gamification?     │
 │            │                   │     paid     │                    │                      │
 ├────────────┼───────────────────┼──────────────┼────────────────────┼──────────────────────┤
 │            │ 5 projects, no    │              │ Yes — Ramble       │                      │
 │ Todoist    │ reminders         │ $5/mo Pro    │ voice, task        │ Minimal              │
 │            │                   │              │ breakdown          │                      │
 ├────────────┼───────────────────┼──────────────┼────────────────────┼──────────────────────┤
 │ TickTick   │ 9 lists, 99       │ $2.80/mo     │ No                 │ Yes — Pomodoro,      │
 │            │ tasks/list        │ annual       │                    │ streaks, stamps      │
 ├────────────┼───────────────────┼──────────────┼────────────────────┼──────────────────────┤
 │ ClickUp    │ Unlimited tasks & │ $7/user/mo   │ Yes — Brain ($7-28 │ No                   │
 │            │  members          │              │  add-on)           │                      │
 ├────────────┼───────────────────┼──────────────┼────────────────────┼──────────────────────┤
 │ Notion     │ Unlimited pages   │ $10/mo Plus  │ Yes — Agents       │ No                   │
 │            │ (solo)            │              │ ($20/mo tier)      │                      │
 ├────────────┼───────────────────┼──────────────┼────────────────────┼──────────────────────┤
 │ Linear     │ 250 issues,       │ $10/user/mo  │ Yes — triage,      │ No                   │
 │            │ unlimited members │              │ semantic search    │                      │
 ├────────────┼───────────────────┼──────────────┼────────────────────┼──────────────────────┤
 │ Things 3   │ N/A (paid only)   │ $10-50       │ No                 │ No                   │
 │            │                   │ one-time     │                    │                      │
 ├────────────┼───────────────────┼──────────────┼────────────────────┼──────────────────────┤
 │ Trello     │ 10 boards         │ $5/mo        │ No                 │ No                   │
 │            │                   │ Standard     │                    │                      │
 └────────────┴───────────────────┴──────────────┴────────────────────┴──────────────────────┘

 What users expect for free (non-negotiable)

 - Unlimited tasks and projects (ClickUp proved this works)
 - Basic collaboration (at least 1-3 collaborators)
 - List + Kanban views
 - Cross-device sync
 - Due dates, priorities, basic notifications
 - Calendar view (increasingly baseline)

 What causes immediate churn

 - Paywalling basic features (reminders, calendar view)
 - Limiting # of tasks or projects on free tier
 - Steep onboarding / too many clicks for daily use
 - The "double entry problem" — app feels like extra work on top of existing tools

 TaskMan's genuine differentiators (what nobody else has together)

 1. Domains — User-defined life/work areas (Coding, Health, Marketing) that organize ALL features.
  No competitor offers this.
 2. Daily check-ins + energy tracking — "Pick 3 priorities, rate your energy, select focus
 domains." Not available in Todoist, ClickUp, or Notion.
 3. Focus mode — Distraction-free top-3 task interface. Things 3 has simplicity; TaskMan has
 intentional focus.
 4. Gamification tied to real behavior — XP/levels/streaks powered by check-ins, focus time, and
 domain consistency. Not arbitrary points for clicking buttons.
 5. AI agents that actually execute — Not just suggestions. Research, write, analyze — delegated
 from a task with one click.
 6. Critical path visualization — Force-directed dependency graph with bottleneck detection.
 Typically enterprise-only (Asana Advanced $25/user/mo).

 Positioning statement

 TaskMan: The task manager that knows what matters today.
 Daily check-ins, life domains, focus mode, and AI agents — designed for creators who juggle
 multiple areas of life, not just work.

 ---
 Part B — Gamification Strategy (Making It Matter)

 Current state

 ┌──────────────────────┬────────────┬────────────────────────────────────────────────────────┐
 │       Feature        │   Status   │                        Verdict                         │
 ├──────────────────────┼────────────┼────────────────────────────────────────────────────────┤
 │ XP on task           │ Wired up   │ Functional but arbitrary — any task = same XP feels    │
 │ completion           │            │ hollow                                                 │
 ├──────────────────────┼────────────┼────────────────────────────────────────────────────────┤
 │ Levels               │ Wired up   │ Works but no unlocks/rewards tied to levels            │
 ├──────────────────────┼────────────┼────────────────────────────────────────────────────────┤
 │ Streaks (check-in)   │ Wired up   │ Good foundation — daily check-in streaks are genuine   │
 │                      │            │ behavior                                               │
 ├──────────────────────┼────────────┼────────────────────────────────────────────────────────┤
 │ Achievements         │ Schema     │ 0 achievements defined. Completely dormant             │
 │                      │ only       │                                                        │
 ├──────────────────────┼────────────┼────────────────────────────────────────────────────────┤
 │ Quests               │ Schema     │ No quest generation logic                              │
 │ (daily/weekly)       │ only       │                                                        │
 ├──────────────────────┼────────────┼────────────────────────────────────────────────────────┤
 │ Skills               │ Schema     │ No progression system                                  │
 │                      │ only       │                                                        │
 └──────────────────────┴────────────┴────────────────────────────────────────────────────────┘

 What to change (subtle but meaningful)

 Principle: Gamification should reflect consistency and intentionality, not task-volume grinding.

 1. Domain streaks (new) — "7-day Coding streak" means you completed at least 1 task in that
 domain every day for a week. This is specific, earned, and meaningful.
 2. Weighted XP — HIGH priority = 3x XP, URGENT = 5x, overdue tasks completed = bonus. Discourages
  splitting easy tasks for points.
 3. Achievements that mark real milestones — First check-in, 7-day streak, 30-day streak, 100
 tasks completed, first delegation, first dependency resolved, all domains active in one day. ~20
 achievements, each with an icon and description.
 4. Weekly recap (the "Wrapped" model) — End-of-week email/dashboard: domains worked, energy
 patterns, velocity vs last week, top achievement. Linear does daily summaries; TaskMan does
 reflection-oriented weeklies.
 5. Streak protection (already schematized) — Allow 1 missed day per streak without breaking it.
 Prevents anxiety-driven usage.

 What NOT to do:
 - No leaderboards (creates toxic competition for solo users)
 - No XP for creating tasks (perverse incentive to spam)
 - No level-gated features (feels punishing)

 ---
 Part C — Cost Forecast

 Fixed monthly costs (regardless of user count)

 ┌─────────────────────────────────────┬────────────┬────────────────────────────────────┐
 │                Item                 │    Cost    │               Notes                │
 ├─────────────────────────────────────┼────────────┼────────────────────────────────────┤
 │ Domain (.app)                       │ $1.25/mo   │ ~$15/year via Cloudflare Registrar │
 ├─────────────────────────────────────┼────────────┼────────────────────────────────────┤
 │ Railway minimum (backend + DB idle) │ $15-20/mo  │ Hobby plan; services idle at night │
 ├─────────────────────────────────────┼────────────┼────────────────────────────────────┤
 │ Resend (free tier)                  │ $0         │ 3,000 emails/month, 100/day cap    │
 ├─────────────────────────────────────┼────────────┼────────────────────────────────────┤
 │ Baseline                            │ ~$17-22/mo │                                    │
 └─────────────────────────────────────┴────────────┴────────────────────────────────────┘

 Variable costs per user tier

 ┌───────────────────────┬───────────┬─────────────┬──────────────────────────────────────────┐
 │       Component       │   Free    │ Pro user/mo │                  Notes                   │
 │                       │  user/mo  │             │                                          │
 ├───────────────────────┼───────────┼─────────────┼──────────────────────────────────────────┤
 │ Railway compute       │ $0.02     │ $0.05       │ Amortized CPU/RAM per request            │
 │ (marginal)            │           │             │                                          │
 ├───────────────────────┼───────────┼─────────────┼──────────────────────────────────────────┤
 │ Resend emails         │ $0.003    │ $0.007      │ ~5-10 emails/user/month (digests,        │
 │                       │           │             │ notifications, resets)                   │
 ├───────────────────────┼───────────┼─────────────┼──────────────────────────────────────────┤
 │ Claude Haiku (smart   │ $0.001    │ $0.001      │ Suggestions, NL filters, check-in        │
 │ features)             │           │             │ insights                                 │
 ├───────────────────────┼───────────┼─────────────┼──────────────────────────────────────────┤
 │ Claude Sonnet         │ —         │ $0.05-0.20  │ ~5-15 agent delegations/month, ~2K       │
 │ (agents)              │           │             │ tokens each                              │
 ├───────────────────────┼───────────┼─────────────┼──────────────────────────────────────────┤
 │ Per-user marginal     │ ~$0.02    │ ~$0.11-0.26 │                                          │
 │ cost                  │           │             │                                          │
 └───────────────────────┴───────────┴─────────────┴──────────────────────────────────────────┘

 Total monthly cost by scale

 ┌──────────────┬────────────────┬─────────┬────────┬────────────┬────────┬───────┬───────────┐
 │ Active users │ Free:Pro ratio │ Railway │ Resend │ Claude API │ Domain │ Total │ Cost/user │
 ├──────────────┼────────────────┼─────────┼────────┼────────────┼────────┼───────┼───────────┤
 │ 10           │ 10:0           │ $20     │ $0     │ $0         │ $1.25  │ $21   │ $2.10     │
 ├──────────────┼────────────────┼─────────┼────────┼────────────┼────────┼───────┼───────────┤
 │ 25           │ 22:3           │ $22     │ $0     │ $0.05      │ $1.25  │ $23   │ $0.93     │
 ├──────────────┼────────────────┼─────────┼────────┼────────────┼────────┼───────┼───────────┤
 │ 50           │ 42:8           │ $25     │ $0     │ $0.50      │ $1.25  │ $27   │ $0.54     │
 ├──────────────┼────────────────┼─────────┼────────┼────────────┼────────┼───────┼───────────┤
 │ 100          │ 80:20          │ $30     │ $0     │ $3.00      │ $1.25  │ $34   │ $0.34     │
 ├──────────────┼────────────────┼─────────┼────────┼────────────┼────────┼───────┼───────────┤
 │ 250          │ 200:50         │ $38     │ $20*   │ $8.00      │ $1.25  │ $67   │ $0.27     │
 ├──────────────┼────────────────┼─────────┼────────┼────────────┼────────┼───────┼───────────┤
 │ 500          │ 400:100        │ $50     │ $20    │ $16        │ $1.25  │ $87   │ $0.17     │
 ├──────────────┼────────────────┼─────────┼────────┼────────────┼────────┼───────┼───────────┤
 │ 1,000        │ 800:200        │ $65     │ $20    │ $32        │ $1.25  │ $118  │ $0.12     │
 └──────────────┴────────────────┴─────────┴────────┴────────────┴────────┴───────┴───────────┘

 Resend jumps to $20/mo Pro plan once you exceed 3,000 emails/month (~250+ active users sending
 notifications).

 Key insight: Costs scale very gently. Even at 1,000 users, total infrastructure is ~$118/month.
 The AI API cost (Claude) is the largest variable but still modest — Sonnet agent calls at
 ~$0.15/user/month for Pro users.

 ---
 Part D — Pricing & Packaging

 Tier structure

 Free (Solo)

 $0/forever — the wedge that gets users in the door.

 Includes:
 - Unlimited tasks, projects, tags, custom fields
 - Domains (5 default + create your own)
 - Daily check-ins + energy tracking
 - Focus mode
 - Gamification (XP, levels, streaks, achievements)
 - Calendar view + iCal sync
 - Basic AI (Haiku-powered): task breakdown suggestions, NL search, daily check-in insights
 - 1 project collaborator (view-only)
 - Activity logs (30 days)

 Does NOT include:
 - AI agent delegation
 - Team collaboration (>1 collaborator with edit rights)
 - API keys / webhooks
 - File attachments
 - Weekly recap emails
 - Priority support

 Rationale: Generous enough that solo users never feel squeezed. The free tier IS the product for
 individuals. Conversion comes from wanting team features or AI agents, not from hitting
 artificial walls.

 Pro (Creator)

 $8/month ($6/month annual = $72/year billed annually, 25% savings)

 Everything in Free, plus:
 - AI agent delegation — delegate tasks to Research, Writing, Code, Analytics, Social Media,
 Outreach agents (Sonnet-powered, 50 delegations/month)
 - Unlimited collaborators with full RBAC (Owner/Admin/Member/Viewer)
 - File attachments (100 MB/project)
 - Webhooks + API keys (5 each)
 - Weekly recap emails (domain-based reflection summaries)
 - Activity logs (unlimited history)
 - Export (CSV/JSON)
 - Priority email support

 Rationale: $8/mo is in the TickTick-to-Notion sweet spot. The AI agents are the clear value
 driver — ClickUp charges $7-28/user/month just for Brain. We bundle it in.

 Team

 $6/user/month ($5/user/month annual, minimum 3 seats)

 Everything in Pro, plus:
 - Creator dashboard (per-member velocity, delegation ratio, bottleneck detection)
 - Dependency graph + critical path visualization
 - 200 AI delegations/month per team (shared pool)
 - Webhooks + API keys (25 each)
 - File attachments (500 MB/project)
 - Admin controls (manage team members, audit logs)

 Rationale: Per-seat pricing aligns with market norms (Linear $10, Asana $11). $6/user undercuts
 everyone while offering AI agents they charge extra for. Minimum 3 seats = $18/mo floor.

 Revenue forecast

 ┌───────┬──────┬──────────┬────────────────┬────────┬───────┬─────────┐
 │ Users │ Free │ Pro ($8) │ Team ($6/user) │  MRR   │ Costs │ Margin  │
 ├───────┼──────┼──────────┼────────────────┼────────┼───────┼─────────┤
 │ 10    │ 10   │ 0        │ 0              │ $0     │ $21   │ -$21    │
 ├───────┼──────┼──────────┼────────────────┼────────┼───────┼─────────┤
 │ 25    │ 20   │ 5        │ 0              │ $40    │ $23   │ +$17    │
 ├───────┼──────┼──────────┼────────────────┼────────┼───────┼─────────┤
 │ 50    │ 38   │ 10       │ 2 (×3 seats)   │ $116   │ $27   │ +$89    │
 ├───────┼──────┼──────────┼────────────────┼────────┼───────┼─────────┤
 │ 100   │ 72   │ 20       │ 8 (×3 avg)     │ $304   │ $34   │ +$270   │
 ├───────┼──────┼──────────┼────────────────┼────────┼───────┼─────────┤
 │ 250   │ 180  │ 45       │ 25 (×4 avg)    │ $960   │ $67   │ +$893   │
 ├───────┼──────┼──────────┼────────────────┼────────┼───────┼─────────┤
 │ 500   │ 360  │ 90       │ 50 (×4 avg)    │ $1,920 │ $87   │ +$1,833 │
 ├───────┼──────┼──────────┼────────────────┼────────┼───────┼─────────┤
 │ 1,000 │ 700  │ 180      │ 120 (×4 avg)   │ $4,320 │ $118  │ +$4,202 │
 └───────┴──────┴──────────┴────────────────┴────────┴───────┴─────────┘

 Assumptions: ~15-20% free→paid conversion (aggressive but achievable with genuine AI value). Team
  seats average 3-4 per team account.

 Break-even: ~15 Pro users ($120 MRR) covers all fixed costs. Achievable within first 1-2 months
 of marketing.

 ---
 Part E — Abuse Prevention (Free Tier Exploitation)

 Threat: users chaining free accounts via email changes

 Tier 1 — Free (implement now):
 - IP address + User-Agent hash stored on registration
 - Flag accounts sharing fingerprints with recently deleted/banned accounts
 - Rate limit account creation per IP (3/day)
 - Email domain allowlist (block disposable email providers: mailinator.com, guerrillamail.com,
 etc.)

 Tier 2 — Low-cost (implement when needed):
 - ThumbmarkJS (free, MIT licensed) for browser fingerprinting
 - Store fingerprint hash on registration; alert on collision with existing accounts
 - Require email verification before Pro trial activation

 Tier 3 — If abuse becomes real ($100+/mo):
 - FingerprintJS Pro for device-level identification
 - Only justified at 1,000+ users with measurable abuse

 Architecture decision: Add a registrationFingerprint field to the User model now (schema prep).
 Populate it with IP+UA hash initially. Swap to ThumbmarkJS later without migration.

 ---
 Part F — Implementation Priorities (What to Build Next)

 Given the commercialization goal, here's what to build in priority order:

 Phase 1 — Monetization Foundation (next sprint)

 1. Domain registration — buy taskman.app (or nearest available) via Cloudflare
 2. Resend setup — verify sender domain, wire up forgot-password emails
 3. Stripe integration — Pro plan checkout, subscription management, billing portal
 4. Plan enforcement middleware — check user's plan tier before allowing Pro/Team features
 5. Usage tracking — count AI delegations per billing cycle

 Phase 2 — AI Agents (the differentiator)

 6. Wire agent execution — integrate Claude API into AgentDelegation flow. On delegation create:
 queue → call Claude Sonnet with task context + instructions → store result → update status
 7. Agent rate limiting — 50 delegations/month for Pro, 200/team for Team
 8. Prompt injection protection — sanitize user instructions before passing to Claude; reject
 obvious injection patterns

 Phase 3 — Gamification Activation

 9. Define 20 achievements — seed Achievement table with milestone-based badges
 10. Achievement unlock logic — check conditions on task completion, check-in creation, streak
 updates
 11. Weighted XP — scale XP by priority (LOW=10, MEDIUM=25, HIGH=50, URGENT=100)
 12. Domain streaks — track per-domain daily task completion streaks
 13. Weekly recap — scheduled email summarizing domains, energy patterns, velocity

 Phase 4 — Abuse Prevention & Polish

 14. Registration fingerprinting — IP+UA hash on signup
 15. Disposable email blocking — reject known throwaway domains
 16. Email verification — require verification before Pro trial

 ---
 Verification / Next Steps

 After this plan is approved:
 1. Check domain availability for taskman.app and alternatives
 2. Set up Cloudflare Registrar account if not already done
 3. Begin Phase 1 implementation (Stripe is the critical path — no revenue without billing)
 4. Set Railway env vars for Resend (immediate: unblocks forgot-password emails)
