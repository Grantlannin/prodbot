#!/usr/bin/env node
/**
 * Build a Chrome Web Store upload zip from extension/.
 * Excludes dev files, README, and macOS junk.
 *
 * Usage: node scripts/package-extension-store.mjs
 * Output: public/daywinner.zip + public/daywinner-1.1.9.zip (version from manifest)
 */

import { execSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const extDir = join(root, 'extension');
const outDir = join(root, 'public');
const outZip = join(outDir, 'daywinner.zip');

if (!existsSync(extDir)) {
  console.error('extension/ folder not found');
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(join(extDir, 'manifest.json'), 'utf8'));
const version = String(manifest.version || '0.0.0');
const versionedZip = join(outDir, `daywinner-${version}.zip`);

mkdirSync(outDir, { recursive: true });

const required = [
  'manifest.json',
  'background.js',
  'content.js',
  'blocked.html',
  'blocked.js',
  'pingOverlay.js',
  'icons/icon16.png',
  'icons/icon48.png',
  'icons/icon128.png',
];
const optional = ['siteBlocker.js'];

for (const f of required) {
  const p = join(extDir, f);
  if (!existsSync(p)) {
    console.error(`Missing required file: extension/${f}`);
    process.exit(1);
  }
}

const files = [...required, ...optional.filter(f => existsSync(join(extDir, f)))];

execSync(`rm -f "${outZip}" "${versionedZip}"`, { stdio: 'inherit' });
execSync(
  `cd "${extDir}" && zip -r "${outZip}" ${files.map(f => JSON.stringify(f)).join(' ')} -x "*.DS_Store"`,
  { stdio: 'inherit' }
);
copyFileSync(outZip, versionedZip);

console.log(`\nStore package ready: ${versionedZip}`);
console.log(`Also wrote: ${outZip}`);
console.log('Upload the versioned zip in Chrome Web Store Developer Dashboard → Package → Upload new package');