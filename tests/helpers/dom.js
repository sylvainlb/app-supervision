// Helper DOM pour tests de composants : happy-dom + window.sibStore mocké.
// Chaque fichier de test node --test tourne dans son propre process : safe.
import { Window } from 'happy-dom';

const FORCE = new Set([
  'Event', 'CustomEvent', 'EventTarget', 'Node', 'Element', 'HTMLElement', 'Document',
  'DocumentFragment', 'ShadowRoot', 'MutationObserver', 'NodeList', 'HTMLInputElement',
  'HTMLSelectElement', 'HTMLButtonElement', 'navigator', 'getComputedStyle',
  'requestAnimationFrame', 'cancelAnimationFrame', 'CSSStyleSheet', 'Range', 'Selection',
]);

export function setupDom() {
  const window = new Window();
  for (const k of Object.getOwnPropertyNames(window)) {
    if ((FORCE.has(k) || globalThis[k] === undefined) && window[k] !== undefined) {
      try { Object.defineProperty(globalThis, k, { value: window[k], configurable: true, writable: true }); } catch { /* read-only */ }
    }
  }
  globalThis.window = window;
  globalThis.self = window;
  globalThis.document = window.document;
  return window;
}

// sibStore mocké : getData retourne data[url], mutations journalisées dans calls.
export function mockSibStore(window, data = {}) {
  const calls = [];
  window.sibStore = {
    calls,
    getData: async (url) => {
      calls.push(['get', url]);
      if (data[url] instanceof Error) throw data[url];
      return data[url];
    },
    // getJson() (boilerplate) passe par fetchAuthn : on sert la même mappe en Response-like
    fetchAuthn: async (url, init = {}) => {
      const u = String(url);
      calls.push(['get', u, init]);
      if (data[u] instanceof Error) throw data[u];
      if (u in data) return { ok: true, status: 200, json: async () => data[u] };
      return { ok: false, status: 404, json: async () => ({ error: 'not found' }) };
    },
    post: async (url, body) => { calls.push(['post', url, body]); return { '@id': `${url}1` }; },
    put: async (url, body) => { calls.push(['put', url, body]); return {}; },
    patch: async (url, body) => {
      calls.push(['patch', url, body]);
      if (data.__patchError) throw data.__patchError;
      return {};
    },
    delete: async (url) => { calls.push(['delete', url]); return {}; },
  };
  return calls;
}

export function fireOrbitReady() {
  document.dispatchEvent(new Event('orbit-ready'));
}

export async function mount(tag, attrs = {}) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) el[k] = v;
  document.body.appendChild(el);
  fireOrbitReady();
  await el.updateComplete;
  await new Promise((r) => setTimeout(r, 0)); // laisse la Task résoudre
  await el.updateComplete;
  return el;
}
