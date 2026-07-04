window.addEventListener('message', event => {
  if (event.source !== window) return;
  if (event.data?.type !== 'PRODUC_FOCUS_SYNC') return;
  chrome.runtime.sendMessage({ type: 'SYNC', payload: event.data.payload }).catch(() => {});
});

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
