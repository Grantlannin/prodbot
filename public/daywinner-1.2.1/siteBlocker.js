/**
 * Runs on every http(s) page (manifest content_script).
 * Full loads redirect immediately; SPA clicks (X notifications, etc.) are trapped too.
 * DNR alone is not enough — X's service worker can serve new tabs without hitting DNR.
 */
(function daywinnerSiteBlocker() {
  if (window.__daywinnerSiteBlockerActive) return;
  window.__daywinnerSiteBlockerActive = true;

  let activeDomain = null;
  let historyWrapped = false;
  let pollTimer = null;

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

  function kick(domain) {
    if (!domain) return;
    const target = chrome.runtime.getURL(`blocked.html?site=${encodeURIComponent(domain)}`);
    if (location.href.startsWith(chrome.runtime.getURL('blocked.html'))) return;
    try {
      location.replace(target);
    } catch {
      location.href = target;
    }
  }

  function go() {
    if (!activeDomain) return;
    kick(activeDomain);
  }

  function ensureSpaTrap() {
    if (historyWrapped) return;
    historyWrapped = true;
    try {
      const wrap = orig =>
        function wrappedHistoryMethod(...args) {
          const result = orig.apply(this, args);
          go();
          return result;
        };
      history.pushState = wrap(history.pushState.bind(history));
      history.replaceState = wrap(history.replaceState.bind(history));
    } catch {
      /* ignore */
    }
    window.addEventListener('popstate', go);
    window.addEventListener('hashchange', go);
  }

  function enforceFromState(state) {
    if (location.protocol !== 'http:' && location.protocol !== 'https:') return;

    if (!state?.blocking || !state.domains?.length) {
      activeDomain = null;
      if (pollTimer) {
        window.clearInterval(pollTimer);
        pollTimer = null;
      }
      return;
    }

    const domain = matchBlockedDomain(location.hostname, state.domains);
    if (!domain) {
      activeDomain = null;
      if (pollTimer) {
        window.clearInterval(pollTimer);
        pollTimer = null;
      }
      return;
    }

    activeDomain = domain;
    ensureSpaTrap();
    if (!pollTimer) {
      // Backup for client routers / page-world history that isolated world can't wrap
      pollTimer = window.setInterval(go, 300);
    }
    go();
  }

  chrome.storage.local.get(['focusState'], data => {
    enforceFromState(data.focusState);
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes.focusState) return;
    enforceFromState(changes.focusState.newValue);
  });
})();
