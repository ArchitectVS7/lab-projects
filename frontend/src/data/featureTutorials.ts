export interface TutorialStep {
  title: string;
  description: string;
  targetSelector?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export interface FeatureTutorial {
  featureId: string;
  routePattern: string;
  name: string;
  icon: string;
  tagline: string;
  steps: [TutorialStep, TutorialStep, TutorialStep, TutorialStep, TutorialStep];
}

export const featureTutorials: FeatureTutorial[] = [
  {
    featureId: 'dashboard',
    routePattern: '/',
    name: 'Dashboard',
    icon: '🏠',
    tagline: 'Your mission control — see everything at a glance and jump straight into today\'s work.',
    steps: [
      {
        title: 'Welcome to your Dashboard',
        description: 'This is your command center. At a glance, you\'ll see your active tasks, progress, and what needs attention today.',
        targetSelector: 'nav a[href="/"]',
        position: 'right',
      },
      {
        title: 'Progress Overview',
        description: 'The progress panel tracks tasks by status across all your projects, so you always know where things stand.',
        targetSelector: '[data-tour="progress-overview"]',
        position: 'bottom',
      },
      {
        title: 'Quick Actions',
        description: 'Create new tasks instantly from the dashboard without navigating away. Speed is everything.',
        targetSelector: '[data-tour="quick-create"]',
        position: 'bottom',
      },
      {
        title: 'Recent Activity',
        description: 'See what changed recently across your projects — updates, completions, and team activity all in one feed.',
        targetSelector: '[data-tour="activity-feed"]',
        position: 'left',
      },
      {
        title: 'Navigate with confidence',
        description: 'Every section in the sidebar has its own focused view. Explore them as you need them — they\'ll guide you along the way.',
        targetSelector: 'nav',
        position: 'right',
      },
    ],
  },
  {
    featureId: 'checkin',
    routePattern: '/checkin',
    name: 'Daily Check-in',
    icon: '📋',
    tagline: 'Start each day with intention — set priorities, check your energy, and clear any blockers.',
    steps: [
      {
        title: 'Daily Check-in',
        description: 'A 2-minute ritual to align your focus each morning. Studies show that planning your day increases completion rates by 35%.',
        targetSelector: 'nav a[href="/checkin"]',
        position: 'right',
      },
      {
        title: 'Set your priorities',
        description: 'Pick the top 3 things you need to accomplish today. Keeping it to 3 prevents overwhelm and sharpens focus.',
        targetSelector: '[data-tour="checkin-priorities"]',
        position: 'bottom',
      },
      {
        title: 'Energy level',
        description: 'Rate your energy so TaskMan can help you match task difficulty to how you feel — tough tasks when you\'re sharp, light tasks when you\'re tired.',
        targetSelector: '[data-tour="checkin-energy"]',
        position: 'bottom',
      },
      {
        title: 'Blockers',
        description: 'Flag anything that\'s blocking your progress. Naming blockers is the first step to removing them.',
        targetSelector: '[data-tour="checkin-blockers"]',
        position: 'top',
      },
      {
        title: 'Focus domains',
        description: 'Choose which life areas you\'re focusing on today — work, personal projects, health, learning. Boundaries help you stay intentional.',
        targetSelector: '[data-tour="checkin-domains"]',
        position: 'top',
      },
    ],
  },
  {
    featureId: 'tasks',
    routePattern: '/tasks',
    name: 'Tasks',
    icon: '✅',
    tagline: 'Your unified task list — filter, sort, and act on work across every project you own.',
    steps: [
      {
        title: 'All your tasks, one place',
        description: 'The Tasks view shows everything assigned to you or created by you, regardless of project. One list to rule them all.',
        targetSelector: 'nav a[href="/tasks"]',
        position: 'right',
      },
      {
        title: 'Filter and search',
        description: 'Use filters to slice by status, priority, project, or due date. Find exactly what needs attention right now.',
        targetSelector: '[data-tour="task-filters"]',
        position: 'bottom',
      },
      {
        title: 'Quick status updates',
        description: 'Click a task\'s status badge to cycle it through Todo → In Progress → Done without opening the full detail view.',
        targetSelector: '[data-tour="task-list"]',
        position: 'bottom',
      },
      {
        title: 'Bulk actions',
        description: 'Select multiple tasks with the checkbox and apply status, priority, or assignment changes in one shot.',
        targetSelector: '[data-tour="task-bulk"]',
        position: 'top',
      },
      {
        title: 'Keyboard shortcuts',
        description: 'Press N to create a new task, F to open filters, and ? for the full shortcuts reference. You\'ll be flying in no time.',
        targetSelector: '[data-tour="task-filters"]',
        position: 'bottom',
      },
    ],
  },
  {
    featureId: 'projects',
    routePattern: '/projects',
    name: 'Projects',
    icon: '📁',
    tagline: 'Organize work into projects, invite collaborators, and track progress toward shared goals.',
    steps: [
      {
        title: 'Projects are your workspaces',
        description: 'A project groups related tasks together. Think of it as a folder that also tracks progress, team members, and timelines.',
        targetSelector: 'nav a[href="/projects"]',
        position: 'right',
      },
      {
        title: 'Create a project',
        description: 'Hit the "New Project" button to get started. Give it a name, description, and optionally a due date to track toward.',
        targetSelector: '[data-tour="new-project-btn"]',
        position: 'bottom',
      },
      {
        title: 'Project views',
        description: 'Each project has Board, List, and Calendar views. Switch between them to see work from different angles — Kanban for flow, List for detail, Calendar for timing.',
        targetSelector: '[data-tour="project-card"]',
        position: 'bottom',
      },
      {
        title: 'Team members',
        description: 'Invite team members to a project and assign roles: Owner, Admin, Member, or Viewer. Permissions cascade automatically.',
        targetSelector: '[data-tour="project-card"]',
        position: 'right',
      },
      {
        title: 'Project health at a glance',
        description: 'The progress bar on each card shows task completion percentage. You know immediately which projects need attention.',
        targetSelector: '[data-tour="project-card"]',
        position: 'top',
      },
    ],
  },
  {
    featureId: 'calendar',
    routePattern: '/calendar',
    name: 'Calendar',
    icon: '📅',
    tagline: 'See all your tasks and deadlines on a timeline — plan ahead and spot scheduling conflicts instantly.',
    steps: [
      {
        title: 'Your work on a timeline',
        description: 'The Calendar view maps all tasks with due dates onto a monthly (or weekly) calendar. See what\'s coming up before it sneaks up on you.',
        targetSelector: 'nav a[href="/calendar"]',
        position: 'right',
      },
      {
        title: 'Navigate time',
        description: 'Use the prev/next arrows to move between months, or click "Today" to snap back to now. The mini-calendar on the side lets you jump anywhere.',
        targetSelector: '[data-tour="calendar-nav"]',
        position: 'bottom',
      },
      {
        title: 'Click a task to edit',
        description: 'Click any task chip on the calendar to open its full detail view. You can change the due date right from there.',
        targetSelector: '[data-tour="calendar-grid"]',
        position: 'bottom',
      },
      {
        title: 'Drag to reschedule',
        description: 'Drag a task chip to a different day to reschedule it instantly. No forms, no clicks — just drag.',
        targetSelector: '[data-tour="calendar-grid"]',
        position: 'top',
      },
      {
        title: 'Color coding',
        description: 'Task chips are color-coded by priority — red for urgent, orange for high, blue for normal. Scan your week and know instantly where to focus.',
        targetSelector: '[data-tour="calendar-grid"]',
        position: 'left',
      },
    ],
  },
  {
    featureId: 'focus',
    routePattern: '/focus',
    name: 'Focus Mode',
    icon: '🎯',
    tagline: 'Eliminate distraction and go deep — one task, a timer, and nothing else.',
    steps: [
      {
        title: 'Enter the zone',
        description: 'Focus Mode hides all navigation and shows one task at a time. It\'s designed to help you get into deep work without friction.',
        targetSelector: 'nav a[href="/focus"]',
        position: 'right',
      },
      {
        title: 'Pick your task',
        description: 'Choose a task to focus on from your queue. TaskMan surfaces tasks by priority and due date to help you choose wisely.',
        targetSelector: '[data-tour="focus-task-picker"]',
        position: 'bottom',
      },
      {
        title: 'Pomodoro timer',
        description: 'The built-in timer defaults to 25-minute Pomodoro sessions. Work until the bell, then take a short break. Repeat.',
        targetSelector: '[data-tour="focus-timer"]',
        position: 'bottom',
      },
      {
        title: 'Session notes',
        description: 'Jot down what you accomplished, what was hard, and what to tackle next. These notes attach to the task automatically.',
        targetSelector: '[data-tour="focus-notes"]',
        position: 'top',
      },
      {
        title: 'Flow state tracking',
        description: 'After a session, rate your focus quality. Over time, patterns emerge — you\'ll learn when you do your best work.',
        targetSelector: '[data-tour="focus-rating"]',
        position: 'top',
      },
    ],
  },
  {
    featureId: 'agents',
    routePattern: '/agents',
    name: 'Agent Queue',
    icon: '⚡',
    tagline: 'Delegate tasks to AI agents and watch them work — autonomous task execution, built right in.',
    steps: [
      {
        title: 'AI-powered delegation',
        description: 'The Agent Queue lets you assign tasks to AI agents that execute them autonomously. Think of it as a team member that never sleeps.',
        targetSelector: 'nav a[href="/agents"]',
        position: 'right',
      },
      {
        title: 'Queue a delegation',
        description: 'Select a task and click "Delegate to Agent." Describe what you want done and the agent will take it from there.',
        targetSelector: '[data-tour="agent-queue-list"]',
        position: 'bottom',
      },
      {
        title: 'Real-time status',
        description: 'Watch delegations move through QUEUED → IN_PROGRESS → COMPLETED in real time via WebSocket. No need to refresh.',
        targetSelector: '[data-tour="agent-queue-list"]',
        position: 'bottom',
      },
      {
        title: 'Inspect results',
        description: 'Click any completed delegation to see exactly what the agent did, step by step. Full transparency into every action taken.',
        targetSelector: '[data-tour="agent-queue-list"]',
        position: 'top',
      },
      {
        title: 'Stay in control',
        description: 'You can pause, retry, or cancel any delegation at any time. Agents assist — you decide.',
        targetSelector: '[data-tour="agent-queue-list"]',
        position: 'top',
      },
    ],
  },
];
