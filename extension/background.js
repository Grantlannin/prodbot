const RULE_ID_BASE = 10000;

async function getStoredState() {
  const data = await chrome.storage.local.get(['focusState']);
  return (
    data.focusState || {
      blocking: false,
      domains: [],
      sessionEndsAt: null,
      lockMode: null,
      sessionId: null,
    }
  );
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
  const state = {
    blocking: !!payload.blocking,
    domains: Array.isArray(payload.domains) ? payload.domains : [],
    sessionEndsAt: payload.sessionEndsAt || null,
    lockMode: payload.lockMode || null,
    sessionId: payload.sessionId || null,
  };

  await chrome.storage.local.set({ focusState: state });
  await updateRules(state);

  await chrome.alarms.clear('sessionEnd');
  if (state.blocking && state.sessionEndsAt && state.sessionEndsAt > Date.now()) {
    chrome.alarms.create('sessionEnd', { when: state.sessionEndsAt });
  }
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
  // produc content script polls GET_PENDING_INFRACTIONS — no tabs permission needed
}

async function restoreFromStorage() {
  const state = await getStoredState();
  if (state.sessionEndsAt && state.sessionEndsAt <= Date.now()) {
    await applySync({
      blocking: false,
      domains: [],
      sessionEndsAt: null,
      lockMode: null,
      sessionId: null,
    });
    return;
  }

  await updateRules(state);
  if (state.blocking && state.sessionEndsAt && state.sessionEndsAt > Date.now()) {
    chrome.alarms.create('sessionEnd', { when: state.sessionEndsAt });
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'SYNC') {
    applySync(msg.payload || {})
      .then(() => sendResponse({ ok: true }))
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
      .catch(err => sendResponse([]));
    return true;
  }

  if (msg.type === 'CLEAR_PENDING_INFRACTIONS') {
    chrome.storage.local
      .set({ pendingInfractions: [] })
      .then(() => sendResponse({ ok: true }))
      .catch(err => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  return false;
});

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name !== 'sessionEnd') return;
  applySync({
    blocking: false,
    domains: [],
    sessionEndsAt: null,
    lockMode: null,
    sessionId: null,
  });
});

chrome.runtime.onStartup.addListener(() => {
  restoreFromStorage();
});

chrome.runtime.onInstalled.addListener(() => {
  restoreFromStorage();
});
