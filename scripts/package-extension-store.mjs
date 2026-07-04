#!/usr/bin/env node
/**
 * Build a Chrome Web Store upload zip from extension/.
 * Excludes dev files, README, and macOS junk.
 *
 * Usage: node scripts/package-extension-store.mjs
 * Output: public/daywinner.zip
 */

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const extDir = join(root, 'extension');
const outDir = join(root, 'public');
const outZip = join(outDir, 'daywinner.zip');

if (!existsSync(extDir)) {
  console.error('extension/ folder not found');
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

const files = [
  'manifest.json',
  'background.js',
  'content.js',
  'blocked.html',
  'blocked.js',
  'icons/icon16.png',
  'icons/icon48.png',
  'icons/icon128.png',
];

for (const f of files) {
  const p = join(extDir, f);
  if (!existsSync(p)) {
    console.error(`Missing required file: extension/${f}`);
    process.exit(1);
  }
}

execSync(`rm -f "${outZip}"`, { stdio: 'inherit' });
execSync(
  `cd "${extDir}" && zip -r "${outZip}" ${files.map(f => JSON.stringify(f)).join(' ')} -x "*.DS_Store"`,
  { stdio: 'inherit' }
);

console.log(`\nStore package ready: ${outZip}`);
console.log('Upload this file in Chrome Web Store Developer Dashboard → Package → Upload new package');
