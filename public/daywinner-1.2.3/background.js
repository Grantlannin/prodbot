const RULE_ID_BASE = 10000;
const TIME_STUDY_ALARM = 'timeStudyCheckIn';
const SITE_BLOCKER_SCRIPT_ID = 'daywinner-site-blocker';

async function getStoredState() {
  const data = await chrome.storage.local.get(['focusState']);
  return (
    data.focusState || {
      blocking: false,
      domains: [],
      sessionEndsAt: null,
      lockMode: null,
      sessionId: null,
      timerPaused: false,
      remainingMs: null,
    }
  );
}

async function getTimeStudySettings() {
  const data = await chrome.storage.local.get(['timeStudy']);
  const raw = data.timeStudy || {};
  const interval = Number(raw.intervalMinutes);
  const allowed = [5, 15, 30, 45, 60];
  return {
    enabled: !!raw.enabled,
    intervalMinutes: allowed.includes(interval) ? interval : 30,
    sessionActive: !!raw.sessionActive,
  };
}

function isActiveBlockingState(state) {
  return !!(state?.blocking && state.domains?.length);
}

function domainsKey(domains) {
  return JSON.stringify(Array.isArray(domains) ? domains : []);
}

function sameFocusState(a, b) {
  return (
    !!a?.blocking === !!b?.blocking &&
    domainsKey(a?.domains) === domainsKey(b?.domains) &&
    (a?.sessionEndsAt || null) === (b?.sessionEndsAt || null) &&
    (a?.lockMode || null) === (b?.lockMode || null) &&
    (a?.sessionId || null) === (b?.sessionId || null) &&
    !!a?.timerPaused === !!b?.timerPaused &&
    (a?.remainingMs ?? null) === (b?.remainingMs ?? null)
  );
}

async function updateRules(state) {
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const removeIds = existing.map(rule => rule.id);

  if (!isActiveBlockingState(state)) {
    if (removeIds.length) {
      await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: removeIds });
    }
    return;
  }

  const addRules = state.domains.map((domain, index) => ({
    id: RULE_ID_BASE + index,
    priority: 1,
    action: {
      type: 'redirect',
      redirect: {
        extensionPath: `/blocked.html?site=${encodeURIComponent(domain)}`,
      },
    },
    condition: {
      urlFilter: `||${domain}^`,
      resourceTypes: ['main_frame', 'sub_frame'],
    },
  }));

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: removeIds,
    addRules,
  });
}

/** Drop leftover dynamic siteBlocker registration from older builds. */
async function clearLegacySiteBlockerRegistration() {
  try {
    const existing = await chrome.scripting.getRegisteredContentScripts();
    if (existing.some(script => script.id === SITE_BLOCKER_SCRIPT_ID)) {
      await chrome.scripting.unregisterContentScripts({ ids: [SITE_BLOCKER_SCRIPT_ID] });
    }
  } catch {
    /* ignore */
  }
}

/**
 * Lock on → set Chrome block rules. Lock off → clear them.
 * No all-tab scans, no minute enforce loops, no navigation thrash.
 * New tabs on stubborn sites (X SW) are handled by siteBlocker.js at document_start.
 */
async function applySync(payload) {
  if (payload.entitled !== true) {
    payload = {
      blocking: false,
      domains: [],
      sessionEndsAt: null,
      lockMode: null,
      sessionId: null,
      timerPaused: false,
      remainingMs: null,
      entitled: false,
    };
  }

  const state = {
    blocking: !!payload.blocking,
    domains: Array.isArray(payload.domains) ? payload.domains : [],
    sessionEndsAt: payload.timerPaused ? null : payload.sessionEndsAt || null,
    lockMode: payload.lockMode || null,
    sessionId: payload.sessionId || null,
    timerPaused: !!payload.timerPaused,
    remainingMs: payload.timerPaused ? payload.remainingMs ?? null : null,
  };

  if (
    state.blocking &&
    !state.timerPaused &&
    state.sessionEndsAt &&
    state.sessionEndsAt <= Date.now()
  ) {
    state.blocking = false;
    state.domains = [];
    state.sessionEndsAt = null;
    state.lockMode = null;
    state.sessionId = null;
    state.remainingMs = null;
  }

  const prev = await getStoredState();
  if (sameFocusState(prev, state)) return;

  const prevActive = isActiveBlockingState(prev);
  const active = isActiveBlockingState(state);
  const needRules =
    prevActive !== active || domainsKey(prev.domains) !== domainsKey(state.domains);

  // Clear rules before storage when turning off (avoids stale DNR if SW dies mid-write).
  if (!active) {
    if (needRules) await updateRules(state);
    await chrome.storage.local.set({ focusState: state });
  } else {
    await chrome.storage.local.set({ focusState: state });
    if (needRules) await updateRules(state);
  }

  await chrome.alarms.clear('sessionEnd');
  if (!state.timerPaused && active && state.sessionEndsAt && state.sessionEndsAt > Date.now()) {
    chrome.alarms.create('sessionEnd', { when: state.sessionEndsAt });
  }
}

async function scheduleTimeStudyAlarm(settings) {
  await chrome.alarms.clear(TIME_STUDY_ALARM);
  if (!settings.enabled || !settings.sessionActive) return;
  const minutes = Number(settings.intervalMinutes) || 30;
  chrome.alarms.create(TIME_STUDY_ALARM, {
    delayInMinutes: minutes,
    periodInMinutes: minutes,
  });
}

async function applyTimeStudySync(payload) {
  const prev = await getTimeStudySettings();
  const interval = Number(payload?.intervalMinutes);
  const allowed = [5, 15, 30, 45, 60];
  const settings = {
    enabled: !!payload?.enabled,
    intervalMinutes: allowed.includes(interval) ? interval : prev.intervalMinutes || 30,
    sessionActive:
      payload?.sessionActive !== undefined ? !!payload.sessionActive : !!prev.sessionActive,
  };
  await chrome.storage.local.set({ timeStudy: settings });
  await scheduleTimeStudyAlarm(settings);

  if (payload?.pingNow) {
    if (!settings.enabled) {
      return { ok: false, overlay: false, notified: false, error: 'Turn on time study check-ins first.' };
    }
    if (!settings.sessionActive) {
      return {
        ok: false,
        overlay: false,
        notified: false,
        error: 'Start a focus session (timer running) first — pings only fire during an active session.',
      };
    }
    return fireTimeStudyPing();
  }

  return { ok: true, notified: false, overlay: false, sessionActive: settings.sessionActive };
}

async function showPingOnActiveTab() {
  try {
    const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    const tab = tabs[0];
    if (!tab?.id) {
      return { ok: false, overlay: false, error: 'No active tab to ping.' };
    }

    const url = tab.url || '';
    if (!/^https?:/i.test(url)) {
      return {
        ok: false,
        overlay: false,
        error: 'Can’t ping on this page (chrome:// and similar). Switch to a normal website tab.',
      };
    }

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['pingOverlay.js'],
    });
    return { ok: true, overlay: true, method: 'overlay' };
  } catch (err) {
    console.error('Daywinner time study: overlay inject failed', err);
    return {
      ok: false,
      overlay: false,
      error: String(err?.message || err),
    };
  }
}

async function fireTimeStudyPing() {
  const overlay = await showPingOnActiveTab();
  return {
    ok: !!overlay.ok && !!overlay.overlay,
    overlay: !!overlay.overlay,
    notified: false,
    method: overlay.method || null,
    permission: null,
    error: overlay.overlay ? null : overlay.error || 'Could not show on-page check-in.',
  };
}

async function logInfraction(domain) {
  const normalized = String(domain || 'unknown')
    .trim()
    .toLowerCase()
    .replace(/^www\./, '');
  const label = `Blocked site: ${normalized}`;
  const infraction = { domain: normalized, label, createdAt: Date.now() };

  const data = await chrome.storage.local.get(['pendingInfractions']);
  const pending = data.pendingInfractions || [];
  pending.push(infraction);
  await chrome.storage.local.set({ pendingInfractions: pending });
}

async function saveTimeStudyCheckIn(payload) {
  const text = String(payload?.text || '').trim();
  if (!text) return;
  const item = {
    id: String(payload?.id || `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`),
    text,
    createdAt: Number(payload?.createdAt) || Date.now(),
  };
  const data = await chrome.storage.local.get(['pendingCheckIns']);
  const pending = Array.isArray(data.pendingCheckIns) ? data.pendingCheckIns : [];
  pending.push(item);
  await chrome.storage.local.set({ pendingCheckIns: pending });
}

function clearPayload() {
  return {
    blocking: false,
    domains: [],
    sessionEndsAt: null,
    lockMode: null,
    sessionId: null,
    timerPaused: false,
    remainingMs: null,
    entitled: true,
  };
}

async function restoreFromStorage() {
  await clearLegacySiteBlockerRegistration();
  // Clear leftover enforce alarm from older builds.
  await chrome.alarms.clear('enforceBlockedTabs');

  const state = await getStoredState();
  if (!state.timerPaused && state.sessionEndsAt && state.sessionEndsAt <= Date.now()) {
    await applySync(clearPayload());
  } else {
    await updateRules(state);
    if (
      !state.timerPaused &&
      isActiveBlockingState(state) &&
      state.sessionEndsAt &&
      state.sessionEndsAt > Date.now()
    ) {
      chrome.alarms.create('sessionEnd', { when: state.sessionEndsAt });
    }
  }

  const timeStudy = await getTimeStudySettings();
  await scheduleTimeStudyAlarm(timeStudy);
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'SYNC') {
    applySync(msg.payload || {})
      .then(() => sendResponse({ ok: true }))
      .catch(err => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  if (msg.type === 'SYNC_TIME_STUDY') {
    applyTimeStudySync(msg.payload || {})
      .then(result => sendResponse({ ok: true, ...(result || {}) }))
      .catch(err => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  if (msg.type === 'GET_STATE') {
    getStoredState().then(state => sendResponse(state));
    return true;
  }

  if (msg.type === 'LOG_INFRACTION') {
    logInfraction(msg.domain)
      .then(() => sendResponse({ ok: true }))
      .catch(err => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  if (msg.type === 'GET_PENDING_INFRACTIONS') {
    chrome.storage.local
      .get(['pendingInfractions'])
      .then(data => sendResponse(data.pendingInfractions || []))
      .catch(() => sendResponse([]));
    return true;
  }

  if (msg.type === 'CLEAR_PENDING_INFRACTIONS') {
    chrome.storage.local
      .set({ pendingInfractions: [] })
      .then(() => sendResponse({ ok: true }))
      .catch(err => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  if (msg.type === 'SAVE_TIME_STUDY_CHECKIN') {
    saveTimeStudyCheckIn(msg.payload)
      .then(() => sendResponse({ ok: true }))
      .catch(err => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  if (msg.type === 'GET_PENDING_CHECKINS') {
    chrome.storage.local
      .get(['pendingCheckIns'])
      .then(data => sendResponse(data.pendingCheckIns || []))
      .catch(() => sendResponse([]));
    return true;
  }

  if (msg.type === 'CLEAR_PENDING_CHECKINS') {
    chrome.storage.local
      .set({ pendingCheckIns: [] })
      .then(() => sendResponse({ ok: true }))
      .catch(err => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  if (msg.type === 'OPEN_TIME_STUDY_CHECKIN') {
    showPingOnActiveTab()
      .then(result => sendResponse({ ok: !!result.ok, ...(result || {}) }))
      .catch(err => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  return false;
});

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'sessionEnd') {
    void applySync(clearPayload());
    return;
  }

  if (alarm.name === TIME_STUDY_ALARM) {
    void (async () => {
      const settings = await getTimeStudySettings();
      if (!settings.enabled || !settings.sessionActive) {
        await chrome.alarms.clear(TIME_STUDY_ALARM);
        return;
      }
      await fireTimeStudyPing();
    })();
  }
});

chrome.runtime.onStartup.addListener(() => {
  restoreFromStorage();
});

chrome.runtime.onInstalled.addListener(() => {
  restoreFromStorage();
});

void restoreFromStorage();
