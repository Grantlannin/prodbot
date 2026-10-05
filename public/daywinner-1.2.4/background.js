const RULE_ID_BASE = 10000;
const TIME_STUDY_ALARM = 'timeStudyCheckIn';

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

async function updateRules(state) {
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const removeIds = existing.map(rule => rule.id);

  if (!state.blocking || !state.domains?.length) {
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
      resourceTypes: ['main_frame'],
    },
  }));

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: removeIds,
    addRules,
  });
}

async function applySync(payload) {
  // Require explicit entitled === true. Spoofed page messages without entitlement clear blocking.
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

  await chrome.storage.local.set({ focusState: state });
  await updateRules(state);

  await chrome.alarms.clear('sessionEnd');
  if (
    !state.timerPaused &&
    state.blocking &&
    state.sessionEndsAt &&
    state.sessionEndsAt > Date.now()
  ) {
    chrome.alarms.create('sessionEnd', { when: state.sessionEndsAt });
  }
}

async function scheduleTimeStudyAlarm(settings) {
  await chrome.alarms.clear(TIME_STUDY_ALARM);
  // Only ping while a focus session timer is actively running.
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

/** On-page type box only — never open checkin.html or Chrome OS notifications. */
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
  // Daywinner content script polls GET_PENDING_INFRACTIONS — no tabs permission needed
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

async function restoreFromStorage() {
  const state = await getStoredState();
  if (
    !state.timerPaused &&
    state.sessionEndsAt &&
    state.sessionEndsAt <= Date.now()
  ) {
    await applySync({
      blocking: false,
      domains: [],
      sessionEndsAt: null,
      lockMode: null,
      sessionId: null,
      timerPaused: false,
      remainingMs: null,
    });
  } else {
    await updateRules(state);
    if (
      !state.timerPaused &&
      state.blocking &&
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
    applySync({
      blocking: false,
      domains: [],
      sessionEndsAt: null,
      lockMode: null,
      sessionId: null,
      timerPaused: false,
      remainingMs: null,
    });
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
