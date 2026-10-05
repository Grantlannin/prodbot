/**
 * Runs at document_start on http(s) pages.
 * If Soft/Hard blocking is on and this host is blocked, redirect once.
 * Covers new tabs where Chrome's network rules miss (e.g. X service worker).
 * No timers, no all-tab scans — idle unless this page matches.
 */
(function daywinnerSiteBlocker() {
  if (window.__daywinnerSiteBlockerActive) return;
  window.__daywinnerSiteBlockerActive = true;

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

  function enforceFromState(state) {
    if (location.protocol !== 'http:' && location.protocol !== 'https:') return;
    if (!state?.blocking || !state.domains?.length) return;
    const domain = matchBlockedDomain(location.hostname, state.domains);
    if (domain) kick(domain);
  }

  chrome.storage.local.get(['focusState'], data => {
    enforceFromState(data.focusState);
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes.focusState) return;
    enforceFromState(changes.focusState.newValue);
  });
})();
