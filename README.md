# ESP First Five — Builder's Guide

This is a complete, working website for the First Five Project. It's a Progressive Web App (PWA) — a regular website that can also be "installed" to the home screen on iPhones and Androids and behaves like a native app once it's there.

This README is written for somebody who has never built a website before. If you can copy a folder, drag and drop, and follow numbered steps, you can get this online in about twenty minutes.

---

## What you have in this folder

```
first-five-app/
├── index.html              ← Sign-in page (the URL members open)
├── signup.html              ← NEW — self-signup form for unlisted members
├── dashboard.html          ← Home screen after sign-in
├── tasks.html              ← Full list of all 15 tasks
├── task.html               ← Detail page for any single task
├── connect.html            ← Member directory + chat
├── profile.html            ← Member profile, stats, sign out
│
├── css/
│   └── styles.css          ← All visual styling (brand colors, fonts, layout)
│
├── js/
│   ├── config.js           ← NEW — paste your Apps Script URL here to go live
│   ├── data.js             ← Tasks, members, settings — your seed data
│   ├── api.js              ← NEW — talks to the Google Sheet backend
│   ├── app.js              ← Shared logic; auto-switches demo / live mode
│   └── proof.js            ← Signature pad, photo upload, quiz check
│
├── img/
│   ├── icon-192.png        ← Home-screen icon (small)
│   └── icon-512.png        ← Home-screen icon (large)
│
├── backend/                 ← NEW — the Google Apps Script + admin Sheet
│   ├── Code.gs              ← Server-side script (paste into Apps Script)
│   ├── admin-sheet-template.xlsx ← Upload this to Drive as your live Sheet
│   ├── build_admin_sheet.py ← How the template was built (reference only)
│   └── SETUP.md             ← 25-minute step-by-step backend setup
│
├── manifest.json           ← Tells phones it's installable
├── service-worker.js       ← Lets the app work even on flaky Wi-Fi
└── README.md               ← This file
```

The site has two modes:
- **Demo mode (default):** runs entirely on the user's device. Six demo emails work, progress saves locally. Useful for showing the board.
- **Live mode:** with the Apps Script backend wired up, members self-sign-up, all data lives in a shared Google Sheet, and admin staff watch a live progress dashboard during the conference.

To go live, follow `backend/SETUP.md` (about 25 minutes, no coding).

---

## Part 1 — See it work on your computer (5 minutes)

You need to serve these files through a tiny web server. Opening `index.html` directly in your browser by double-clicking will work for the basic layout but will break the service worker and a few other things.

### Option A: Mac

1. Open the **Terminal** app (Cmd+Space → type "terminal" → Enter).
2. Type `cd ` (with the space), then drag the `first-five-app` folder into the Terminal window. Press Enter.
3. Type this and press Enter:
   ```
   python3 -m http.server 8000
   ```
4. Open Chrome or Safari and go to **http://localhost:8000**

### Option B: Windows

1. Open **PowerShell** (Start menu → type "PowerShell" → Enter).
2. Type `cd ` (with the space), then paste the path to the `first-five-app` folder. Press Enter.
3. Type this and press Enter:
   ```
   python -m http.server 8000
   ```
   *(If you don't have Python, install it from python.org — takes 5 minutes.)*
4. Open Chrome or Edge and go to **http://localhost:8000**

### What you'll see

The sign-in page. Type one of the demo emails (it's printed on the page in light text):

- `tyrone@example.org`
- `marisol@example.org`
- `denzel@example.org`

Click Continue. You're now on the dashboard. Tap any task to try it. Tasks marked "Signature" let you draw with your mouse. Tasks marked "Photo" let you pick any image. Tasks marked "Quiz" ask a question (try task T05 — answer is "connection"; or T08, where any of "Chapter at Risk", "International Fellowship", "Professional Development Grant", "SIIL", or "Global Relations" will work).

When you're done playing, press **Ctrl+C** in the terminal to stop the server.

---

## Part 2 — Put it on the internet (15 minutes)

You have three good free options. Pick **Option A (Netlify)** if you've never done this — it's the simplest.

### Option A — Netlify (recommended for first-timers)

Netlify is a free service that hosts websites. They have a "drag and drop" deploy button that takes about thirty seconds.

1. Go to **https://app.netlify.com/drop** in your browser.
2. Sign up with email or your Google account.
3. Drag the entire `first-five-app` folder onto the big drop zone in the middle of the page.
4. Wait about ten seconds. Netlify will give you a URL like `https://random-words-12345.netlify.app`.
5. **You're live.** Open that URL on your phone. Sign in with one of the demo emails. The app works.

To use a real domain (like `firstfive.espnational.org`), click "Domain settings" in the Netlify dashboard. Netlify's docs are written for non-developers and walk you through DNS.

### Option B — GitHub Pages (free, slightly more setup)

If your organization already uses GitHub, this is the no-cost forever option.

1. Sign into github.com.
2. Click the green "+" button (top right) → "New repository".
3. Name it `first-five-app`. Make it public. Click "Create repository".
4. On the next screen, click "uploading an existing file".
5. Drag every file from your `first-five-app` folder into the upload area (you can drag them all at once).
6. Scroll down, click "Commit changes".
7. Click "Settings" (top of the repo page) → "Pages" (left sidebar).
8. Under "Source", choose "Deploy from a branch". Branch: `main`. Folder: `/ (root)`. Click Save.
9. Wait two or three minutes. Refresh that Pages page. You'll see a URL at the top.

### Option C — Vercel (similar to Netlify)

1. Go to **https://vercel.com**.
2. Sign up. Click "Add New" → "Project".
3. Drag the folder, or import from GitHub if you've done Option B.
4. Click "Deploy". Done.

### Which should you pick?

- **Conference is in 2 weeks, you've never done this:** Netlify.
- **You want to make tweaks daily and see them go live automatically:** GitHub Pages.
- **You want to grow this into the Phase 2 React build later:** Vercel pairs nicely with Next.js when you upgrade.

---

## Part 3 — Customizing for your conference (the part you'll actually do)

You'll probably want to change three things before sending the URL to members. All three are in plain text files you can edit in any text editor (TextEdit on Mac, Notepad on Windows, or download VS Code for free at code.visualstudio.com — recommended).

### 3a. Update the task list

Open `js/data.js`. The `FF_TASKS` list at the top is your fifteen tasks. Each task is a JavaScript object with these fields:

```javascript
{ id: "T01",                                 // unique ID, never change once live
  name: "Attend the First-Timer's Welcome",  // shown on the task card
  category: "Conference Anchor",             // one of six categories
  proof: "Signature",                        // "Signature", "Photo", or "Quiz"
  points: 3,                                 // integer, usually 2-4
  where: "Main Hall · Day 1, 9:00 AM",       // location/timing
  mission: "Article XI – Creed: ...",        // shown in the mission card
  description: "Open the welcome session...",// full description on detail page
  icon: "✍️" }                               // emoji shown on the task card
```

Quiz tasks need an extra `quiz` field:

```javascript
{ ...
  proof: "Quiz",
  quiz: { q: "What was the keynote theme?",
          a: ["connection"] }   // accepted answers (case-insensitive, fuzzy)
}
```

The `a` field is an array. Provide as many acceptable answers as you can think of — the app does fuzzy matching (typos and small variations work). An empty array `a: []` means "accept anything non-blank" — useful for reflection prompts.

### 3b. Update the member roster

You have two options:

**Option 1 — Live mode (recommended for an actual conference).** Follow `backend/SETUP.md` to wire up the Google Sheet backend. Then paste your member CSV directly into the **Members** tab of the Sheet, and members can also self-sign-up via a form. The seed list in `data.js` is only used as a fallback when the backend is unreachable.

**Option 2 — Demo / closed-roster mode.** Still in `js/data.js`, edit the `FF_MEMBERS` list. Each member is:

```javascript
{ email: "tyrone@example.org",
  name: "Tyrone Gentry",
  chapter: "Texas Alpha",
  year: 2,
  headline: "I'd love to talk to someone about: 4-H program design." }
```

Export your First Five member list as CSV from the ESP National portal, then convert. With a Google Sheets converter formula (assuming columns are A: name, B: email, C: chapter, D: year, E: headline):
```
="{ email: """ & B2 & """, name: """ & A2 & """, chapter: """ & C2 & """, year: " & D2 & ", headline: """ & E2 & """ },"
```
Drag down. Copy the column. Paste into `data.js` between the brackets.

### 3c. Update the conference settings

Same file, the `FF_SETTINGS` block at the bottom:

```javascript
window.FF_SETTINGS = {
  conferenceName: "ESP National Conference 2026",  // shown in the header
  conferenceStart: "2026-10-05",                    // ISO date format
  conferenceEnd: "2026-10-08",
  targetPoints: 20,
  bronze: 8,
  silver: 14,
  gold: 20,
  chatEnabled: true,
  moderationEmail: "membership@espnational.org",
};
```

Save the file. Re-deploy (drag the folder onto Netlify again, or `git push` if you used GitHub Pages). Done.

---

## Part 4 — How members use it

1. You email First Five members the URL (from Netlify, GitHub Pages, or Vercel).
2. They open it on their phone in Safari (iOS) or Chrome (Android).
3. They sign in with their email — the app checks it against the roster in `data.js`.
4. **iPhone users:** Safari menu → "Add to Home Screen". The app now has its own icon on their home screen and opens full-screen, with no browser bars.
5. **Android users:** Chrome menu → "Install app" or "Add to Home screen". Same effect.
6. They tap tasks throughout the conference. Their progress saves on their device.
7. At the closing ceremony, members reaching the Gold tier (20 pts) are recognized.

---

## Part 4.5 — Going live with the Google Sheet backend (NEW)

Out of the box the website runs in **demo mode** — anyone with one of the seed emails can sign in, and progress is stored on their device only. That's fine for showing the board.

When you want **self-signup**, **shared progress across devices**, and **a live admin spreadsheet** for staff to watch during the conference, follow `backend/SETUP.md`. It's a 25-minute, no-coding setup that gives you:

- A "Sign up here →" link on the sign-in page that creates new members on the fly.
- Every task completion writes a row to a shared Google Sheet.
- A **Live Progress** tab on the Sheet that auto-recalculates with each member's name, chapter, tasks done, points, recognition tier, and last activity.
- A snapshot block at the top of Live Progress: total members, tasks completed, Bronze/Silver/Gold counts.
- Conditional formatting: tier cells colored, a heat-map on the points column.

What admin staff do during the conference: open the Sheet, click the **Live Progress** tab, leave it on a second monitor. It refreshes automatically as data flows in.

The website *automatically* switches between demo and live mode based on whether `js/config.js` has an `apiUrl` filled in. Nothing else changes — same code, same UI, same install instructions for members.

---

## Part 5 — What this build does NOT yet do (your year-one limits)

Even with the Google Sheet backend wired up, two limitations remain:

1. **Chat messages don't actually send anywhere.** They're stored locally for the demo. To make chat work between two real people, you need a real-time backend (cheapest path: Firebase Realtime Database, free tier covers conference-scale).
2. **Photos and signatures over ~200 KB don't reach the Sheet.** Smaller ones are stored as base64 strings in the Completions tab. For larger photos and proper retention, Phase 2 would add Firebase Storage or Cloudinary.

The good news: the data shape is designed so you can swap the Apps Script API for Firebase Cloud Functions in Phase 2 by changing about 50 lines in `js/api.js`. Nothing else has to move.

---

## Part 6 — Quick file-by-file reference

| File              | When you edit it                                        |
|-------------------|----------------------------------------------------------|
| `js/data.js`      | Adding tasks, updating roster, changing conference dates |
| `css/styles.css`  | Tweaking colors, fonts, spacing                          |
| `index.html`      | Changing sign-in copy or removing the demo email hint    |
| `dashboard.html`  | Reordering home-screen sections                          |
| `tasks.html`      | Changing the all-tasks view                              |
| `task.html`       | Changing the task-detail page                            |
| `connect.html`    | Changing chat or directory                               |
| `profile.html`    | Changing the profile / stats page                        |
| `js/app.js`       | Sign-in logic, points calc, navigation. Touch carefully. |
| `js/proof.js`     | Signature pad, photo flow, quiz logic.                   |
| `manifest.json`   | App name, theme color, home-screen icons.                |
| `service-worker.js` | Offline caching. Bump `CACHE_VERSION` when shipping a new release. |

---

## Part 7 — Troubleshooting

**"The page is blank"** — Open the browser's developer console (Right-click → Inspect → Console). The error message will tell you which file and line. Most often it's a typo in `data.js` (missing comma, mismatched quotes).

**"My changes to data.js aren't showing up"** — The service worker cached the old version. In `service-worker.js` change `CACHE_VERSION = "ff-v1"` to `"ff-v2"` and re-deploy. (Also: in Chrome, open DevTools → Application tab → Service Workers → Unregister, then refresh.)

**"My members say their progress disappeared"** — They cleared their browser data, or signed in on a different device, or used "Private Browsing" mode. This is the limitation noted in Part 5. Phase 2 (with a real backend) fixes it.

**"The signature pad doesn't accept my signature on iPhone"** — Make sure they're using Safari, not an in-app browser (some email apps open links inside their own browser, which can break canvas touch events). Tell them to copy the URL and paste it into Safari.

**"I want to remove the demo emails from the sign-in page"** — Open `index.html`, find `Demo emails:` and delete that line.

---

## Part 8 — Going to Phase 2 (when you're ready)

The architecture here is deliberately swappable. When you commission the React/Firebase rebuild:

- The `FF_TASKS` shape ports directly to a Firestore `tasks` collection.
- The `FF_MEMBERS` shape ports directly to a Firestore `members` collection (with auth UID as the doc ID).
- The `FF.completedMap()` shape ports directly to a `completions` subcollection per member.
- The `proof.js` flows port mostly unchanged — just swap `FF.markCompleted` for a Firestore write and the canvas/photo `dataURL` for a Cloud Storage upload.

Hand this folder to your Phase 2 contractor and they'll have the working contracts in their hands on day one.

---

## Credits & license

Built for the Epsilon Sigma Phi Membership, Recruitment & Retention Committee.
Brand colors used per the ESP visual identity: Deep Blue `#1B365D`, Metallic Gold `#C9A961`, Action Orange `#E87722`.
Typography: Playfair Display + Roboto (both Google Fonts, free for any use).

Use, modify, and re-deploy freely within ESP. If you customize this for another professional association, please change the brand colors and reference your own organization in the manifest.

— End of guide.
