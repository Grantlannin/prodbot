window.addEventListener('message', event => {
  if (event.source !== window) return;

  if (event.data?.type === 'PRODUC_FOCUS_PING') {
    window.postMessage({ type: 'PRODUC_FOCUS_PONG' }, window.location.origin);
    return;
  }

  if (event.data?.type !== 'PRODUC_FOCUS_SYNC') return;
  chrome.runtime.sendMessage({ type: 'SYNC', payload: event.data.payload }).catch(() => {});
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
  window.postMessage({ type: 'PRODUC_FOCUS_SYNC', payload: CLEAR_PAYLOAD }, window.location.origin);
}

async function checkSubscriptionEntitlement() {
  try {
    const res = await fetch('/api/billing/status', { credentials: 'same-origin' });
    if (!res.ok) return;
    const data = await res.json();
    if (data.billingEnabled && !data.active) {
      postClearSync();
    }
  } catch {
    /* ignore */
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

flushPendingInfractions();
setInterval(flushPendingInfractions, 2000);
void checkSubscriptionEntitlement();
setInterval(checkSubscriptionEntitlement, 60_000);
