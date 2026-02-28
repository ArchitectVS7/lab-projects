# UAT: Calendar Feed Sync

## Overview

iCal calendar feed that allows users to subscribe to their TaskMan tasks in external calendar apps. Tasks with due dates appear as all-day events.

The feed URL is **permanent** — it stays the same across page reloads, browser sessions, and server restarts. It only changes if you explicitly click "Regenerate URL".

## Prerequisites

- A TaskMan account with at least one project containing tasks with due dates
- Access to a calendar app (iOS Calendar, Google Calendar, or Outlook)

## Local vs Production URLs

Calendar apps require **HTTPS** to subscribe. In local development, the backend runs on `http://localhost:4000` (HTTP), so macOS Calendar will refuse to subscribe directly.

**The right workflow:**
- For production use: deploy TaskMan to Railway (HTTPS is automatic). Generate your feed URL in the production app — it will be `https://...` and macOS Calendar will accept it immediately.
- If you need to test locally with macOS Calendar: set `CALENDAR_PUBLIC_URL=https://your-railway-app.up.railway.app` in `backend/.env`. Feed URLs generated locally will point to the Railway backend (requires production DB to match).

There is no workaround needed in production. The HTTPS issue is specific to `localhost`.

---

## Test Cases

### TC-1: Generate Feed URL on Profile Page

1. Navigate to Profile Settings
2. Scroll to the "Calendar Sync" card
3. Click "Generate Feed URL"
4. **Expected**: A long URL is displayed in a read-only input field containing `/api/calendar/feed.ics?token=...`

### TC-2: Feed URL Persists Across Sessions

1. Generate a feed URL (TC-1)
2. Copy the URL, then navigate away (or reload the page)
3. Return to Profile Settings → Calendar Sync
4. **Expected**: The same feed URL is displayed again — no need to regenerate

### TC-3: Copy Feed URL

1. After generating (or returning to) a feed URL, click the "Copy" button
2. Paste the URL into a text editor
3. **Expected**: The full feed URL is on the clipboard and matches the displayed URL

### TC-4: Subscribe in macOS Calendar

1. Copy the feed URL (must be HTTPS — see Local vs Production section above)
2. Open the **Calendar** app on macOS
3. File > New Calendar Subscription…
4. Paste the URL → click Subscribe
5. Set refresh interval (e.g. Every 15 minutes) → click OK
6. **Expected**: Subscription appears in macOS Calendar and automatically syncs to iPhone via iCloud within a few minutes

### TC-5: Subscribe in iOS Calendar (without Mac)

1. On the Profile page, click the **QR** button next to the feed URL
2. Point your iPhone camera at the QR code — tap the "Subscribe to Calendar" banner
3. Tap Subscribe in the confirmation sheet
4. **Expected**: Calendar subscribes successfully, events appear within minutes

### TC-6: Subscribe in Google Calendar

1. Copy the feed URL
2. Go to Google Calendar > Settings (gear icon) > Add calendar > From URL
3. Paste the feed URL
4. Click "Add calendar"
5. **Expected**: Calendar appears in the left sidebar; events show up (Google may take up to 12 hours to refresh)

### TC-7: Subscribe in Outlook

1. Copy the feed URL
2. Go to Outlook Calendar > Add calendar > Subscribe from web
3. Paste the feed URL, give it a name
4. Click Import
5. **Expected**: Calendar subscription is added, events appear

### TC-8: Verify Event Content

1. Subscribe to the feed in any calendar app
2. Open one of the imported events
3. **Expected**:
   - Title matches the task title
   - Event is marked as all-day on the task's due date
   - Description includes: task description, project name, priority, status

### TC-9: Regenerate Token (Old URL Invalidated)

1. On Profile page, click "Regenerate URL" then "Confirm"
2. **Expected**: A new feed URL is displayed (different token)
3. Try to access the old URL in a browser
4. **Expected**: Returns 401 / error (old token no longer valid)
5. Subscribe with the new URL and update any existing calendar subscriptions

### TC-10: Revoke Token

1. On Profile page, click "Revoke" then "Confirm"
2. **Expected**: Calendar Sync card shows "Generate Feed URL" button again
3. Try to access the old feed URL in a browser
4. **Expected**: Returns 401 / error

### TC-11: Include Completed Tasks

1. Generate a feed URL
2. Open the feed URL in a browser — note completed tasks are absent
3. Append `&includeDone=true` to the URL
4. Open in browser again
5. **Expected**: Completed (DONE) tasks now appear as events

### TC-12: Tasks Without Due Date Are Excluded

1. Create a task in TaskMan without setting a due date
2. Open the feed URL in a browser
3. **Expected**: The task without a due date does not appear as a VEVENT in the feed

### TC-13: QR Code Subscription (Phone without Mac)

1. Generate a feed URL on the Profile page
2. Click the **QR** button — a QR code appears below the URL input
3. Point an iPhone or Android camera at the QR code
4. **Expected on iOS**: A "Subscribe to Calendar" banner appears — tap it to subscribe without typing the URL
5. **Expected on Android**: Google Chrome opens the `.ics` URL; calendar app is offered to handle the subscription
6. Click **QR** again to dismiss the code
7. **Expected**: QR code disappears
