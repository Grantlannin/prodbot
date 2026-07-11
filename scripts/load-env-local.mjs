import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

/** Load .env.local into process.env (does not overwrite existing vars). */
export function loadEnvLocal(root = process.cwd()) {
  const path = resolve(root, '.env.local');
  if (!existsSync(path)) return false;

  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (
      value &&
      (process.env[key] === undefined || process.env[key] === '')
    ) {
      process.env[key] = value;
    }
  }
  return true;
}
