// Bootstrap Orbit (spec front §4) : sibStore (@startinblox/core) + sib-auth (@startinblox/oidc).
// §13.7 : sib-auth expose un fetch authentifié (fetchAuthn, DPoP) injecté dans sibStore —
// point d'injection unique, aucun appel LDP ne part en clair hors session.
// Les composants custom attendent `orbit-ready` avant init (convention boilerplate §6.2).
import '@startinblox/core';
import { config } from './config';

declare global {
  interface Window {
    orbit?: { ready?: Promise<void> };
    sibStore?: Record<string, unknown> & { getData: (url: string) => Promise<unknown> };
  }
}

async function main(): Promise<void> {
  const sibAuth = document.querySelector('sib-auth') as (HTMLElement & { fetchAuthn?: typeof fetch }) | null;
  if (sibAuth?.fetchAuthn && window.sibStore) {
    (window.sibStore as { fetchAuthn?: typeof fetch }).fetchAuthn = sibAuth.fetchAuthn.bind(sibAuth);
  }
  await window.orbit?.ready;
  document.dispatchEvent(new CustomEvent('orbit-ready'));
  console.info(`[app-supervision] pod=${config.podUrl} issuer=${config.oidcIssuer}`);
}

main();
