/**
 * ESP First Five — Google Apps Script backend
 * ------------------------------------------------------------
 * This single file is the entire server side of the app.
 * It runs inside Google Apps Script, attached to a Google
 * Sheet that holds the roster and the completion log.
 *
 * Once deployed as a Web App, it provides three endpoints:
 *
 *   GET  ?action=members                           — full roster
 *   GET  ?action=signin&email=X                    — verify email is on roster
 *   GET  ?action=completions&email=X               — one user's completions
 *   POST {action: "signup", member: {...}}         — add a new member
 *   POST {action: "complete", email, taskId, ...}  — record a task completion
 *
 * Endpoints return JSON and use JSONP-friendly text/plain so
 * a static site can call them without CORS preflight headaches.
 *
 * Spreadsheet structure expected (tab names matter):
 *   "Members"     headers: email | name | chapter | year | headline | source | created_at
 *   "Completions" headers: email | task_id | proof_kind | validator | answer | photo_data_url | completed_at
 *   "Live Progress" — formulas, no writes from here
 *
 * Edit the SPREADSHEET_ID below to point at your Sheet.
 */

// PASTE YOUR SHEET ID HERE. The ID is in the Google Sheet URL between /d/ and /edit:
//   https://docs.google.com/spreadsheets/d/[THIS_PART_IS_THE_ID]/edit
const SPREADSHEET_ID = "1omrGfwwuPF8Nr6HyQXvA924S6lYAzvSOiuLYm5YqB74";

const TAB_MEMBERS = "Members";
const TAB_COMPLETIONS = "Completions";

// ============================================================
// HTTP entrypoints
// ============================================================
function doGet(e) {
  return route(e, "GET");
}

function doPost(e) {
  return route(e, "POST");
}

function route(e, method) {
  try {
    let payload;
    if (method === "POST") {
      payload = JSON.parse(e.postData.contents || "{}");
    } else {
      payload = e.parameter || {};
    }
    const action = payload.action || (e.parameter && e.parameter.action);

    let result;
    switch (action) {
      case "members":     result = listMembers(); break;
      case "signin":      result = signIn(payload.email); break;
      case "signup":      result = signUp(payload.member || payload); break;
      case "completions": result = listCompletions(payload.email); break;
      case "complete":    result = recordCompletion(payload); break;
      case "ping":        result = { ok: true, ts: new Date().toISOString() }; break;
      default:            result = { ok: false, error: "Unknown action: " + action };
    }
    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err && err.message || err) });
  }
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// Sheet helpers
// ============================================================
function ss() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function readTab(name) {
  const sheet = ss().getSheetByName(name);
  if (!sheet) throw new Error("Missing tab: " + name);
  const values = sheet.getDataRange().getValues();
  if (values.length === 0) return { headers: [], rows: [] };
  const headers = values[0].map(h => String(h).trim());
  const rows = values.slice(1).map(row => {
    const o = {};
    headers.forEach((h, i) => { o[h] = row[i]; });
    return o;
  });
  return { headers, rows };
}

function appendRow(tabName, headers, obj) {
  const sheet = ss().getSheetByName(tabName);
  if (!sheet) throw new Error("Missing tab: " + tabName);
  const row = headers.map(h => obj[h] !== undefined ? obj[h] : "");
  sheet.appendRow(row);
}

// ============================================================
// API actions
// ============================================================

// GET ?action=members
function listMembers() {
  const { rows } = readTab(TAB_MEMBERS);
  return {
    ok: true,
    members: rows
      .filter(r => r.email)
      .map(r => ({
        email: String(r.email).toLowerCase().trim(),
        name: r.name || "",
        chapter: r.chapter || "",
        year: Number(r.year) || 1,
        headline: r.headline || "",
      }))
  };
}

// GET ?action=signin&email=X
function signIn(email) {
  if (!email) return { ok: false, error: "Email is required" };
  email = String(email).toLowerCase().trim();
  const { rows } = readTab(TAB_MEMBERS);
  const m = rows.find(r => String(r.email).toLowerCase().trim() === email);
  if (!m) return { ok: false, error: "Email not on the First Five roster. Use the Sign Up link if you're new." };
  return {
    ok: true,
    member: {
      email,
      name: m.name || "",
      chapter: m.chapter || "",
      year: Number(m.year) || 1,
      headline: m.headline || "",
    }
  };
}

// POST { action: "signup", member: {...} }
function signUp(member) {
  if (!member || !member.email || !member.name) {
    return { ok: false, error: "Name and email are required." };
  }
  const email = String(member.email).toLowerCase().trim();

  // Reject duplicates
  const existing = readTab(TAB_MEMBERS).rows.find(r => String(r.email).toLowerCase().trim() === email);
  if (existing) {
    return { ok: false, error: "That email is already on the roster — try signing in instead." };
  }

  appendRow(TAB_MEMBERS, ["email", "name", "chapter", "year", "headline", "source", "created_at"], {
    email,
    name: member.name,
    chapter: member.chapter || "",
    year: Number(member.year) || 1,
    headline: member.headline || "",
    source: "self-signup",
    created_at: new Date(),
  });

  return {
    ok: true,
    member: {
      email,
      name: member.name,
      chapter: member.chapter || "",
      year: Number(member.year) || 1,
      headline: member.headline || "",
    }
  };
}

// GET ?action=completions&email=X
function listCompletions(email) {
  if (!email) return { ok: false, error: "Email required" };
  email = String(email).toLowerCase().trim();
  const { rows } = readTab(TAB_COMPLETIONS);
  const mine = rows
    .filter(r => String(r.email).toLowerCase().trim() === email)
    .map(r => ({
      taskId: r.task_id,
      proofKind: r.proof_kind,
      validator: r.validator || "",
      answer: r.answer || "",
      when: r.completed_at ? new Date(r.completed_at).getTime() : Date.now(),
    }));
  return { ok: true, completions: mine };
}

// POST { action: "complete", email, taskId, proofKind, ... }
function recordCompletion(p) {
  if (!p.email || !p.taskId) return { ok: false, error: "Email and task ID required" };
  const email = String(p.email).toLowerCase().trim();

  // Idempotency — if this email+taskId already exists, don't double-record
  const { rows } = readTab(TAB_COMPLETIONS);
  if (rows.find(r =>
        String(r.email).toLowerCase().trim() === email &&
        String(r.task_id).trim() === String(p.taskId).trim())) {
    return { ok: true, alreadyRecorded: true };
  }

  appendRow(TAB_COMPLETIONS,
    ["email", "task_id", "proof_kind", "validator", "answer", "photo_data_url", "completed_at"],
    {
      email,
      task_id: p.taskId,
      proof_kind: p.proofKind || "",
      validator: p.validator || "",
      answer: p.answer || "",
      // Photos can be huge — store the data URL only if under 200 KB to keep the sheet snappy.
      // Larger photos should go to Cloud Storage in Phase 2.
      photo_data_url: (p.photo && p.photo.length < 200000) ? p.photo : "",
      completed_at: new Date(),
    });

  return { ok: true };
}

// ============================================================
// One-time setup helper — run this from the Apps Script editor
// after pasting your Sheet ID. It creates the headers if they
// don't exist yet.
// ============================================================
function setupHeaders() {
  const memSheet = ss().getSheetByName(TAB_MEMBERS) || ss().insertSheet(TAB_MEMBERS);
  if (memSheet.getLastRow() === 0) {
    memSheet.appendRow(["email", "name", "chapter", "year", "headline", "source", "created_at"]);
    memSheet.getRange(1, 1, 1, 7).setFontWeight("bold").setBackground("#1B365D").setFontColor("#FFFFFF");
    memSheet.setFrozenRows(1);
  }

  const compSheet = ss().getSheetByName(TAB_COMPLETIONS) || ss().insertSheet(TAB_COMPLETIONS);
  if (compSheet.getLastRow() === 0) {
    compSheet.appendRow(["email", "task_id", "proof_kind", "validator", "answer", "photo_data_url", "completed_at"]);
    compSheet.getRange(1, 1, 1, 7).setFontWeight("bold").setBackground("#1B365D").setFontColor("#FFFFFF");
    compSheet.setFrozenRows(1);
  }

  Logger.log("Setup complete. Now deploy this script as a Web App.");
}
