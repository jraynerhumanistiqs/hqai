/* HQ Performance - Supabase storage adapter.
 *
 * Replaces the original `store` object, which wrote to window.claude's db and
 * fell back to localStorage. Same method names (init, readLocal, loadLocal,
 * markAll, mark, schedule, flush, setStatus) so nothing else in the app had
 * to change, but the behaviour behind them is different in three ways that
 * matter:
 *
 *   1. NOTHING PERSISTS ON THE DEVICE. The old store wrote the whole dataset
 *      to localStorage on every flush, including every person's ratings and
 *      comments. That is employee performance data sitting in a browser. This
 *      adapter holds state in memory only and clears it on sign-out.
 *
 *   2. THE SHAPE IS SPLIT ON THE WAY OUT AND REASSEMBLED ON THE WAY IN. The
 *      app thinks in `person.records[cycleId]`; the database keeps directory
 *      data and performance data in separate tables, which is what lets an
 *      admin run the directory without reading assessments. load() merges
 *      them back so the ~1,200 lines of view code are untouched.
 *
 *   3. SAVES ARE NOT FIRE AND FORGET. Records go through the ppad_save_record
 *      RPC, which enforces the field matrix and an optimistic lock. A
 *      conflict reloads that record and tells the user, rather than
 *      overwriting whoever saved first.
 *
 * No Supabase JS library. The app needs auth-less REST reads, a few RPC calls
 * and nothing else, so this talks to PostgREST with fetch. That keeps the
 * iframe's CSP at 'self' plus the project URL, and avoids shipping ~100KB
 * into a document that is already 160KB.
 */
(function () {
  'use strict';

  var cfg = null;              // { url, anonKey, accessToken, user }
  var updatedAt = {};          // "personId|cycleId" -> updated_at, the optimistic lock
  var peopleUpdatedAt = {};    // personId -> updated_at, for directory writes

  // ── session ──────────────────────────────────────────────────────────────

  async function loadSession() {
    var res = await fetch('/api/ppad/session', { credentials: 'same-origin' });
    if (!res.ok) return null;
    return res.json();
  }

  // One retry on 401: the access token is short-lived and the Next route
  // refreshes it from the cookie, so a stale token recovers silently rather
  // than dumping the user back at a login screen mid-edit.
  async function api(path, init, retrying) {
    init = init || {};
    var headers = Object.assign({
      apikey: cfg.anonKey,
      Authorization: 'Bearer ' + cfg.accessToken,
      'Content-Type': 'application/json',
    }, init.headers || {});

    var res = await fetch(cfg.url + path, Object.assign({}, init, { headers: headers }));

    if (res.status === 401 && !retrying) {
      var fresh = await loadSession();
      if (fresh) { cfg = fresh; return api(path, init, true); }
    }
    if (!res.ok) {
      var body = await res.text();
      var msg = body;
      try { var j = JSON.parse(body); msg = j.message || j.error || j.hint || body; } catch (e) {}
      var err = new Error(msg);
      err.status = res.status;
      throw err;
    }
    if (res.status === 204) return null;
    var text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  var rest = function (q) { return api('/rest/v1/' + q, { method: 'GET' }); };
  var rpc = function (fn, args) {
    return api('/rest/v1/rpc/' + fn, { method: 'POST', body: JSON.stringify(args || {}) });
  };

  // ── load ─────────────────────────────────────────────────────────────────
  //
  // Fetches only what RLS returns. An employee-only user gets exactly one
  // person row and their own records; a manager gets their allocated staff.
  // No filtering happens here - the absence of a row IS the permission.
  async function load() {
    var org = await rest('ppad_org_config?select=data');
    S.org = (org && org[0] && org[0].data) || null;

    var pds = await rest('ppad_position_descriptions?select=pd_id,data&deleted_at=is.null');
    S.pds = {};
    (pds || []).forEach(function (row) {
      var d = row.data || {};
      d.id = row.pd_id;
      S.pds[row.pd_id] = d;
    });

    var people = await rest('ppad_people?select=person_id,user_id,profile,active,updated_at&deleted_at=is.null');
    S.people = {};
    (people || []).forEach(function (row) {
      var p = row.profile || {};
      p.id = row.person_id;
      p.userId = row.user_id;
      p.active = row.active;
      p.records = {};
      S.people[row.person_id] = p;
      peopleUpdatedAt[row.person_id] = row.updated_at;
    });

    // Reassemble person.records[cycleId] from the records table.
    var recs = await rest('ppad_records?select=person_id,cycle_id,data,locked_at,updated_at');
    (recs || []).forEach(function (row) {
      var p = S.people[row.person_id];
      // A record whose person row RLS withheld should not happen, but if the
      // policies ever disagree, drop the record rather than inventing a
      // person to hang it on.
      if (!p) return;
      var d = row.data || {};
      d.lockedAt = row.locked_at;
      p.records[row.cycle_id] = d;
      updatedAt[row.person_id + '|' + row.cycle_id] = row.updated_at;
    });

    // Who is the signed-in user, in the app's own terms? The role-aware UI
    // reads these.
    S.me = { userId: cfg.user.id, name: cfg.user.name, email: cfg.user.email, personId: null };
    Object.keys(S.people).forEach(function (pid) {
      if (S.people[pid].userId === cfg.user.id) S.me.personId = pid;
    });

    var mem = await rest('ppad_members?select=is_admin,is_hr_reporting&user_id=eq.' + cfg.user.id);
    S.me.isAdmin = !!(mem && mem[0] && mem[0].is_admin);
    S.me.isHrReporting = !!(mem && mem[0] && mem[0].is_hr_reporting);

    // Which of the visible people did I get through an allocation, and how?
    var allocs = await rest('ppad_allocations?select=person_id,type&ended_at=is.null&allocated_user_id=eq.' + cfg.user.id);
    S.me.manages = (allocs || []).filter(function (a) { return a.type === 'manager'; }).map(function (a) { return a.person_id; });
    S.me.reviews = (allocs || []).filter(function (a) { return a.type === 'reviewer'; }).map(function (a) { return a.person_id; });
  }

  // ── the store ────────────────────────────────────────────────────────────

  var store = {
    dirty: new Set(),
    timer: null,
    writing: false,
    status: '',
    failed: false,

    async init() {
      this.setStatus('Loading…');
      cfg = await loadSession();
      if (!cfg) { showSignedOut(); return; }
      try {
        await load();
      } catch (e) {
        this.setStatus('');
        showError('Could not load your data', e.message);
        return;
      }
      if (!cfg.user.businessId) { showNoOrg(); return; }
      S.mode = 'cloud';
      this.setStatus('');
      finishLoad();
    },

    // Kept so nothing that calls them breaks, but there is no local store any
    // more. Employee performance data must not outlive the session on the
    // device - see the header.
    readLocal() { return null; },
    loadLocal() { return this.init(); },

    markAll() {
      this.dirty.add('org');
      Object.keys(S.people).forEach(function (id) { store.dirty.add('p_' + id); });
      Object.keys(S.pds).forEach(function (id) { store.dirty.add('d_' + id); });
      this.schedule();
    },

    mark(key) { this.dirty.add(key); this.schedule(); },

    schedule() {
      clearTimeout(this.timer);
      this.setStatus('Saving…');
      this.timer = setTimeout(function () { store.flush(); }, 700);
    },

    async flush() {
      if (this.writing) { this.schedule(); return; }
      if (!cfg) return;
      this.writing = true;
      this.failed = false;
      var keys = Array.from(this.dirty);
      this.dirty.clear();

      try {
        for (var i = 0; i < keys.length; i++) {
          try {
            await writeKey(keys[i]);
          } catch (e) {
            this.failed = true;
            // Put it back so a later flush retries, unless the server has
            // told us the write will never be accepted - a rejected field or
            // a locked record will fail identically forever, and retrying
            // would spin.
            if (!/permissions|locked|conflict|access/i.test(e.message)) this.dirty.add(keys[i]);
            toast(e.message);
          }
        }
      } finally {
        this.writing = false;
      }

      // Never claim "Saved" unless every write came back clean.
      if (this.failed) this.setStatus('Not saved');
      else if (this.dirty.size) this.schedule();
      else this.setStatus('Saved');
    },

    setStatus(s) {
      this.status = s;
      var el = document.getElementById('sync');
      if (el) {
        el.textContent = s;
        el.classList.toggle('sync-bad', s === 'Not saved');
      }
    },

    async signOut() {
      try { await api('/auth/v1/logout', { method: 'POST' }); } catch (e) {}
      // Drop everything in memory before leaving, so a back button cannot
      // paint the previous user's data.
      S.org = null; S.people = {}; S.pds = {}; S.me = null;
      updatedAt = {}; peopleUpdatedAt = {}; cfg = null;
      try { localStorage.removeItem('pm-tool-v1'); } catch (e) {}
      location.replace('/login');
    },
  };

  // ── writes ───────────────────────────────────────────────────────────────

  async function writeKey(key) {
    if (key === 'org') {
      return api('/rest/v1/ppad_org_config?on_conflict=business_id', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify({ business_id: cfg.user.businessId, data: S.org, updated_at: new Date().toISOString() }),
      });
    }

    if (key.indexOf('d_') === 0) {
      var pid = key.slice(2);
      var pd = S.pds[pid];
      if (!pd) {
        return api('/rest/v1/ppad_position_descriptions?pd_id=eq.' + encodeURIComponent(pid), {
          method: 'PATCH', body: JSON.stringify({ deleted_at: new Date().toISOString() }),
        });
      }
      return api('/rest/v1/ppad_position_descriptions?on_conflict=business_id,pd_id', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify({ business_id: cfg.user.businessId, pd_id: pid, data: pd, updated_at: new Date().toISOString() }),
      });
    }

    if (key.indexOf('p_') === 0) {
      var id = key.slice(2);
      var person = S.people[id];
      if (!person) {
        return api('/rest/v1/ppad_people?person_id=eq.' + encodeURIComponent(id), {
          method: 'PATCH', body: JSON.stringify({ deleted_at: new Date().toISOString() }),
        });
      }
      return savePerson(id, person);
    }
  }

  // The app marks a whole person dirty when anything about them changes, so a
  // save has to split the two halves back apart: the directory row goes to
  // ppad_people (admin only, plain RLS), and every record goes through the
  // RPC that enforces the field matrix.
  async function savePerson(id, person) {
    var records = person.records || {};
    var errors = [];

    // Directory half. Only admins can write it, so a manager editing a
    // person's record must not be stopped by a 403 on the directory row -
    // that half is simply skipped for them.
    if (S.me && S.me.isAdmin) {
      var profile = {};
      Object.keys(person).forEach(function (k) {
        if (k !== 'records' && k !== 'id' && k !== 'userId' && k !== 'active' && k !== 'lockedAt') {
          profile[k] = person[k];
        }
      });
      try {
        await api('/rest/v1/ppad_people?on_conflict=business_id,person_id', {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates' },
          body: JSON.stringify({
            business_id: cfg.user.businessId, person_id: id, user_id: person.userId || null,
            profile: profile, active: person.active !== false, updated_at: new Date().toISOString(),
          }),
        });
      } catch (e) { errors.push(e.message); }
    }

    for (var cycleId in records) {
      if (!Object.prototype.hasOwnProperty.call(records, cycleId)) continue;
      var rec = Object.assign({}, records[cycleId]);
      // lockedAt is ours, not the document's. Sending it would land in the
      // jsonb and fail the matrix comparison.
      delete rec.lockedAt;
      var lockKey = id + '|' + cycleId;
      try {
        var out = await rpc('ppad_save_record', {
          p_person_id: id, p_cycle_id: cycleId, p_data: rec,
          p_expected_updated_at: updatedAt[lockKey] || null,
        });
        var row = Array.isArray(out) ? out[0] : out;
        if (row) {
          updatedAt[lockKey] = row.updated_at;
          records[cycleId] = Object.assign(row.data, { lockedAt: row.locked_at });
        }
      } catch (e) {
        if (/conflict|changed since/i.test(e.message)) {
          await reloadRecord(id, cycleId);
          errors.push('Someone else saved ' + fullName(person) + '’s record first. Your copy has been refreshed - re-apply your change.');
        } else {
          errors.push(e.message);
        }
      }
    }

    if (errors.length) throw new Error(errors[0]);
  }

  // On a conflict, take the server's version. Losing the local edit is the
  // point: the alternative is overwriting whoever got there first.
  async function reloadRecord(personId, cycleId) {
    var rows = await rest('ppad_records?select=data,locked_at,updated_at&person_id=eq.'
      + encodeURIComponent(personId) + '&cycle_id=eq.' + encodeURIComponent(cycleId));
    if (rows && rows[0] && S.people[personId]) {
      S.people[personId].records[cycleId] = Object.assign(rows[0].data, { lockedAt: rows[0].locked_at });
      updatedAt[personId + '|' + cycleId] = rows[0].updated_at;
      if (typeof rerender === 'function') rerender();
    }
  }

  // ── screens shown before the app can run ─────────────────────────────────

  function shell(title, body) {
    document.getElementById('app').innerHTML =
      '<div style="max-width:460px;margin:14vh auto;padding:0 24px;text-align:center">'
      + '<h1 style="font-size:20px;margin:0 0 8px">' + esc(title) + '</h1>'
      + '<p class="sub" style="margin:0">' + body + '</p></div>';
  }
  function showSignedOut() {
    shell('Please sign in', 'Your session has expired. <a href="/login">Sign in again</a> to continue.');
  }
  function showNoOrg() {
    shell('No organisation', 'Your account is not linked to a business yet. Ask your administrator to add you.');
  }
  function showError(title, detail) {
    shell(title, esc(detail || 'Something went wrong.') + '<br><br><a href="">Try again</a>');
  }

  // Install as the global `store` the rest of the app calls. The main script
  // no longer declares one, so its unqualified `store.mark(...)` calls
  // resolve to this at call time via the global object.
  window.store = store;
  window.ppadStore = store;
  window.ppadSignOut = function () { store.signOut(); };

  // Bootstrap. The main script used to end with store.loadLocal(); that line
  // was removed, so starting the app is this file's job.
  store.init();
})();
