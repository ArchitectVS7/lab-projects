# V0 Frontend Redesign Prompt — TaskMan

## What This App Is

TaskMan is a full-stack collaborative task management application. Think Linear meets Notion meets Todoist — a productivity tool for teams and individuals to organize work across projects with Kanban boards, calendar views, time tracking, gamification (XP/levels/achievements), real-time collaboration, and powerful filtering. It runs on React 18 + Vite + TypeScript + Tailwind CSS with a REST/WebSocket backend.

## Why a Redesign

The current UI is functional but visually generic. It looks like a Bootstrap-era CRUD app wearing a Tailwind skin. Flat white cards with gray borders, basic form selects for filters, no visual hierarchy or rhythm, no personality. The glassmorphism system exists in CSS but is barely used in practice. The gamification features (XP bars, level badges, celebrations) feel bolted on rather than integrated into the experience. The login/register pages are bare-bones centered card forms. The dashboard is a wall of identically-styled stat cards and task lists with no visual breathing room. The sidebar navigation is a plain vertical list. The table view is a standard HTML table. There's no craft here — no delightful micro-interactions, no considered typography scale, no spatial rhythm, no thoughtful use of color to create information hierarchy.

## Design Direction

Redesign TaskMan as a **premium, modern SaaS product** that feels like it belongs alongside Linear, Raycast, Arc Browser, and Vercel's dashboard. The aesthetic should be:

- **Refined and confident** — not flashy, not minimal to the point of sterile. Every element should feel intentional.
- **Dark-mode first** — the dark theme should be the hero. Rich charcoal backgrounds (not pure black), subtle gradients, thoughtful use of luminance to create depth. The light theme should be equally polished, not an afterthought.
- **Spatial rhythm** — consistent spacing scale, breathing room between sections, clear visual grouping. Use whitespace as a design element.
- **Typographic hierarchy** — a clear type scale with weight, size, and color contrast to create scannable layouts. Headers should have presence. Body text should be comfortable. Metadata should recede.
- **Color with purpose** — the primary accent color (configurable: indigo/purple/rose/emerald/amber) should be used sparingly for CTAs, active states, and key indicators. Status colors (gray/blue/yellow/green) and priority colors (gray/blue/orange/red) should be instantly recognizable but not overwhelming.
- **Subtle depth** — layered surfaces with soft shadows, subtle borders, and occasional blur effects. Not heavy glassmorphism — think frosted panels for modals and command palette, solid surfaces for cards and tables.
- **Micro-interactions that reward** — hover states that respond, smooth transitions between views, satisfying feedback on task completion, drag-and-drop that feels physical.

**Design references to channel**: Linear (information density + polish), Raycast (command palette + keyboard-first feel), Vercel Dashboard (typography + spacing), Stripe Dashboard (data presentation), Arc Browser (sidebar + spatial design).

---

## Pages to Redesign

### 1. Login & Register Pages
Currently: centered white card on gray background with basic form fields. No brand presence.

Redesign with:
- Split layout or full-bleed design with brand illustration/gradient on one side
- The TaskMan logo and tagline with visual impact
- Form fields with floating labels or clean outlined inputs
- Social-proof element (e.g., "Join 10,000+ teams" or animated task-completion counter)
- Smooth transition between login/register states
- Subtle background animation or gradient mesh

### 2. Main Layout (Sidebar + Content)
Currently: white sidebar (w-64) with icon+text nav items, user avatar at bottom, content area with basic padding.

Redesign with:
- **Sidebar**: Collapsible sidebar with a polished feel. Logo at top. Nav items with subtle hover/active indicators (left accent bar or background highlight). Group items into sections (Core: Dashboard/Tasks/Projects/Calendar, Tools: Focus/Dependencies, Settings: API Keys/Webhooks/Profile). User profile section at bottom with avatar, name, and level badge. XP progress bar integrated naturally, not crammed. Notification bell with unread dot. Keyboard shortcut hints (Cmd+K for command palette).
- **Content area**: Consistent page header pattern (title + description + action buttons right-aligned). Breadcrumbs where appropriate. Smooth page transitions.
- Support for minimal mode (collapsed to icon-only rail, ~56px wide) and full mode (~260px).

### 3. Dashboard Page
Currently: 4 stat cards in a row, then a 2-column grid of task lists and project cards. Flat, repetitive.

Redesign with:
- **Welcome header**: "Good morning, {name}" with date, or a motivational productivity message
- **Stats row**: 4 metric cards but with visual differentiation — use icon color, subtle background tints, and a spark line or progress indicator to give each stat context (e.g., "+3 from yesterday" or a tiny bar chart)
- **Activity/productivity section**: A compact heatmap or streak calendar (like GitHub contributions) showing daily task completion. Integrate the gamification naturally here — current level, XP to next level, current streak.
- **Recent tasks section**: Not just a plain list — show tasks as compact rows with status dot, priority indicator, project color tag, due date, and assignee avatar. Make it scannable.
- **Projects overview**: Cards with project color as accent, task count, member avatars (stacked), and a mini progress bar (% complete).
- **Quick actions**: Floating or inline quick-add for new tasks, a shortcut to focus mode.

### 4. Tasks Page (Table, Kanban, Calendar views)
Currently: view toggle pills, dropdown filters, HTML table with alternating rows. Kanban with basic columns. Calendar with a grid.

Redesign with:
- **View switcher**: Segmented control with icons, smooth animation between active states
- **Filter bar**: Pill-based active filters that are dismissible (click X). Filter dropdowns should be popovers, not native selects. Search input with Cmd+K hint.
- **Table view**: Modern data table with sticky header, subtle row hover, inline status/priority badges (not native selects — use custom styled dropdowns or click-to-cycle). Compact but readable. Column headers with sort indicators. Row selection with checkboxes for bulk actions.
- **Kanban view**: Columns with subtle background differentiation per status. Cards with clear visual hierarchy (title > project > priority > due date > assignee). Smooth drag with a slight lift/shadow effect. Column headers with task count badges. Empty column states.
- **Calendar view**: Clean month grid with task dots/pills on days. Click a day to see tasks in a popover. Drag tasks between days.
- **Task creation modal**: A polished modal or slide-over panel. Title input should be large and prominent (like Linear's). Form fields organized in logical groups. Support for the "smart input" (NLP quick-add) as an inline mode at the top.
- **Task detail view**: Could be a full slide-over panel (right side) instead of a modal, showing title, description (rich text), status/priority selectors, assignee picker with avatars, due date picker, project selector, tags, custom fields, dependency list, file attachments. Below that: tabbed view of Comments and Activity timeline.

### 5. Project Detail Page
Currently: project name header, member list, Kanban board.

Redesign with:
- Project header with color accent, description, member avatars (stacked with +N overflow), and action buttons (settings, invite)
- Tab navigation: Board | List | Calendar | Members | Settings
- Board view matching the Tasks page Kanban but scoped to this project
- Members section with role badges, invite functionality

### 6. Focus Page
Currently: full-screen mode with top 3 tasks, a progress bar, and a timer.

Redesign with:
- Immersive, distraction-free design. Dark background even in light mode, or a distinct "focus" color scheme.
- Large task title in the center with status controls
- Pomodoro timer with circular progress visualization
- Ambient mode indicator (subtle pulsing or breathing animation)
- Quick task switching between your top tasks
- Minimal chrome — just the essentials

### 7. Profile / Settings Page
Currently: tabs for Appearance, Achievements, Profile, Password.

Redesign with:
- Clean settings layout with sidebar navigation for sections
- Appearance settings: Live preview of theme changes. Color theme picker with visual swatches. Dark/light/system toggle with icons. Density picker with visual examples.
- Achievements: Card grid with locked/unlocked states, progress bars, rarity indicators
- Profile: Avatar upload area, form fields, save button

### 8. Gamification Elements (XP Bar, Level Badge, Celebrations)
Currently: small XP bar in sidebar, basic badge, canvas confetti on task completion.

Redesign with:
- **XP Bar**: Sleek progress bar with gradient fill matching the theme color. Show current XP / XP needed. Animate on XP gain with a subtle glow pulse.
- **Level Badge**: A polished badge that communicates progress. Different visual tiers (bronze/silver/gold/diamond style or numbered with increasing visual complexity).
- **Celebrations**: Task completion should trigger a satisfying micro-animation (checkmark animation, brief confetti burst, XP +number float-up). Level-up should be a brief modal celebration with the new level prominently displayed. Keep celebrations brief (1-2 seconds) and not annoying on repeat.
- **Streak indicator**: Show daily streak prominently (dashboard + sidebar) with a flame or streak icon.

### 9. Command Palette
Currently: basic command palette overlay.

Redesign with:
- Centered modal with backdrop blur (like Raycast/Linear)
- Search input at top with "Type a command or search..." placeholder
- Categorized results (Navigation, Tasks, Projects, Settings)
- Keyboard navigation with highlighted active item
- Recent commands section
- Smooth open/close animation

### 10. Empty States
Currently: SVG illustrations with centered text and CTA button.

Redesign with:
- Contextual illustrations that match the brand
- Clear, friendly copy
- Primary CTA button
- Optional secondary action or help link
- Subtle animation on enter

---

## Data Model Summary (for context)

**User**: name, email, avatar, XP, level, streak
**Project**: name, description, color, owner, members (with roles: OWNER/ADMIN/MEMBER/VIEWER)
**Task**: title, description, status (TODO/IN_PROGRESS/IN_REVIEW/DONE), priority (LOW/MEDIUM/HIGH/URGENT), dueDate, assignee, creator, project, tags, dependencies, recurring flag, custom fields, attachments, comments, time entries
**Comment**: content (markdown), author, parentId (threading), @mentions
**TimeEntry**: start/end times, duration, associated task
**Achievement**: name, description, icon, criteria, user unlocks
**Notification**: message, type, read status, link
**Tag**: name, color, project-scoped
**TaskDependency**: blocking/blocked-by relationships

---

## Technical Constraints

- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS v3.4 with `darkMode: 'class'`. Use Tailwind utilities. CSS variables for theme colors (`--primary`, `--primary-foreground`, `--ring`, `--primary-light`, `--primary-dark`).
- **Component library**: No external UI library (no shadcn, no Radix, no Headless UI). All components are custom-built. You may introduce shadcn/ui or Radix primitives if it significantly improves quality.
- **Icons**: lucide-react
- **State**: Zustand stores (auth, theme, layout, density, timer, toast, celebration, commandPalette, socket)
- **Data fetching**: @tanstack/react-query v5 with REST API
- **Animations**: framer-motion v12. Respect `animationIntensity` (normal/reduced/none) and `performanceMode` (balanced/performance/quality) user settings.
- **Drag & drop**: @dnd-kit for Kanban
- **Real-time**: socket.io-client
- **Routing**: React Router v6

---

## Component Inventory (existing, to be restyled)

These components exist and need visual redesign while maintaining their API/prop interfaces:

| Component | Purpose |
|-----------|---------|
| `Layout.tsx` | Main sidebar + content layout shell |
| `TaskCard.tsx` | Reusable task card (used in lists, kanban, dashboard) |
| `TaskDetailModal.tsx` | Full task detail modal with form + comments + activity |
| `KanbanColumn.tsx` | Kanban status column |
| `CalendarView.tsx` | Month calendar with task pills |
| `StatCard` (in DashboardPage) | Metric display card |
| `CommandPalette.tsx` | Cmd+K command palette |
| `ThemePicker.tsx` | Color theme selector |
| `ThemeToggle.tsx` | Dark/light/system toggle |
| `DensityPicker.tsx` | Spacing density selector |
| `NotificationCenter.tsx` | Bell icon + notification dropdown |
| `Toast.tsx` | Toast notification container |
| `TimerWidget.tsx` | Floating pomodoro timer |
| `XPBar.tsx` | XP progress bar |
| `LevelBadge.tsx` | Level display badge |
| `SmartTaskInput.tsx` | NLP-powered quick task input |
| `CommentList.tsx` / `CommentEditor.tsx` | Threaded comment system |
| `ActivityTimeline.tsx` | Task change history |
| `EmptyState.tsx` | Empty state illustrations |
| `Skeletons.tsx` | Loading skeleton placeholders |
| `SearchBar.tsx` | Search input |
| `Pagination.tsx` | Pagination controls |
| `TagPicker.tsx` | Tag selector |
| `DependencyPicker.tsx` / `DependencyList.tsx` | Task dependency management |
| `FileAttachments.tsx` | File upload/display |
| `RecurrencePickerModal.tsx` | Recurring task configuration |
| `AccessibilityControls.tsx` | High contrast / animation settings |
| `OnboardingModal.tsx` | First-time user onboarding |
| `GlassCard.tsx` | Glassmorphism card wrapper |
| `AnimatedButton.tsx` | Button with hover animation |
| `LoginPage.tsx` / `RegisterPage.tsx` | Auth pages |
| `DashboardPage.tsx` | Main dashboard |
| `TasksPage.tsx` | Multi-view task management |
| `ProjectDetailPage.tsx` | Single project view |
| `FocusPage.tsx` | Distraction-free focus mode |
| `ProfilePage.tsx` | User settings + achievements |

---

## Deliverables

For each page/component, produce:
1. The complete React + TypeScript + Tailwind component code
2. Both dark and light mode styles using Tailwind's `dark:` prefix
3. Responsive design (mobile-first, breakpoints at sm/md/lg/xl)
4. Framer Motion animations where appropriate (page transitions, modals, list items, hover states)
5. Accessible markup (proper ARIA attributes, keyboard navigation, focus management)

Start with the **Layout (sidebar + shell)**, **Dashboard Page**, **Tasks Page** (all three views), and **Login Page** — these are the highest-impact surfaces.
