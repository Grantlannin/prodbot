function getQuery() {
  return new URLSearchParams(window.location.search);
}

function getSiteFromQuery(params) {
  return (params.get('site') || 'this site').trim().toLowerCase().replace(/^www\./, '');
}

function formatRemaining(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

const params = getQuery();
const site = getSiteFromQuery(params);
const passiveKick = params.get('passive') === '1';
document.getElementById('site-label').textContent = site;

// Lock-on kicks of already-open tabs are not infractions (passive=1 or grace in background).
if (!passiveKick) {
  chrome.runtime.sendMessage({ type: 'LOG_INFRACTION', domain: site }).catch(() => {});
}

function updateRemaining() {
  chrome.runtime.sendMessage({ type: 'GET_STATE' }, state => {
    if (state?.timerPaused && state.remainingMs != null) {
      document.getElementById('remaining').textContent = formatRemaining(state.remainingMs);
      return;
    }
    const endsAt = state?.sessionEndsAt;
    if (!endsAt) {
      document.getElementById('remaining').textContent = '--:--';
      return;
    }
    document.getElementById('remaining').textContent = formatRemaining(endsAt - Date.now());
  });
}

updateRemaining();
setInterval(updateRemaining, 1000);
