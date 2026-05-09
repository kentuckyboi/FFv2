# Backend Setup — First Five Live Mode

This guide turns your local-only website into a live, multi-device app with self-signup and a shared admin spreadsheet that updates in real time.

**Time required:** about 25 minutes the first time. No coding — just clicking and copy-pasting.

**Cost:** $0. Everything runs on free Google services tied to a Google Workspace or personal Google account.

---

## What you're building

```
   ┌──────────────────────┐         ┌────────────────────────┐
   │  Member's phone      │         │  Google Sheet (you)    │
   │  (your website)      │ ◀────▶  │  Members + Completions │
   └──────────────────────┘         │  Live Progress tab     │
              ▲                     └────────────────────────┘
              │ HTTPS                          ▲
              ▼                                │ formulas
   ┌──────────────────────┐                    │
   │  Apps Script Web App │ ───────────────────┘
   │  (the API)           │
   └──────────────────────┘
```

Three pieces:
1. **Google Sheet** — holds all member and completion data. Admin staff watch the "Live Progress" tab during the conference.
2. **Apps Script** — runs *inside* the Sheet. Reads/writes rows on behalf of the website. No separate hosting needed.
3. **The website** — already built. Just paste the Apps Script URL into one config file and self-signup + live tracking turn on.

---

## Step 1 — Create the Google Sheet (5 minutes)

1. Sign into Google Drive (drive.google.com) with the account that will own this Sheet. **Recommended:** use the official ESP account, not a personal one — it survives staff turnover.
2. Click **+ New → File upload**. Upload `backend/admin-sheet-template.xlsx` (provided in this folder).
3. Once uploaded, right-click the file in Drive → **Open with → Google Sheets**.
4. Click **File → Save as Google Sheets**. This converts the .xlsx into a native Google Sheet (formulas keep working). You can delete the original .xlsx file in Drive — you don't need it anymore.
5. Open the converted Sheet. Verify you see five tabs at the bottom: **README**, **Members**, **Completions**, **Live Progress**, **Tasks Reference**.
6. Look at the URL in your browser. It looks like:
   ```
   https://docs.google.com/spreadsheets/d/1aBcDeFgHi....JkLmNo/edit#gid=0
   ```
   The long string between `/d/` and `/edit` is the **Sheet ID**. Copy it. You'll need it in Step 2.

---

## Step 2 — Attach the Apps Script (10 minutes)

1. With the Sheet open, click **Extensions → Apps Script**. A new tab opens — this is the script editor.
2. There's a default file called `Code.gs` with a `function myFunction()` placeholder. Select all of it and delete it.
3. Open `backend/Code.gs` from this app folder in any text editor. Copy the entire contents. Paste into the Apps Script editor.
4. At the top of the file, find this line:
   ```javascript
   const SPREADSHEET_ID = "PASTE_YOUR_SHEET_ID_HERE";
   ```
   Replace `PASTE_YOUR_SHEET_ID_HERE` with the Sheet ID you copied in Step 1. Keep the quotes.
5. Click the **save icon** (or Cmd/Ctrl+S). Name the project something like "First Five Backend" if it asks.
6. **Run the setup helper.** In the function dropdown at the top, select **`setupHeaders`**, then click the **Run** button (▷).
   - The first time you run anything, Google asks for permission. Click **Review permissions**, choose your Google account, click **Advanced → Go to (project name) (unsafe)** (this warning appears for any new script you write yourself; it's safe), then **Allow**.
   - If `setupHeaders` ran successfully, the Members and Completions tabs will now have proper headers.
7. **Deploy as a Web App.**
   - Click the blue **Deploy** button (top right) → **New deployment**.
   - Click the gear icon next to "Select type" → choose **Web app**.
   - Description: anything ("First Five v1").
   - Execute as: **Me (your-email@...)**
   - Who has access: **Anyone**. (This sounds scary, but the script only does what `Code.gs` allows. It does NOT give anyone access to your Drive or other files.)
   - Click **Deploy**. Authorize again if prompted.
   - You'll get a **Web app URL** — copy it. It looks like:
     ```
     https://script.google.com/macros/s/AKfycb..../exec
     ```

---

## Step 3 — Wire up the website (2 minutes)

1. Open `js/config.js` in any text editor.
2. Paste your Web app URL between the quotes:
   ```javascript
   window.FF_CONFIG = {
     apiUrl: "https://script.google.com/macros/s/AKfycb..../exec",
     allowSelfSignup: true,
   };
   ```
3. Save the file.
4. Re-deploy the website — drag the folder onto Netlify again, or `git push` if you used GitHub Pages.

---

## Step 4 — Test it (5 minutes)

1. Open the website. Try to sign in with `tyrone@example.org` (which the template seeded into Members). You should land on the dashboard.
2. Open the Google Sheet in a separate tab. Watch the **Members** tab — you should see Tyrone there.
3. Sign out (Profile → Sign out). On the sign-in screen, click **"New to First Five? Sign up here →"**.
4. Fill in fake details: name "Test User", email "test@example.org", chapter "Test Alpha", year "1". Submit.
5. Switch to the Sheet. The Members tab now has a new row for Test User. The Live Progress tab shows them with 0 tasks done.
6. Back on the website (signed in as Test User), tap any task and complete it — sign with your mouse, snap a photo, or answer a quiz.
7. Switch to the Sheet. The **Completions** tab has a new row. The **Live Progress** tab shows Test User now has 1 task done and the points value of that task.

**If all of that worked, you're live.** Send the website URL to your members.

---

## Step 5 — Share the admin Sheet with conference staff

1. Click the **Share** button in the top right of the Sheet.
2. Add the email addresses of the moderators and any board members who should see live progress. Set permission to **Viewer** (or Editor if you want them to be able to fix data).
3. **Do NOT** click "Anyone with the link". Keep it locked to invited users.
4. Tell staff: "Open this Sheet on the morning of Day 1. Click the **Live Progress** tab. Leave it open. It'll auto-refresh as members complete tasks."

---

## Frequently asked

**"Can I edit the Members or Completions tabs by hand?"**
Yes. The website reads from these tabs. If you want to add a member without their self-signup, add a row to Members. If you need to credit someone for a task they did but couldn't capture in the app, add a row to Completions (use any current timestamp for `completed_at`).

**"What if a member signs up twice?"**
The backend rejects duplicate emails. The second attempt returns "already on the roster — try signing in instead." If a member changes their email mid-conference, edit their row in Members and they sign in fresh with the new address.

**"How do I see what someone uploaded?"**
Open the **Completions** tab. The `photo_data_url` column holds a base64 string of the photo (under 200 KB). To view it, copy the entire cell content, paste it into a browser address bar — the photo renders. For larger photos, the cell will be empty (we cap to keep the Sheet snappy). In Phase 2 (Firebase Storage) every photo gets a permanent URL.

**"How do I close registration after the conference?"**
Open `js/config.js`. Set `allowSelfSignup: false` and re-deploy. The "Sign up here" link disappears.

**"How do I retire / archive after the conference?"**
- Make a copy of the Sheet (File → Make a copy) and name it "First Five 2026 Archive".
- In Apps Script, click Deploy → **Manage deployments** → archive the active deployment. The website will go to demo mode.
- Or just leave everything in place and use the same Sheet next year by clearing rows.

**"Can I send out a daily progress email?"**
Yes — Apps Script has a built-in scheduler. Add this function to `Code.gs`:
```javascript
function dailyDigest() {
  const stats = readTab("Live Progress").rows.slice(0, 50);
  const summary = stats.filter(r => r.Email).length + " members active.";
  GmailApp.sendEmail("you@espnational.org", "First Five daily", summary);
}
```
Then in Apps Script, click the clock icon (Triggers) → Add Trigger → choose `dailyDigest`, time-driven, daily at 7 AM.

**"My API call returns 'Authorization required' or HTML"**
This means the deployment isn't set to "Anyone" access, or you didn't authorize the script. Re-do step 2.7. If you make code changes and the new behavior doesn't show up, you also need to **redeploy** — Apps Script publishes specific snapshots, not the live code: Deploy → Manage deployments → Edit → Version: New version → Deploy.

**"Privacy — what gets stored where?"**
Everything members enter goes only into your Google Sheet. Nothing is sent to Anthropic, Netlify, GitHub, or any third party. The Sheet is private to whomever you share it with. Members can request deletion by emailing the moderation contact in `FF_SETTINGS`; you delete their rows from Members and Completions.

---

## Going further (Phase 2)

When you're ready to graduate from this Sheet-as-database to a real backend:

1. The data shape in Members → Firestore `members` collection. One-to-one mapping.
2. The data shape in Completions → Firestore `completions/{email}/tasks` subcollection.
3. The Live Progress formulas → Firestore aggregations or a dashboard built with Recharts.
4. The Apps Script endpoints → Firebase Cloud Functions with the same names.

You won't have to change any code in `index.html`, `dashboard.html`, `task.html`, or any of the page-level files — only `js/api.js` needs to point at the new backend. The rest of the app keeps working.

— End of setup guide.
