// Bootstrap Orbit (spec front §4) : les composants custom attendent `orbit-ready`
// avant init (convention boilerplate §6.2).
import { config } from './config';

async function main(): Promise<void> {
  const orbit = (window as unknown as { orbit?: { ready?: Promise<void> } }).orbit;
  await orbit?.ready;
  document.dispatchEvent(new CustomEvent('orbit-ready'));
  console.info(`[app-supervision] pod=${config.podUrl} issuer=${config.oidcIssuer}`);
}

main();
