const RULE_ID_BASE = 10000;
const TIME_STUDY_ALARM = 'timeStudyCheckIn';
const SITE_BLOCKER_SCRIPT_ID = 'daywinner-site-blocker';
const ENFORCE_ALARM = 'enforceBlockedTabs';

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

function normalizeDomain(domain) {
  return String(domain || '')
    .trim()
    .toLowerCase()
    .replace(/^www\./, '');
}

function matchBlockedDomain(hostname, domains) {
  const host = normalizeDomain(hostname);
  if (!host) return null;
  for (const raw of domains || []) {
    const domain = normalizeDomain(raw);
    if (!domain) continue;
    if (host === domain || host.endsWith(`.${domain}`)) return domain;
  }
  return null;
}

function blockedPageUrl(domain) {
  return chrome.runtime.getURL(`blocked.html?site=${encodeURIComponent(domain)}`);
}

function isActiveBlockingState(state) {
  return !!(state?.blocking && state.domains?.length);
}

async function injectSiteBlocker(tabId) {
  if (!tabId) return;
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['siteBlocker.js'],
    });
  } catch {
    /* chrome:// pages, discarded tabs, etc. */
  }
}

/** Keep dynamic registration as a backup; manifest also ships a static content_script. */
async function syncSiteBlockerRegistration(blocking) {
  try {
    const existing = await chrome.scripting.getRegisteredContentScripts();
    const has = existing.some(script => script.id === SITE_BLOCKER_SCRIPT_ID);
    if (blocking && !has) {
      await chrome.scripting.registerContentScripts([
        {
          id: SITE_BLOCKER_SCRIPT_ID,
          matches: ['http://*/*', 'https://*/*'],
          js: ['siteBlocker.js'],
          runAt: 'document_start',
          allFrames: false,
          persistAcrossSessions: true,
        },
      ]);
    } else if (!blocking && has) {
      await chrome.scripting.unregisterContentScripts({ ids: [SITE_BLOCKER_SCRIPT_ID] });
    }
  } catch (err) {
    console.error('Daywinner site blocker registration failed', err);
  }
}

async function scheduleEnforceAlarm(blocking) {
  await chrome.alarms.clear(ENFORCE_ALARM);
  if (!blocking) return;
  // Chrome may clamp sub-minute periods; still request frequent enforce passes.
  chrome.alarms.create(ENFORCE_ALARM, { periodInMinutes: 1 });
}

async function redirectTabIfBlocked(tabId, url, domains) {
  if (!tabId || !url || !domains?.length) return false;
  let hostname;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    hostname = parsed.hostname;
  } catch {
    return false;
  }

  const domain = matchBlockedDomain(hostname, domains);
  if (!domain) return false;

  // Inject SPA trap first so in-tab clicks get caught even if update is slow/fails.
  await injectSiteBlocker(tabId);

  try {
    await chrome.tabs.update(tabId, { url: blockedPageUrl(domain) });
    return true;
  } catch {
    return false;
  }
}

/** DNR misses SW-served loads (X); force + in-page trap covers new tabs and SPA. */
async function enforceBlockedTabs(state) {
  if (!isActiveBlockingState(state)) return;
  const tabs = await chrome.tabs.query({});
  await Promise.all(
    tabs.map(async tab => {
      if (!tab.id) return;
      const url = tab.url || tab.pendingUrl;
      if (url) {
        await redirectTabIfBlocked(tab.id, url, state.domains);
        return;
      }
      await injectSiteBlocker(tab.id);
    })
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
      // main_frame = top-level tabs; sub_frame = embeds (YouTube player on other sites, etc.)
      resourceTypes: ['main_frame', 'sub_frame'],
    },
  }));

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: removeIds,
    addRules,
  });
}

/**
 * Heal desync: MV3 SW can die between storage writes and DNR updates.
 * Stale DNR + storage.blocking=false → new X tabs load (SW bypasses DNR) while
 * logout/network hits still redirect. Always make DNR match storage.
 */
async function reconcileRulesWithStorage(state) {
  const current = state || (await getStoredState());
  await updateRules(current);
  return current;
}

async function handlePossibleBlockedNavigation(details) {
  if (details.frameId !== 0) return;
  if (!details.url || details.url.startsWith('chrome-extension://')) return;

  const state = await getStoredState();
  if (!isActiveBlockingState(state)) {
    // Clear any leftover DNR rules from a killed clear() mid-flight.
    await reconcileRulesWithStorage(state);
    return;
  }

  await redirectTabIfBlocked(details.tabId, details.url, state.domains);
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

  const active = isActiveBlockingState(state);

  // When turning OFF: remove DNR first so a SW death can't leave stale redirect rules.
  // When turning ON: persist storage first so document_start siteBlocker sees blocking=true.
  if (!active) {
    await updateRules(state);
    await chrome.storage.local.set({ focusState: state });
    await syncSiteBlockerRegistration(false);
    await scheduleEnforceAlarm(false);
  } else {
    await chrome.storage.local.set({ focusState: state });
    await syncSiteBlockerRegistration(true);
    await scheduleEnforceAlarm(true);
    // Kick open tabs before/around DNR — X SW often bypasses DNR on new tabs.
    await enforceBlockedTabs(state);
    await updateRules(state);
    // Second pass after rules settle (new tab races).
    await enforceBlockedTabs(state);
  }

  await chrome.alarms.clear('sessionEnd');
  if (!state.timerPaused && active && state.sessionEndsAt && state.sessionEndsAt > Date.now()) {
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
  const state = await getStoredState();
  if (!state.timerPaused && state.sessionEndsAt && state.sessionEndsAt <= Date.now()) {
    await applySync(clearPayload());
  } else {
    await chrome.storage.local.set({ focusState: state });
    await reconcileRulesWithStorage(state);
    await syncSiteBlockerRegistration(isActiveBlockingState(state));
    await scheduleEnforceAlarm(isActiveBlockingState(state));
    await enforceBlockedTabs(state);
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
    return;
  }

  if (alarm.name === ENFORCE_ALARM) {
    void (async () => {
      const state = await getStoredState();
      if (!isActiveBlockingState(state)) {
        await reconcileRulesWithStorage(state);
        await chrome.alarms.clear(ENFORCE_ALARM);
        return;
      }
      await reconcileRulesWithStorage(state);
      await enforceBlockedTabs(state);
    })();
  }
});

// Earlier than onCommitted — catches new tabs before paint when possible.
chrome.webNavigation.onBeforeNavigate.addListener(details => {
  void handlePossibleBlockedNavigation(details);
});

chrome.webNavigation.onCommitted.addListener(details => {
  void handlePossibleBlockedNavigation(details);
});

chrome.webNavigation.onHistoryStateUpdated.addListener(details => {
  void handlePossibleBlockedNavigation(details);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const url = changeInfo.url || (changeInfo.status === 'loading' ? tab.url : null);
  if (!url) return;
  void (async () => {
    const state = await getStoredState();
    if (!isActiveBlockingState(state)) {
      if (changeInfo.status === 'loading') {
        await reconcileRulesWithStorage(state);
      }
      return;
    }
    await redirectTabIfBlocked(tabId, url, state.domains);
  })();
});

chrome.tabs.onCreated.addListener(tab => {
  void (async () => {
    const state = await getStoredState();
    if (!isActiveBlockingState(state)) return;
    const url = tab.pendingUrl || tab.url;
    if (url) {
      await redirectTabIfBlocked(tab.id, url, state.domains);
      return;
    }
    if (tab.id) await injectSiteBlocker(tab.id);
  })();
});

chrome.runtime.onStartup.addListener(() => {
  restoreFromStorage();
});

chrome.runtime.onInstalled.addListener(() => {
  restoreFromStorage();
});

// Re-heal if SW wakes for any reason after a partial clear/enable.
void restoreFromStorage();
