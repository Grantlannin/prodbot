/** Client mirror of server cloud_enabled (refreshed on login). */
export const CLOUD_SYNC_ENABLED_KEY = 'agentHQ_cloudSyncEnabled';

/** Max JSON payload size per upsert (~5 MB). */
export const MAX_SYNC_PAYLOAD_BYTES = 5 * 1024 * 1024;

export const SYNC_DEBOUNCE_MS = 3000;
