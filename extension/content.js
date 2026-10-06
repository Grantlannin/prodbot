let lastEntitled = null; // null = unknown; don't clear Soft/Hard until billing answers
let lastPayload = null;
let entitlementReady = false;

function forwardSync(payload) {
  chrome.runtime.sendMessage({ type: 'SYNC', payload }).catch(() => {});
}

function forwardTimeStudySync(payload) {
  chrome.runtime.sendMessage({ type: 'SYNC_TIME_STUDY', payload }, response => {
    const err = chrome.runtime.lastError;
    window.postMessage(
      {
        type: 'PRODUC_TIME_STUDY_ACK',
        ok: !err && response?.ok !== false,
        error: err?.message || response?.error || null,
        pingNow: !!payload?.pingNow,
        notified: !!response?.notified,
        overlay: !!response?.overlay,
        method: response?.method || null,
        permission: response?.permission || null,
      },
      window.location.origin
    );
  });
}

window.addEventListener('message', event => {
  if (event.source !== window) return;

  if (event.data?.type === 'PRODUC_FOCUS_PING') {
    window.postMessage({ type: 'PRODUC_FOCUS_PONG' }, window.location.origin);
    return;
  }

  if (event.data?.type === 'PRODUC_TIME_STUDY_SYNC') {
    const incoming = event.data.payload && typeof event.data.payload === 'object' ? event.data.payload : {};
    forwardTimeStudySync({
      enabled: !!incoming.enabled,
      intervalMinutes: Number(incoming.intervalMinutes) || 30,
      sessionActive: incoming.sessionActive,
      pingNow: !!incoming.pingNow,
    });
    return;
  }

  if (event.data?.type !== 'PRODUC_FOCUS_SYNC') return;

  // Never trust page-supplied entitlement — only our billing/status check.
  const incoming = event.data.payload && typeof event.data.payload === 'object' ? event.data.payload : {};
  lastPayload = { ...incoming };

  // Until billing answers, hold the sync (don't forward entitled:false and wipe DNR).
  if (!entitlementReady) return;

  forwardSync({ ...lastPayload, entitled: lastEntitled === true });
});

const CLEAR_PAYLOAD = {
  blocking: false,
  domains: [],
  sessionEndsAt: null,
  lockMode: null,
  sessionId: null,
  timerPaused: false,
  remainingMs: null,
  entitled: false,
};

function postClearSync() {
  lastEntitled = false;
  lastPayload = { ...CLEAR_PAYLOAD };
  forwardSync(CLEAR_PAYLOAD);
}

async function checkSubscriptionEntitlement() {
  try {
    const res = await fetch('/api/billing/status', { credentials: 'same-origin' });
    if (!res.ok) {
      // Keep last known entitlement on blips — wiping Soft/Hard mid-session was
      // leaving refresh unblocked even though the timer still looked locked.
      entitlementReady = true;
      return;
    }
    const data = await res.json();
    const next = data.billingEnabled ? !!data.active : true;
    const changed = next !== lastEntitled;
    lastEntitled = next;
    entitlementReady = true;

    if (!lastEntitled) {
      postClearSync();
      return;
    }
    // Always re-push when entitled so Soft/Hard DNR rules land after the first billing check
    // (first app sync often arrived while entitled was still unknown and was held).
    if (lastPayload && (changed || lastPayload.blocking)) {
      forwardSync({ ...lastPayload, entitled: true });
    }
  } catch {
    entitlementReady = true;
    /* keep prior entitled state on network errors */
  }
}

function flushPendingInfractions() {
  chrome.runtime.sendMessage({ type: 'GET_PENDING_INFRACTIONS' }, pending => {
    if (!Array.isArray(pending) || pending.length === 0) return;
    for (const infraction of pending) {
      window.postMessage({ type: 'PRODUC_FOCUS_INFRACTION', payload: infraction }, '*');
    }
    chrome.runtime.sendMessage({ type: 'CLEAR_PENDING_INFRACTIONS' }).catch(() => {});
  });
}

function flushPendingCheckIns() {
  chrome.runtime.sendMessage({ type: 'GET_PENDING_CHECKINS' }, pending => {
    if (!Array.isArray(pending) || pending.length === 0) return;
    for (const item of pending) {
      window.postMessage({ type: 'PRODUC_TIME_STUDY_CHECKIN', payload: item }, '*');
    }
    chrome.runtime.sendMessage({ type: 'CLEAR_PENDING_CHECKINS' }).catch(() => {});
  });
}

flushPendingInfractions();
flushPendingCheckIns();
// Poll slowly — empty responses are cheap, but avoid hammering the SW.
setInterval(flushPendingInfractions, 5000);
setInterval(flushPendingCheckIns, 5000);
void checkSubscriptionEntitlement();
setInterval(checkSubscriptionEntitlement, 60_000);
