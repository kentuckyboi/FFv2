/* ============================================================
   api.js — talks to the Apps Script backend
   ------------------------------------------------------------
   If FF_CONFIG.apiUrl is empty, every method below is a no-op
   that returns demo data — the rest of the app keeps working
   using the seed members in data.js + localStorage. This is
   what lets you test the UI before wiring up the backend.
   ============================================================ */

const API = {
  enabled() {
    return !!(window.FF_CONFIG && window.FF_CONFIG.apiUrl);
  },

  url() {
    return window.FF_CONFIG.apiUrl;
  },

  // ---- GETs go via query string ----
  async _get(params) {
    if (!API.enabled()) return null;
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`${API.url()}?${qs}`, { method: "GET" });
    return res.json();
  },

  // ---- POSTs use text/plain to dodge CORS preflight ----
  async _post(body) {
    if (!API.enabled()) return null;
    const res = await fetch(API.url(), {
      method: "POST",
      // Apps Script accepts text/plain bodies and parses JSON via e.postData.contents
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body),
    });
    return res.json();
  },

  // ---- Endpoints ----
  async listMembers() { return API._get({ action: "members" }); },

  async signIn(email)  { return API._get({ action: "signin", email }); },

  async signUp(member) { return API._post({ action: "signup", member }); },

  async listCompletions(email) { return API._get({ action: "completions", email }); },

  async recordCompletion(payload) { return API._post({ action: "complete", ...payload }); },
};

window.API = API;
