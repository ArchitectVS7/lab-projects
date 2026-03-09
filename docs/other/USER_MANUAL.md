# TaskMan User Manual

Welcome to TaskMan. This manual walks you through everything the app can do — not as a list of checkboxes, but as an explanation of how things work and why they work that way. Whether you are just getting started or trying to get more out of a feature you have been ignoring, this is the right place.

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Tasks](#2-tasks)
3. [Projects and Collaboration](#3-projects-and-collaboration)
4. [Views: Kanban, Table, Calendar, and Week](#4-views-kanban-table-calendar-and-week)
5. [Focus Mode](#5-focus-mode)
6. [Daily Check-In](#6-daily-check-in)
7. [Domains](#7-domains)
8. [Calendar Sync](#8-calendar-sync)
9. [AI Agent Delegation](#9-ai-agent-delegation)
10. [Time Tracking](#10-time-tracking)
11. [Notifications and Comments](#11-notifications-and-comments)
12. [Gamification: XP, Levels, and Achievements](#12-gamification-xp-levels-and-achievements)
13. [API Keys and Webhooks](#13-api-keys-and-webhooks)
14. [Account and Preferences](#14-account-and-preferences)
15. [Plans and Billing](#15-plans-and-billing)

---

## 1. Getting Started

### Creating your account

Head to [taskman.app](https://taskman.app) and register with your email and a password. Your password must be at least eight characters long and include at least one uppercase letter, one lowercase letter, and one number. Once you have registered, you will land on your dashboard.

### The dashboard

The dashboard is your home base. It shows you a summary of what is open across all your projects, your current check-in streak, recent activity from your team, and an AI-generated summary of your productivity patterns. You do not need to do anything with the dashboard — it updates itself as you work. Think of it as a rearview mirror, not a steering wheel.

### Finding your way around

The left sidebar contains your main navigation. From top to bottom you will find links to Tasks, Projects, Calendar, Focus, Check-in, the Agent Queue, and your settings. On smaller screens the sidebar collapses into a menu icon at the top. Everything in the app is reachable within two clicks of the sidebar.

---

## 2. Tasks

Tasks are the core unit of work in TaskMan. Everything else — projects, check-ins, focus mode, agents — exists in service of helping you manage them.

### Creating a task

Click the **New Task** button anywhere in the Tasks section, or use the quick-add bar at the top of any task list. You can be as brief or as detailed as you like. A task needs only a title to be saved. Everything else — due date, priority, assignee, tags — can be filled in later.

TaskMan also supports natural language input in the quick-add bar. Typing "Finish report by Friday high priority" will automatically parse out the due date and priority. This is not magic — it works best with straightforward phrasing — but it is faster than clicking through fields.

### Task properties

Every task has a set of properties you can set:

**Status** describes where the task is in your workflow. The four statuses are *To Do*, *In Progress*, *In Review*, and *Done*. Moving a task to Done awards you XP and counts toward your completion streak.

**Priority** reflects how urgent or important the task is. You can choose between Low, Medium, High, and Urgent. Priority affects how tasks are ordered in Focus mode and how much XP you earn for completing them — finishing an Urgent task is worth ten times as much as finishing a Low-priority one.

**Due date** sets a deadline. Tasks past their due date are flagged and trigger an overdue notification. Tasks with no due date are still tracked — they simply will not appear in your calendar feed.

**Assignee** lets you assign a task to someone on your project team. They will be notified by the app.

**Tags** are short labels you can create and reuse across tasks within a project. They are useful for grouping related tasks — "bug", "Q2", "marketing" — without needing a separate project for each.

**Domains** let you connect a task to one of your life or work areas. This feeds into your check-in history and domain-specific streaks. Domains are explained further in [Section 7](#7-domains).

### Task descriptions and comments

Each task has a full description field that supports Markdown — meaning you can use bold and italic text, bullet lists, code blocks, and links. Below the description is the comments section, where you and your collaborators can discuss the task. Comments support @mentions: type `@` followed by someone's name to notify them. Comments are also Markdown-aware.

### Dependencies

Sometimes one task cannot start until another is finished. You can express this by adding a dependency between tasks — "Task B depends on Task A." TaskMan will track these relationships and can show you a visual map of how your tasks connect, which is covered in more detail in the Projects section.

### Recurring tasks

If a task needs to happen on a regular schedule, you can make it recurring. Setting a task to repeat daily, weekly, or monthly means TaskMan will automatically create a new instance of it when the current one is completed or when the scheduled date arrives. You can edit the recurrence rule at any time without losing existing instances.

### Custom fields

Pro and Team users can define custom fields at the project level — fields like "Severity," "Version," or "Sprint number" — and then fill in those values per task. Custom fields support text, numbers, dates, and dropdown selections. They appear in the task detail panel alongside the standard properties.

---

## 3. Projects and Collaboration

### What a project is

A project is a container for tasks that share a goal, a team, or a context. You might have one project per client, one per product area, or one for your personal life. There is no right answer. Projects are flexible enough to organize however your work naturally groups itself.

### Creating and managing projects

From the Projects page, click **New Project** and give it a name and an optional color. Once a project exists, you can set a description, manage members, and view all the tasks inside it.

### Inviting team members

To invite someone to a project, go to the project's Settings tab and enter their email address. They will receive a notification. When you add someone, you choose their role:

**Owner** has full control of the project and can do anything, including deleting it.

**Admin** can manage tasks and members but cannot delete the project.

**Member** can create and edit tasks, leave comments, and log time. They cannot manage other members.

**Viewer** can see everything in the project but cannot make changes. On the free plan, the single collaborator allowed is always a Viewer.

You can change a member's role or remove them at any time from the project settings.

### Activity log

Every significant change to a task in a project is recorded automatically — who changed what, from what to what, and when. You can see this history in the task's detail panel. On the free plan this log is retained for 30 days; Pro and Team users keep it indefinitely.

### Dependency graph

Team plan users have access to a visual dependency graph for their projects. It renders your tasks as nodes in a force-directed diagram, with lines connecting dependent tasks. The critical path — the longest unbroken chain of dependencies, which determines your project's minimum timeline — is highlighted in red. This makes it easy to see which tasks are genuinely blocking everything else and which ones have more flexibility.

---

## 4. Views: Kanban, Table, Calendar, and Week

TaskMan offers four ways to look at your tasks. These are not separate features — they are different lenses on the same data. Switching between them does not move or change your tasks.

### Kanban board

The Kanban board arranges tasks as cards in four columns, one per status. You can drag a card from one column to another to update its status. This view is good for understanding what is actively in flight. If a column gets crowded, that is often a signal that work is piling up at a particular stage.

### Table view

The table view shows tasks as rows in a sortable, filterable list. You can sort by any column — due date, priority, assignee, creation date — and filter by project, status, tag, or who a task is assigned to. If you need to do a bulk status update, you can select multiple rows and change their status in one action. The table view is best when you need to see a lot of tasks at once and compare them.

### Calendar view

The calendar view shows tasks with due dates positioned on a monthly calendar grid. It gives you a sense of how loaded any given week or day is, and lets you drag tasks to new dates directly on the calendar. Tasks without due dates do not appear here — this is by design, since the calendar's job is to show commitments that have a time anchor.

### Week view

The week view shows the current week with tasks laid out by day. It is narrower in scope than the monthly calendar but shows more detail per day. This is useful for day-to-day planning when you want to see exactly what is due this week without losing the weekday structure.

---

## 5. Focus Mode

Focus mode exists for one purpose: to show you what to work on right now and to get everything else out of your way.

Open Focus mode from the sidebar and you will see your top three tasks — the highest-priority, most time-sensitive work you have open. The order is calculated automatically: Urgent tasks come first, then High, then Medium, then Low. Within a priority tier, tasks due soonest appear first.

When you complete a task in Focus mode, a small celebration animation plays and your completion count for the day ticks up. You cannot edit tasks here, add new ones, or browse other projects. That is intentional. The screen gives you a completion button and nothing else.

Press Escape or click the exit button to return to the main app. Focus mode works best when you open it at the start of a work session, close the tab, and let it hold your intention while you work.

---

## 6. Daily Check-In

The check-in is a brief daily ritual you complete once each day, typically at the start of your morning or workday. It takes less than two minutes and serves two purposes: it helps you decide what matters today, and it gives TaskMan the context it needs to show you useful summaries and award streak bonuses.

### What the check-in asks you

**Today's priorities** — a free-text field where you write out one to three things you want to accomplish. This is not a task list — it is an intention. Many users find it useful to write this in plain English sentences rather than terse task titles.

**Energy level** — a 1-to-10 scale. This has no effect on your task data, but it is tracked over time. Patterns in your energy level over days or weeks can reveal things about your schedule you might not have noticed.

**Blockers** — an optional field for anything that is in your way. Naming a blocker explicitly, even just to yourself, often makes it easier to address or work around.

**Focus domains** — a selection of which of your life areas you are focusing on today. These are drawn from your domains (see Section 7). Picking them at the start of the day makes it easier to decide which tasks deserve attention.

### Streaks

Every time you complete a check-in, your streak count increases. Missing a day resets the streak to zero — but you are allowed one missed day per streak without penalty, thanks to a streak protection token. Use it wisely.

Your current streak and your all-time best streak are shown on the check-in page and on your dashboard. Maintaining a long check-in streak unlocks achievements and earns bonus XP.

---

## 7. Domains

Domains are the categories you use to organize your life and work in TaskMan. Unlike projects — which are about outputs, deliverables, and teams — domains are about areas of your life: the things you are always tending to, not just working toward.

When you first use TaskMan, five default domains are created for you: Coding, Marketing, Health, Writing, and Business. You can rename, recolor, or delete any of these, and you can create your own. Each domain gets a color and an emoji icon to make it visually distinct.

You connect domains to tasks in the task detail panel, and you select domains during your daily check-in. Over time, this creates a picture of how your energy and output are distributed across different areas of your life. If you spend two weeks completing tasks almost entirely in one domain, your domain streaks and your dashboard summaries will reflect that, which can prompt you to rebalance.

Domains are personal — they belong to you, not to a project or a team.

---

## 8. Calendar Sync

TaskMan can publish your tasks as a calendar feed that any calendar application can subscribe to. This means your due dates show up in Google Calendar, Apple Calendar, Outlook, or any other app that supports the iCal format — and they stay in sync automatically.

### Setting it up

Go to your **Profile** page and find the Calendar Sync section. Click **Generate Feed URL** to create your personal calendar token. You will see a URL and a QR code.

Copy the URL and paste it into your calendar application as a new subscribed calendar. In Google Calendar, this is under "Other calendars → From URL." In Apple Calendar, it is under "File → New Calendar Subscription." In Outlook, look for "Add calendar → Subscribe from web."

Your tasks with due dates will appear in the calendar as all-day events. The event description includes the task's priority, status, and project name so you have context at a glance.

### What appears and what does not

Only tasks with due dates appear in the feed. Tasks without due dates are excluded — there is no date to anchor them to. Completed tasks are also excluded by default. If you want to see completed tasks in your calendar, append `?includeDone=true` to your feed URL.

### Regenerating your token

If you share your feed URL and later want to revoke access, click **Regenerate Token** on the Profile page. This creates a new token and invalidates the old URL immediately. Any calendar app still subscribed to the old URL will stop receiving updates. You will need to re-subscribe with the new URL.

---

## 9. AI Agent Delegation

AI agent delegation lets you hand off a specific kind of work to an AI assistant and come back to the result when it is ready. It is available on Pro and Team plans.

### How it works

On any task card, you will see a lightning bolt (⚡) icon. Clicking it opens the delegation panel, where you choose what kind of agent to use and optionally add instructions. Hit delegate and the task enters a queue. The agent picks it up, works on it, and reports back. You can watch the status update in real time on the Agent Queue page, or simply come back later.

### The six agent types

**Research** is for gathering information. Give it a topic or a question, and it will return a structured summary.

**Writing** handles drafts — blog posts, documentation, proposal copy, or anything else that starts as a blank page.

**Social Media** creates platform-appropriate posts. Useful if you have a task like "announce the new feature" and want a starting point for LinkedIn, X, or similar.

**Code** can write functions, debug snippets, or sketch out implementations. It is not a replacement for a developer, but it can produce working first drafts for well-scoped tasks.

**Outreach** drafts emails, follow-ups, and messages for sales or networking contexts.

**Analytics** takes structured data and returns interpretations — trends, summaries, or observations based on what you provide.

### Adding instructions

When you delegate a task, you can include custom instructions in the delegation panel. The agent will receive both the task's title and description and your additional instructions. The more specific you are, the more useful the result will be. "Draft a 200-word introduction for a B2B landing page targeting HR managers" will produce a more immediately usable result than "write something for the website."

### The Agent Queue

The Agent Queue page (`/agents`) shows all delegations across your account — pending, in progress, completed, and failed. Each entry shows the task title, agent type, current status, and how long it has been running. You can delete any delegation from this view. If an agent fails, the failure is recorded and you can retry.

### Usage limits

Delegation usage resets at the start of each billing period. Pro plans include 50 delegations per month; Team plans include 200 shared across all team members. Your current usage and remaining quota are shown on the Billing page.

---

## 10. Time Tracking

If you want to log how long you spend on tasks, TaskMan includes a lightweight time tracker built into each task.

Open any task and you will see a timer widget. Hit **Start** when you begin working and **Stop** when you are done. The elapsed time is recorded as a time entry. You can also add time entries manually — useful if you forget to start the timer but want to log time you know you spent.

Each time entry has an optional description field where you can note what you were doing during that session.

Time tracking data is attached to the task. It does not currently roll up into billing reports or invoices, but it gives you a factual record of where your time went, which can inform estimates and planning over time.

---

## 11. Notifications and Comments

### Notifications

TaskMan sends you a notification when something relevant happens. Specifically:

- A task is assigned to you
- A task you own is due within 24 hours
- A task you own becomes overdue
- You are added to a project
- Someone comments on a task you are involved in
- Someone @mentions you in a comment
- A task's status changes on a project you belong to

Notifications appear in the bell icon in the navigation bar. You can mark them as read individually or all at once, and you can delete them when you no longer need them. Notifications are delivered in real time — if you have the app open, you will see them immediately.

### Comments

The comments section lives at the bottom of every task detail panel. Comments support Markdown formatting, so you can include bold text, bullet lists, code snippets, and links. Replies are threaded — hover over any comment to reply to it directly, keeping conversations organized.

To mention a teammate, type `@` and their name will appear in an autocomplete dropdown. Mentioning someone sends them a notification. This is the right way to flag something for a specific person rather than hoping they notice a task update on their own.

---

## 12. Gamification: XP, Levels, and Achievements

Work is more satisfying when progress is visible. TaskMan's gamification layer exists to make the accumulation of consistent effort feel concrete.

### XP and levels

Every time you complete a task, you earn experience points (XP). The amount depends on the task's priority:

- **Low priority** — 10 XP
- **Medium priority** — 25 XP
- **High priority** — 50 XP
- **Urgent priority** — 100 XP

XP accumulates toward your level. Levels increase as you cross XP thresholds, and your current level and progress bar are visible on your profile and dashboard. There is no practical limit to how high your level can go — it is a record of cumulative work, not a ladder with a top rung.

Completing your daily check-in also earns XP, as does maintaining streaks.

### Streaks

Your check-in streak tracks how many consecutive days you have completed the daily check-in. Domain streaks track how many consecutive days you have completed at least one task in a given domain. Both are displayed on your dashboard and profile.

Streaks are designed to encourage consistency without being punishing. If you miss a single day, your streak protection absorbs it and your streak is preserved. Each protection token is consumed when used, so they are not unlimited — but they give you room for a bad day.

### Achievements

Achievements are one-time unlocks that recognize specific milestones. They come in four rarity tiers — Common, Rare, Epic, and Legendary — and span categories like productivity, teamwork, exploration, and speed.

You can view your earned achievements and see which ones are still locked on your Profile page. Locked achievements show their unlock condition so you know what to work toward. Unlocking a higher-rarity achievement earns a larger XP bonus.

Achievements are awarded automatically — you do not need to claim them. When you hit the condition, a notification appears and the achievement is added to your profile.

---

## 13. API Keys and Webhooks

These features are available on Pro and Team plans. They are for connecting TaskMan to other tools you use.

### API keys

An API key lets external systems interact with your TaskMan account without requiring your password. You might use one to import tasks from another application, create tasks from a script, or read your task data for reporting purposes.

To create a key, go to **API Keys** in the sidebar. Give the key a name that describes its purpose, then copy the generated key. You will only see the full key once — TaskMan stores only a hashed version after creation. If you lose the key, you will need to delete it and create a new one.

Each key shows when it was last used, which helps you spot keys that are no longer active. You can revoke any key at any time without affecting others.

### Webhooks

Webhooks let you send real-time notifications from TaskMan to another service when something happens. For example, you could configure a webhook to call a Slack URL whenever a task is marked Done, or to update a spreadsheet whenever a task is created.

To add a webhook, go to **Webhooks** in the sidebar. Enter the URL you want TaskMan to call, and choose which events should trigger it: task created, task updated, task deleted, and others. When an event fires, TaskMan sends an HTTP POST request to your URL with a JSON payload describing the event.

The webhook log records every delivery attempt and its result. If a delivery fails, the log shows the error, which helps you debug your integration without needing to inspect TaskMan's internals.

---

## 14. Account and Preferences

### Changing your password

Go to your **Profile** page and find the Password section. You will need to enter your current password before setting a new one. If you have forgotten your current password, log out and use the **Forgot Password** link on the login screen — this will send a reset link to your email.

### Theme and appearance

TaskMan supports light mode, dark mode, and a system-automatic setting that follows your operating system's preference. You can change this on the Profile page. You can also choose an accent color and a density setting — Compact, Normal, or Spacious — which adjusts the spacing throughout the interface. Density is a matter of personal taste and screen size; Compact fits more on screen, Spacious is easier on the eyes for longer sessions.

### Calendar token management

Your iCal calendar token is managed on the Profile page. You can regenerate it here at any time. See [Section 8](#8-calendar-sync) for full details on calendar sync.

---

## 15. Plans and Billing

TaskMan offers three plans. The free plan is designed to be genuinely useful for individuals — it is not a crippled demo. The paid plans add features that are specifically useful for teams or for heavier workloads.

### Free

The free plan includes unlimited tasks and projects, all four views, daily check-in, focus mode, the full gamification system, calendar sync, and basic AI insights on your dashboard. You can add one view-only collaborator to your projects.

### Pro ($8/month, or $72/year)

Pro adds AI agent delegation (50 per month), unlimited collaborators with full role-based access, file attachments, API keys, webhooks, and unlimited activity log retention. It also includes weekly recap emails that summarize your productivity patterns by domain.

The annual plan works out to $6/month and is the better choice if you expect to use the app consistently.

### Team ($6/user/month, minimum 3 seats)

Team includes everything in Pro, with higher limits on delegations (200/month shared), API keys, webhooks, and storage. It adds the Creator Dashboard, which gives you a view of team velocity, AI delegation ratios, and workload distribution across members. It also enables the dependency graph visualization.

Team is designed for groups where more than one person is actively creating and delegating work, and where understanding the health of the whole team matters — not just your own output.

### Managing your subscription

Go to the **Billing** page to see your current plan, usage this period, and options to upgrade or manage your subscription. Upgrades take effect immediately. Downgrades take effect at the end of the current billing period. If you cancel a paid plan, you keep access until the period ends, then revert to the free plan.

Your usage counters — most importantly AI delegation usage — reset at the start of each billing period, not on a rolling 30-day window.

---

*This manual is updated as new features are released. If you notice something missing or inaccurate, use the in-app Help page or contact support.*
