/* ============================================================
   app.js — shared logic across all pages
   ------------------------------------------------------------
   This file works in two modes:

   1. DEMO mode (FF_CONFIG.apiUrl is empty)
      Uses the seed roster from data.js and stores progress
      in localStorage. Per-device — works offline.

   2. LIVE mode (FF_CONFIG.apiUrl is set to your Apps Script URL)
      Roster comes from the Sheet. Sign-in / sign-up / completion
      all hit the backend. localStorage is used as a cache so the
      app doesn't refetch on every page load.

   The rest of the app code doesn't care which mode is active —
   it just calls FF.* methods.
   ============================================================ */

// ---------- Tiny DOM helper ------------------------------------------------
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// ---------- Storage keys ---------------------------------------------------
const KEYS = {
  user: "ff_user",
  member: "ff_member_cache",       // full member record cache
  completed: "ff_completed",       // { taskId: { proofKind, when, ... } }
  members: "ff_roster_cache",      // last fetched roster
  chats: "ff_chats",
};

// ---------- The FF facade ---------------------------------------------------
const FF = {
  // === Mode helpers ========================================================
  isLive() {
    return !!(window.API && API.enabled());
  },

  // === Auth ================================================================
  currentUserEmail() { return localStorage.getItem(KEYS.user); },

  // Returns the cached member record, or null.
  currentUser() {
    const cached = localStorage.getItem(KEYS.member);
    if (cached) {
      try { return JSON.parse(cached); } catch (e) { /* fall through */ }
    }
    // Fall back to lookup in the local roster (demo mode)
    const email = FF.currentUserEmail();
    if (!email) return null;
    return FF._localRoster().find(m => m.email === email) || null;
  },

  _localRoster() {
    // Try cached roster first (live mode), then bundled demo data
    const cached = localStorage.getItem(KEYS.members);
    if (cached) {
      try { return JSON.parse(cached); } catch (e) { /* ignore */ }
    }
    return window.FF_MEMBERS || [];
  },

  // Refresh roster from backend if live; cache for offline lookups.
  async refreshRoster() {
    if (!FF.isLive()) return FF._localRoster();
    try {
      const r = await API.listMembers();
      if (r && r.ok) {
        localStorage.setItem(KEYS.members, JSON.stringify(r.members));
        return r.members;
      }
    } catch (e) { /* fall through */ }
    return FF._localRoster();
  },

  // Sign in. Returns { ok, message? }.
  async signIn(email) {
    email = (email || "").trim().toLowerCase();
    if (!email) return { ok: false, message: "Enter your email." };

    if (FF.isLive()) {
      try {
        const r = await API.signIn(email);
        if (r && r.ok) {
          localStorage.setItem(KEYS.user, r.member.email);
          localStorage.setItem(KEYS.member, JSON.stringify(r.member));
          return { ok: true };
        }
        return { ok: false, message: (r && r.error) || "Sign-in failed." };
      } catch (e) {
        return { ok: false, message: "Network error. Check your Wi-Fi and try again." };
      }
    }

    // Demo mode — match against bundled seed
    const member = (window.FF_MEMBERS || []).find(m => m.email.toLowerCase() === email);
    if (!member) return { ok: false, message: "We didn't find that email on the First Five roster." };
    localStorage.setItem(KEYS.user, member.email);
    localStorage.setItem(KEYS.member, JSON.stringify(member));
    return { ok: true };
  },

  // Sign up a new member. Returns { ok, message? }.
  async signUp(form) {
    if (!form.name || !form.email) return { ok: false, message: "Name and email are required." };
    const member = {
      email: form.email.trim().toLowerCase(),
      name: form.name.trim(),
      chapter: (form.chapter || "").trim(),
      year: Number(form.year) || 1,
      headline: (form.headline || "").trim(),
    };

    if (FF.isLive()) {
      try {
        const r = await API.signUp(member);
        if (r && r.ok) {
          localStorage.setItem(KEYS.user, r.member.email);
          localStorage.setItem(KEYS.member, JSON.stringify(r.member));
          // Bust the roster cache so the new member shows up in directory
          localStorage.removeItem(KEYS.members);
          return { ok: true };
        }
        return { ok: false, message: (r && r.error) || "Sign-up failed." };
      } catch (e) {
        return { ok: false, message: "Network error. Check your Wi-Fi and try again." };
      }
    }

    // Demo mode — add to in-memory roster + localStorage so the demo can show flow
    const roster = FF._localRoster();
    if (roster.find(m => m.email === member.email)) {
      return { ok: false, message: "That email is already on the demo roster." };
    }
    roster.push(member);
    localStorage.setItem(KEYS.members, JSON.stringify(roster));
    localStorage.setItem(KEYS.user, member.email);
    localStorage.setItem(KEYS.member, JSON.stringify(member));
    return { ok: true };
  },

  signOut() {
    localStorage.removeItem(KEYS.user);
    localStorage.removeItem(KEYS.member);
    location.href = "index.html";
  },

  requireAuth() {
    if (!FF.currentUserEmail()) location.href = "index.html";
  },

  // Look up any member by email (uses cached roster in live mode)
  memberByEmail(email) {
    return FF._localRoster().find(m => m.email === email) || null;
  },

  // === Completions =========================================================
  completedMap() {
    try { return JSON.parse(localStorage.getItem(KEYS.completed) || "{}"); }
    catch (e) { return {}; }
  },

  isCompleted(taskId) { return !!FF.completedMap()[taskId]; },

  // Pull the latest from the backend, merge into local cache.
  async refreshCompletions() {
    if (!FF.isLive()) return FF.completedMap();
    const email = FF.currentUserEmail();
    if (!email) return {};
    try {
      const r = await API.listCompletions(email);
      if (r && r.ok) {
        const map = {};
        r.completions.forEach(c => { map[c.taskId] = c; });
        localStorage.setItem(KEYS.completed, JSON.stringify(map));
        return map;
      }
    } catch (e) { /* fall through to cache */ }
    return FF.completedMap();
  },

  // Mark a task complete — writes to backend (if live) and to cache.
  async markCompleted(taskId, payload) {
    const map = FF.completedMap();
    map[taskId] = { ...payload, when: Date.now() };
    localStorage.setItem(KEYS.completed, JSON.stringify(map));

    if (FF.isLive()) {
      try {
        await API.recordCompletion({
          email: FF.currentUserEmail(),
          taskId,
          ...payload,
        });
      } catch (e) {
        // Network failure — completion is still in localStorage,
        // and we could add a retry queue here in a future version.
      }
    }
  },

  resetProgress() { localStorage.removeItem(KEYS.completed); },

  // === Stats ===============================================================
  totalPossiblePoints() {
    return window.FF_TASKS.reduce((s, t) => s + t.points, 0);
  },

  earnedPoints() {
    const map = FF.completedMap();
    return window.FF_TASKS
      .filter(t => map[t.id])
      .reduce((s, t) => s + t.points, 0);
  },

  completedCount() { return Object.keys(FF.completedMap()).length; },

  tier() {
    const p = FF.earnedPoints();
    const s = window.FF_SETTINGS;
    if (p >= s.gold) return "Gold";
    if (p >= s.silver) return "Silver";
    if (p >= s.bronze) return "Bronze";
    return "—";
  },

  // === Chat (still local-only — see Phase 2 in README) =====================
  allThreads() {
    try { return JSON.parse(localStorage.getItem(KEYS.chats) || "{}"); }
    catch (e) { return {}; }
  },
  thread(otherEmail) { return FF.allThreads()[otherEmail] || []; },
  saveThread(otherEmail, msgs) {
    const all = FF.allThreads();
    all[otherEmail] = msgs;
    localStorage.setItem(KEYS.chats, JSON.stringify(all));
  },
  appendMessage(otherEmail, msg) {
    const t = FF.thread(otherEmail);
    t.push(msg);
    FF.saveThread(otherEmail, t);
  },
  seedDemoChat() {
    const all = FF.allThreads();
    if (!all["marisol@example.org"] && window.FF_DEMO_CHAT && window.FF_DEMO_CHAT["marisol@example.org"]) {
      all["marisol@example.org"] = window.FF_DEMO_CHAT["marisol@example.org"];
      localStorage.setItem(KEYS.chats, JSON.stringify(all));
    }
  },
};

// ---------- Helpers --------------------------------------------------------
function initials(name) {
  return (name || "")
    .split(" ").map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

function formatTime(ts) {
  const d = new Date(ts);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function toast(message, kind = "") {
  let t = document.querySelector(".toast");
  if (!t) {
    t = document.createElement("div");
    t.className = "toast";
    document.body.appendChild(t);
  }
  t.className = "toast " + kind;
  t.textContent = message;
  // eslint-disable-next-line no-unused-expressions
  t.offsetWidth;
  t.classList.add("show");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => t.classList.remove("show"), 2400);
}

// ---------- Bottom nav -----------------------------------------------------
function renderBottomNav(activePage) {
  const items = [
    { page: "dashboard", href: "dashboard.html", label: "Home",    icon: "🏠" },
    { page: "tasks",     href: "tasks.html",     label: "Tasks",   icon: "🗺️" },
    { page: "connect",   href: "connect.html",   label: "Connect", icon: "💬" },
    { page: "profile",   href: "profile.html",   label: "Profile", icon: "👤" },
  ];
  const html = items.map(i => `
    <a href="${i.href}" class="nav-item ${i.page === activePage ? "active" : ""}">
      <div class="ic">${i.icon}</div>
      ${i.label}
    </a>
  `).join("");
  const nav = document.createElement("nav");
  nav.className = "nav";
  nav.innerHTML = html;
  document.body.appendChild(nav);
}

// ---------- Service worker -------------------------------------------------
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  });
}
