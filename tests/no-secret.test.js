// Règle absolue §13.1 : aucun secret HMAC embarqué dans le JS du front,
// aucun appel direct au data plane /dsp/data depuis le navigateur.
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

// Scanner le code, pas les commentaires (la doc peut citer l'interdit).
function stripComments(content) {
  return content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

function codeOf(file) {
  return stripComments(readFileSync(file, 'utf8'));
}

test('§13.1 : aucun secret HMAC ni header DSP dans le code front', () => {
  for (const file of FRONT_SOURCES) {
    const content = codeOf(file);
    assert.ok(!content.includes('DSP_HMAC_SECRET'), `secret HMAC référencé dans ${file}`);
    assert.ok(!content.includes('X-DSP-Signature'), `signature HMAC côté client dans ${file}`);
    assert.ok(!content.includes('X-DSP-Agreement'), `header DSP côté client dans ${file}`);
  }
});

test('§13.1/§9 : le front n appelle jamais /dsp/data directement (proxy /app/query uniquement)', () => {
  for (const file of FRONT_SOURCES) {
    const content = codeOf(file);
    assert.ok(!content.includes('/dsp/data'), `appel direct /dsp/data dans ${file}`);
  }
});
