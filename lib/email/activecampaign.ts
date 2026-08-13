/**
 * Sync a buyer email into ActiveCampaign (create/update + subscribe to list).
 * No-ops if ActiveCampaign env vars are missing — Stripe checkout still succeeds.
 */

function getActiveCampaignApiUrl(): string | undefined {
  const raw = process.env.ACTIVECAMPAIGN_API_URL?.trim();
  if (!raw) return undefined;
  // Accept account root or full /api/3 base
  return raw.replace(/\/+$/, '').replace(/\/api\/3$/i, '') + '/api/3';
}

function getActiveCampaignApiKey(): string | undefined {
  return process.env.ACTIVECAMPAIGN_API_KEY?.trim() || undefined;
}

function getActiveCampaignListId(): string | undefined {
  return process.env.ACTIVECAMPAIGN_LIST_ID?.trim() || undefined;
}

export function isActiveCampaignConfigured(): boolean {
  return Boolean(getActiveCampaignApiUrl() && getActiveCampaignApiKey() && getActiveCampaignListId());
}

async function acFetch(path: string, init?: RequestInit): Promise<Response> {
  const base = getActiveCampaignApiUrl();
  const key = getActiveCampaignApiKey();
  if (!base || !key) throw new Error('ActiveCampaign is not configured');

  return fetch(`${base}${path}`, {
    ...init,
    headers: {
      'Api-Token': key,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init?.headers ?? {}),
    },
  });
}

/**
 * Create/update contact by email and subscribe them to the configured list.
 * Failures are logged and swallowed by the caller so webhooks stay resilient.
 */
export async function syncBuyerToActiveCampaign(opts: {
  email: string;
  tags?: string[];
}): Promise<{ ok: boolean; error?: string }> {
  if (!isActiveCampaignConfigured()) {
    return { ok: false, error: 'ActiveCampaign is not configured' };
  }

  const email = opts.email.trim().toLowerCase();
  if (!email || !email.includes('@')) {
    return { ok: false, error: 'Invalid email' };
  }

  const listId = getActiveCampaignListId()!;

  try {
    const syncRes = await acFetch('/contact/sync', {
      method: 'POST',
      body: JSON.stringify({
        contact: {
          email,
        },
      }),
    });

    if (!syncRes.ok) {
      const text = await syncRes.text().catch(() => '');
      return { ok: false, error: `contact/sync ${syncRes.status}: ${text.slice(0, 200)}` };
    }

    const syncJson = (await syncRes.json()) as { contact?: { id?: string | number } };
    const contactId = syncJson.contact?.id != null ? String(syncJson.contact.id) : null;
    if (!contactId) {
      return { ok: false, error: 'contact/sync missing contact id' };
    }

    const listRes = await acFetch('/contactLists', {
      method: 'POST',
      body: JSON.stringify({
        contactList: {
          list: listId,
          contact: contactId,
          status: 1,
        },
      }),
    });

    // 422 often means already subscribed — treat as success
    if (!listRes.ok && listRes.status !== 422) {
      const text = await listRes.text().catch(() => '');
      return { ok: false, error: `contactLists ${listRes.status}: ${text.slice(0, 200)}` };
    }

    if (opts.tags?.length) {
      for (const tagName of opts.tags) {
        await ensureContactTag(contactId, tagName).catch(() => {});
      }
    }

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'ActiveCampaign sync failed',
    };
  }
}

async function ensureContactTag(contactId: string, tagName: string): Promise<void> {
  const tagId = await findOrCreateTagId(tagName);
  if (!tagId) return;

  await acFetch('/contactTags', {
    method: 'POST',
    body: JSON.stringify({
      contactTag: {
        contact: contactId,
        tag: tagId,
      },
    }),
  });
}

async function findOrCreateTagId(tagName: string): Promise<string | null> {
  const search = await acFetch(`/tags?search=${encodeURIComponent(tagName)}`);
  if (search.ok) {
    const json = (await search.json()) as { tags?: Array<{ id?: string; tag?: string }> };
    const match = json.tags?.find(t => t.tag?.toLowerCase() === tagName.toLowerCase());
    if (match?.id) return String(match.id);
  }

  const created = await acFetch('/tags', {
    method: 'POST',
    body: JSON.stringify({
      tag: {
        tag: tagName,
        tagType: 'contact',
      },
    }),
  });
  if (!created.ok) return null;
  const json = (await created.json()) as { tag?: { id?: string } };
  return json.tag?.id != null ? String(json.tag.id) : null;
}
