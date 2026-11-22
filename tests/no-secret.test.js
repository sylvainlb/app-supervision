// Absolute rule §13.1: no HMAC secret embedded in the front JS,
// no direct call to the /dsp/data data plane from the browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (/\.(js|ts|json)$/.test(entry)) yield p;
  }
}

const FRONT_SOURCES = ['src', 'components', 'orbit.json'].flatMap((p) => {
  const abs = join(root, p);
  return statSync(abs).isDirectory() ? [...walk(abs)] : [abs];
});

// Scans code, not comments (the doc may mention the forbidden thing).
function stripComments(content) {
  return content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

function codeOf(file) {
  return stripComments(readFileSync(file, 'utf8'));
}

test('§13.1: no HMAC secret nor DSP header in the front code', () => {
  for (const file of FRONT_SOURCES) {
    const content = codeOf(file);
    assert.ok(!content.includes('DSP_HMAC_SECRET'), `HMAC secret referenced in ${file}`);
    assert.ok(!content.includes('X-DSP-Signature'), `client-side HMAC signature in ${file}`);
    assert.ok(!content.includes('X-DSP-Agreement'), `client-side DSP header in ${file}`);
  }
});

test('§13.1/§9: the front never calls /dsp/data directly (only the /app/query proxy)', () => {
  for (const file of FRONT_SOURCES) {
    const content = codeOf(file);
    assert.ok(!content.includes('/dsp/data'), `direct /dsp/data call in ${file}`);
  }
});
