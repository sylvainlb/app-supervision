// Two access paths to gold data — front spec §9 + definitive mapping §13.3.
// Absolute rule §13.1: never any HMAC in the browser, never a direct /dsp/data call.
// The ORCE proxy POST /app/query signs server-side (fap-light spec C1.9 / D-8 / CA-S10).
// The client being self-contained (served by vite, not by the back), the call goes
// ABSOLUTE to the pod (cross-origin, CORS handled by the back) — never relative.
import { config } from '../config.js';

export const GOLD_ASSETS = {
  anomaly_candidates: { published: true, container: '/gold/anomaly_candidates/' },
  city_dashboard_summary: { published: true, container: '/gold/city_dashboard_summary/' },
  energy_cost_daily: { published: true, container: '/gold/energy_cost_daily/' },
  // hourly volume → proxy only; assetId = DSP catalogue id (dataset:facis:…)
  net_grid_hourly: { published: false, datasetId: 'dataset:facis:net-grid-hourly', table: 'net_grid_hourly' },
  pv_performance_hourly: { published: false, datasetId: 'dataset:facis:energy-balance-hourly', table: 'energy_balance_hourly' },
};

// Contract (dsp_agreements): pod's internal agreement, active, rate limit 10/min.
export const DSP_AGREEMENT = 'agreement:internal:framework-contract';

export function accessPlan(assetId) {
  const asset = GOLD_ASSETS[assetId];
  if (!asset) throw new Error(`gold asset unknown to the §13.3 mapping: ${assetId}`);
  return asset.published
    ? { via: 'ldp', container: asset.container }
    : { via: 'proxy', container: null, datasetId: asset.datasetId };
}

// Proxy contract C1.9: POST /app/query (OIDC session auth), body {agreement, assetId, from, to},
// response identical to /dsp/data, per-user rate limit, dsp_access_audit audit trail.
// assetId = DSP catalogue id (dataset:facis:…), not the table name.
export function buildProxyRequest({ assetId, from, to }) {
  const plan = accessPlan(assetId);
  if (plan.via !== 'proxy') {
    throw new Error(`${assetId} is published in an LDP container (§13.3): direct LDP read, no proxy`);
  }
  if (!assetId || !from || !to) throw new Error('incomplete proxy body: {assetId, from, to} required');
  return {
    method: 'POST',
    url: `${config.podUrl.replace(/\/+$/, '')}/app/query`,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agreement: DSP_AGREEMENT, assetId: plan.datasetId ?? assetId, from, to }),
  };
}

// Proxy call with the session's authenticated fetch (fetchAuthn injected by sib-auth, §13.7).
// 429 → backoff (spec §2/§10); other errors → dspace:Error body forwarded.
export async function queryGold(fetchFn, params) {
  const req = buildProxyRequest(params);
  const res = await fetchFn(req.url, { method: req.method, headers: req.headers, body: req.body });
  if (res.status === 429) {
    const err = new Error('proxy rate limit (60 req/min) — backoff');
    err.status = 429;
    throw err;
  }
  if (!res.ok) {
    const err = new Error(`proxy /app/query: ${res.status}`);
    err.status = res.status;
    err.body = await res.json().catch(() => null);
    throw err;
  }
  return res.json();
}
