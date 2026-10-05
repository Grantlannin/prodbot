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

  function kick(domain, { passive } = {}) {
    if (!domain) return;
    const params = new URLSearchParams({ site: domain });
    // Already-open tabs kicked when Soft/Hard turns on are not infractions.
    if (passive) params.set('passive', '1');
    const target = chrome.runtime.getURL(`blocked.html?${params.toString()}`);
    if (location.href.startsWith(chrome.runtime.getURL('blocked.html'))) return;
    try {
      location.replace(target);
    } catch {
      location.href = target;
    }
  }

  function enforceFromState(state, { passive } = {}) {
    if (location.protocol !== 'http:' && location.protocol !== 'https:') return;
    if (!state?.blocking || !state.domains?.length) return;
    const domain = matchBlockedDomain(location.hostname, state.domains);
    if (domain) kick(domain, { passive: !!passive });
  }

  // Page load / navigation while already locked → real attempt (counts as infraction).
  chrome.storage.local.get(['focusState'], data => {
    enforceFromState(data.focusState, { passive: false });
  });

  // Lock turned on (or list changed) under an already-open tab → kick, but not an infraction.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes.focusState) return;
    enforceFromState(changes.focusState.newValue, { passive: true });
  });
})();
