export interface GuideSection {
  id: string;
  title: string;
  content: string; // Markdown
}

export interface GuideChapter {
  id: string;
  title: string;
  icon: string;
  description: string;
  sections: GuideSection[];
}

export const userGuide: GuideChapter[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: '🚀',
    description: 'Set up your account and create your first project in minutes.',
    sections: [
      {
        id: 'first-login',
        title: 'Your First Login',
        content: `When you first open TaskMan, you'll be greeted with a sign-up screen. Create an account with your email and a password, and you're in. No complicated onboarding flows — just a clean dashboard ready for your first project.

Once you're logged in, take a moment to look around. The sidebar on the left is your main navigation hub. You'll find links to your Dashboard, Tasks, Calendar, Check-ins, and more. The top bar gives you quick access to search, notifications, and your profile settings.

If you ever feel lost, the **?** button in the bottom corner opens a contextual help panel that knows what page you're on and shows relevant tips.`,
      },
      {
        id: 'creating-a-project',
        title: 'Creating a Project',
        content: `Projects are the top-level containers for your work. Think of them as folders that group related tasks together — "Website Redesign", "Q1 Marketing", or "Personal Goals" are all good examples.

To create your first project, click the **+ New Project** button on the Dashboard or in the sidebar. Give it a name and an optional description. You can always rename it later.

Every project comes with its own task board, member list, and settings. If you're working solo, you're the Owner by default. If you want to collaborate, you can invite team members and assign them roles — more on that in the Projects chapter.`,
      },
      {
        id: 'first-task',
        title: 'Creating Your First Task',
        content: `With a project open, click **+ Add Task** or press **N** to create a new task. At minimum, give it a title — everything else is optional but helpful.

You can set a **priority** (Low, Medium, High, Urgent), assign it a **status** (Todo, In Progress, In Review, Done), pick a **due date**, and add a detailed description with Markdown formatting.

Tasks also support tags, assignees, time estimates, and custom fields. Don't worry about filling everything in right away — you can always come back and add details as the task evolves.`,
      },
      {
        id: 'navigating',
        title: 'Navigating the App',
        content: `TaskMan is organized around a few core pages that you'll visit often:

- **Dashboard** — Your home base with stats, recent tasks, and productivity insights
- **Tasks** — A filterable, sortable list of all tasks across your projects
- **Calendar** — A visual timeline of your scheduled work
- **Check-in** — Your daily planning ritual for setting priorities and energy levels
- **Agent Queue** — Where AI-delegated tasks live (more on this later)

The sidebar collapses on smaller screens. You can also toggle it manually for more workspace. Use keyboard shortcuts like **G then D** for Dashboard or **G then T** for Tasks to navigate quickly.`,
      },
    ],
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: '📊',
    description: 'Your home base for productivity insights and quick actions.',
    sections: [
      {
        id: 'productivity-insights',
        title: 'Productivity Insights',
        content: `The Dashboard is the first thing you see after logging in, and it's designed to give you a quick pulse on how things are going. The **Productivity Insight** card at the top summarizes your recent activity — tasks completed, streaks maintained, and trends over time.

This isn't about surveillance or pressure. It's a personal mirror that helps you notice patterns. Maybe you're most productive on Tuesdays, or maybe your completion rate dips when you take on too many tasks at once. The insight card surfaces these patterns so you can adjust your workflow.`,
      },
      {
        id: 'stat-tiles',
        title: 'Stat Tiles',
        content: `Below the insight card, you'll find a row of **stat tiles** — compact cards showing key numbers at a glance. These typically include your total tasks, tasks completed this week, overdue items, and current streak.

Each tile is clickable. Tapping on "Overdue" filters your task list to show only overdue items, so you can triage them immediately. The tiles update in real time as you complete tasks throughout the day.`,
      },
      {
        id: 'recent-tasks',
        title: 'Recent Tasks & Quick Actions',
        content: `The lower half of the Dashboard shows your **recent tasks** — the last few items you've created or updated. This is great for picking up where you left off without digging through your full task list.

You'll also find **quick action** buttons for common operations: create a new task, start a focus session, or open today's check-in. These shortcuts save you a click or two compared to navigating through the sidebar.

The Dashboard is fully responsive. On mobile, the stat tiles stack vertically and the quick actions become a compact toolbar at the bottom of the screen.`,
      },
    ],
  },
  {
    id: 'tasks',
    title: 'Tasks',
    icon: '✅',
    description: 'Create, organize, and track your tasks with powerful filters.',
    sections: [
      {
        id: 'create-edit',
        title: 'Creating & Editing Tasks',
        content: `You can create a task from almost anywhere in the app — the Dashboard, the task list, or even from the Calendar by clicking on a date. Every task belongs to a project, so make sure you've selected the right one.

When editing a task, click on its title to open the detail view. Here you can update the description (with full Markdown support), change the status, reassign it, adjust the due date, add tags, or link it to other tasks as dependencies.

Changes save automatically as you type. Other team members see updates in real time thanks to WebSocket sync — no need to refresh the page.`,
      },
      {
        id: 'status-priority',
        title: 'Status & Priority',
        content: `Tasks move through four statuses: **Todo**, **In Progress**, **In Review**, and **Done**. You can change status by clicking the status badge on any task, or by dragging tasks between columns on the board view.

Priority levels — **Low**, **Medium**, **High**, and **Urgent** — help you decide what to tackle first. Urgent tasks get a visual highlight so they stand out in any view. Combine status and priority filters to zero in on what matters most right now.`,
      },
      {
        id: 'filters-search',
        title: 'Filters & Search',
        content: `The task list comes with a powerful filter bar at the top. You can filter by status, priority, assignee, tags, due date range, and project. Filters combine with AND logic, so selecting "High priority" + "In Progress" shows only high-priority tasks that are currently being worked on.

The search box does a full-text search across task titles and descriptions. It's fast and updates results as you type. You can combine search with filters for laser-focused results — for example, search for "API" while filtering to "In Review" status.`,
      },
      {
        id: 'bulk-actions',
        title: 'Bulk Actions',
        content: `Need to update many tasks at once? Use **bulk actions**. Select multiple tasks using the checkboxes, then use the action bar that appears at the top to change their status, priority, assignee, or tags in one go.

Bulk actions are especially handy during weekly reviews when you need to re-prioritize or reassign a batch of tasks. You can also bulk-delete tasks, though you'll get a confirmation dialog first.`,
      },
      {
        id: 'keyboard-shortcuts',
        title: 'Keyboard Shortcuts',
        content: `TaskMan supports keyboard shortcuts for power users. Here are some you'll use often:

- **N** — New task
- **E** — Edit selected task
- **S** — Toggle status forward (Todo → In Progress → In Review → Done)
- **D** — Set due date
- **/** — Focus the search bar
- **?** — Open the help panel

When you're inside a task detail view, **Cmd+Enter** (or **Ctrl+Enter** on Windows) saves and closes the editor. These shortcuts make it possible to manage your tasks without ever touching the mouse.`,
      },
    ],
  },
  {
    id: 'projects',
    title: 'Projects',
    icon: '📁',
    description: 'Organize work into projects and collaborate with your team.',
    sections: [
      {
        id: 'creating-projects',
        title: 'Creating & Managing Projects',
        content: `Projects give structure to your work. Each project gets its own task list, board view, and settings. You can create as many projects as you need — one per client, one per life area, or however you prefer to organize.

To create a project, click **+ New Project** from the sidebar or Dashboard. You'll set a name, an optional description, and choose a color for visual distinction. Once created, the project appears in your sidebar for quick access.

You can archive projects when they're done. Archived projects and their tasks are hidden from your active views but never deleted — you can always bring them back.`,
      },
      {
        id: 'team-roles',
        title: 'Team Roles & Permissions',
        content: `When you invite someone to a project, you assign them a role that determines what they can do:

- **Owner** — Full control. Can delete the project, manage members, and change all settings.
- **Admin** — Can manage tasks, invite members, and change most settings. Can't delete the project.
- **Member** — Can create, edit, and complete tasks. Can comment and track time.
- **Viewer** — Read-only access. Can see tasks and comments but can't make changes.

You can change someone's role at any time from the project settings. If you're working solo, you don't need to worry about roles — you're the Owner by default.`,
      },
      {
        id: 'views',
        title: 'Board, List & Calendar Views',
        content: `Every project offers multiple ways to visualize your tasks:

- **Board view** — Kanban-style columns grouped by status. Drag tasks between columns to change their status. Great for visual thinkers and agile workflows.
- **List view** — A compact, sortable table. Best for scanning large numbers of tasks quickly and applying bulk actions.
- **Calendar view** — Tasks plotted on a calendar by due date. Ideal for deadline-driven planning.

Switch between views using the toggle buttons at the top of any project page. Your view preference is remembered per project, so your "Work" project can stay in board view while "Personal" stays in list view.`,
      },
    ],
  },
  {
    id: 'daily-checkin',
    title: 'Daily Check-in',
    icon: '☀️',
    description: 'Start your day with intention using the daily check-in ritual.',
    sections: [
      {
        id: 'why-checkin',
        title: 'Why Check In?',
        content: `The Daily Check-in is a short, structured ritual that helps you start each day with intention. Instead of opening your task list and feeling overwhelmed, you spend two minutes answering a few questions: What are my top priorities today? How's my energy level? What might block me?

This isn't busywork. Research shows that people who plan their day in advance are significantly more productive and less stressed. The check-in gives you a lightweight framework for that planning — no journals or complex systems required.

Over time, your check-in history becomes a valuable personal log. You can look back and see patterns in your energy, identify recurring blockers, and track how your priorities shift week to week.`,
      },
      {
        id: 'priorities-energy',
        title: 'Setting Priorities & Energy Level',
        content: `When you open the check-in page, you'll see a clean form with a few fields. The **priorities** field lets you jot down your top 1–3 goals for the day. Keep them specific and achievable — "Finish the login page" beats "Work on the app."

The **energy level** slider lets you rate how you're feeling on a 1–5 scale. This is private to you and helps you calibrate your expectations. On a low-energy day, maybe you tackle one big thing instead of three. On a high-energy day, you might take on that challenging refactor you've been putting off.`,
      },
      {
        id: 'blockers-domains',
        title: 'Blockers & Focus Domains',
        content: `The **blockers** field is where you note anything that might get in the way today — waiting on a code review, a meeting that'll eat up your afternoon, or a dependency that isn't ready yet. Writing blockers down makes them concrete and easier to address.

**Focus domains** let you tag your check-in with the areas of your life you plan to focus on — Coding, Marketing, Health, Learning, or whatever domains you've set up. This helps you track whether you're spending time on the things that matter most to you.

After submitting, your check-in appears on the Dashboard and feeds into your productivity insights.`,
      },
    ],
  },
  {
    id: 'calendar',
    title: 'Calendar',
    icon: '📅',
    description: 'Visualize your schedule and deadlines on a calendar view.',
    sections: [
      {
        id: 'navigation',
        title: 'Month & Week Navigation',
        content: `The Calendar page shows all your tasks with due dates plotted visually. You can switch between **month view** and **week view** using the toggle at the top right.

Month view gives you the big picture — great for spotting overloaded weeks or gaps in your schedule. Week view zooms in to show individual days in more detail, which is better for daily planning.

Navigate forward and backward using the arrow buttons, or click **Today** to jump back to the current date. The current day is always highlighted so you can orient yourself quickly.`,
      },
      {
        id: 'interactions',
        title: 'Click to Edit, Drag to Reschedule',
        content: `Clicking on any task in the calendar opens its detail view, just like in the task list. You can edit the title, change the status, or update the description right from there.

To reschedule a task, simply **drag it** from one date to another. The due date updates automatically. This makes the calendar a powerful planning tool — you can visually balance your workload by spreading tasks across the week.

If a date has more tasks than can fit in the cell, you'll see a "+N more" indicator. Click it to expand and see all tasks for that day.`,
      },
      {
        id: 'color-coding',
        title: 'Priority Color Coding',
        content: `Tasks on the calendar are color-coded by priority so you can scan for important items at a glance:

- **Red** — Urgent
- **Orange** — High
- **Blue** — Medium
- **Gray** — Low

Completed tasks appear with a strikethrough and faded color, so they stay visible but don't compete for your attention. This visual system makes it easy to spot days that are overloaded with high-priority work.`,
      },
    ],
  },
  {
    id: 'focus-mode',
    title: 'Focus Mode',
    icon: '🎯',
    description: 'Deep work sessions with a built-in Pomodoro timer.',
    sections: [
      {
        id: 'starting-session',
        title: 'Starting a Focus Session',
        content: `Focus Mode helps you block out distractions and concentrate on a single task. To start a session, open a task and click **Start Focus** — or use the focus button on the Dashboard.

When you enter Focus Mode, the interface simplifies. The sidebar collapses, notifications are muted, and a timer appears at the top of the screen. It's just you and your task.

You can set a target duration before starting, or leave it open-ended and stop when you're done. Either way, the time is automatically logged against the task.`,
      },
      {
        id: 'pomodoro',
        title: 'Pomodoro Timer',
        content: `If you like the Pomodoro technique, TaskMan has you covered. The built-in timer defaults to 25-minute work intervals with 5-minute breaks. After four intervals, you get a longer break.

The timer shows a visual countdown and plays a subtle sound when each interval ends. You can customize the work and break durations in your settings if the standard Pomodoro timing doesn't suit you.

During breaks, the app gently reminds you to stretch, hydrate, or look away from the screen. These micro-breaks are proven to reduce fatigue and improve sustained focus.`,
      },
      {
        id: 'session-notes',
        title: 'Session Notes & Flow Rating',
        content: `When you end a focus session, you'll see a brief wrap-up screen. Here you can jot down **session notes** — what you accomplished, where you got stuck, or what to pick up next time.

You can also rate your **flow state** on a simple scale. Were you in the zone, or did you struggle to concentrate? Over time, this data helps you understand when and how you do your best work.

All focus sessions are saved to the task's time log, so you always have a record of how much deep work went into each piece of work.`,
      },
    ],
  },
  {
    id: 'agent-queue',
    title: 'Agent Queue',
    icon: '🤖',
    description: 'Delegate tasks to AI agents and track their progress.',
    sections: [
      {
        id: 'delegating',
        title: 'Delegating to AI',
        content: `The Agent Queue is where you hand off tasks to AI. When you're looking at a task, click **Delegate to Agent** to send it to the queue. You'll write a brief instruction describing what you want the agent to do — think of it like giving directions to a capable assistant.

Delegated tasks move through a pipeline: **Queued** → **In Progress** → **Completed** (or **Failed**). You can watch the status update in real time from the Agent Queue page.

This feature is designed for tasks that can be clearly described and verified — drafting content, researching options, generating boilerplate, or analyzing data. The more specific your instructions, the better the results.`,
      },
      {
        id: 'watching-status',
        title: 'Watching Status & Progress',
        content: `The Agent Queue page shows all your delegated tasks in a clean list, sorted by status. Active tasks show a progress indicator and status badge that updates via WebSocket — no need to refresh.

You'll see when a task was queued, when the agent picked it up, and when it finished. If something goes wrong, the status changes to **Failed** with an explanation of what happened.

You can filter the queue by status to see only active work, completed results, or failed attempts that need your attention.`,
      },
      {
        id: 'inspecting-results',
        title: 'Inspecting Results & Staying in Control',
        content: `When an agent completes a task, the result appears in the task detail view. You can review it, edit it, and decide whether to accept or reject the work. Nothing is applied automatically — you're always in the loop.

If the result isn't quite right, you can re-delegate with updated instructions. Think of it as an iterative process: delegate, review, refine. The agent learns from your feedback within the session.

Remember: AI agents are tools, not replacements. They handle the grunt work so you can focus on the decisions that matter. Always review agent output before considering a task done.`,
      },
    ],
  },
  {
    id: 'collaboration',
    title: 'Collaboration',
    icon: '👥',
    description: 'Work together in real time with comments, mentions, and notifications.',
    sections: [
      {
        id: 'realtime',
        title: 'Real-Time Updates',
        content: `TaskMan uses WebSocket connections to keep everything in sync across all connected users. When someone updates a task, changes its status, or adds a comment, you see it instantly — no page refresh required.

This is especially useful during team standups or planning sessions where multiple people are updating tasks simultaneously. The board view shows changes as they happen, with smooth animations so nothing feels jarring.

Real-time sync also powers the notification system. When something relevant happens — a task assigned to you changes status, someone mentions you in a comment, or a deadline approaches — you get a notification badge in the top bar.`,
      },
      {
        id: 'comments',
        title: 'Comments & Threads',
        content: `Every task has a comment section at the bottom of its detail view. Comments support full **Markdown** formatting, so you can include code blocks, links, lists, and emphasis.

Comments can be **threaded** — reply to a specific comment to start a focused conversation without cluttering the main thread. This keeps discussions organized, especially on tasks with lots of activity.

New comments trigger notifications for the task's assignee and anyone who's previously commented. You can mute a task if the notifications become too noisy.`,
      },
      {
        id: 'mentions-notifications',
        title: '@Mentions & Notifications',
        content: `Type **@** followed by a team member's name in any comment to mention them. They'll receive a notification that links directly to your comment, so they can jump right in.

Mentions are a great way to ask questions, request reviews, or flag blockers for specific people. The mentioned person's name appears highlighted in the comment so it's easy to scan for.

The **notification bell** in the top bar shows your unread count. Click it to see all your notifications in a dropdown — mentions, assignments, status changes, and deadline reminders. You can mark them as read individually or clear them all at once.`,
      },
    ],
  },
  {
    id: 'customization',
    title: 'Customization',
    icon: '🎨',
    description: 'Make TaskMan yours with themes, density settings, and integrations.',
    sections: [
      {
        id: 'themes',
        title: 'Themes & Dark Mode',
        content: `TaskMan comes with a light theme and a dark theme. Switch between them using the theme toggle in the top bar or in your profile settings. The dark theme is carefully designed to reduce eye strain during late-night work sessions.

Your theme preference is saved to your profile, so it follows you across devices. The theme applies globally — every page, modal, and dropdown respects your choice.`,
      },
      {
        id: 'density',
        title: 'Density Settings',
        content: `Not everyone likes the same amount of whitespace. The **density** setting lets you choose between three layouts:

- **Comfortable** — Spacious, with generous padding and larger text. Great on big monitors.
- **Standard** — The default balance between readability and information density.
- **Compact** — Tighter spacing and smaller text. Shows more items on screen at once.

You'll find the density toggle in your profile settings. Try each one and see what feels right for your screen and workflow.`,
      },
      {
        id: 'animations',
        title: 'Animation Controls',
        content: `TaskMan uses subtle animations throughout the interface — page transitions, task status changes, drag-and-drop feedback, and more. If you prefer a snappier experience or have accessibility needs, you can reduce or disable animations.

The animation setting offers three levels: **Full**, **Reduced**, and **None**. Reduced animations keep essential motion cues (like drag feedback) while removing decorative transitions. None disables all animations for maximum performance.

TaskMan also respects your operating system's "reduce motion" preference automatically.`,
      },
      {
        id: 'api-keys',
        title: 'API Keys & Webhooks',
        content: `For power users and integrations, TaskMan offers **API keys** and **webhooks**. You can generate API keys from your profile settings — each key has a \`taskman_\` prefix and can be used to authenticate API requests via the \`X-API-Key\` header.

**Webhooks** let you send real-time notifications to external services whenever something happens in TaskMan. Set up a webhook URL, choose which events to listen for (task created, status changed, comment added, etc.), and TaskMan will POST a JSON payload to your endpoint.

API keys have their own rate limits to prevent abuse. You can revoke a key at any time from your settings page, and it takes effect immediately.`,
      },
    ],
  },
];
