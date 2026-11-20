// Deux voies d'accès aux données gold — spec front §9 + mapping définitif §13.3.
// Règle absolue §13.1 : jamais de HMAC côté navigateur, jamais d'appel direct /dsp/data.
// Le proxy ORCE POST /app/query signe côté serveur (spec fap-light C1.9 / D-8 / CA-S10).
// Le client étant autonome (servi par vite, pas par le back), l'appel part en ABSOLU
// vers le pod (cross-origin, CORS géré par le back) — jamais en relatif.
import { config } from '../config.js';

export const GOLD_ASSETS = {
  anomaly_candidates: { published: true, container: '/gold/anomaly_candidates/' },
  city_dashboard_summary: { published: true, container: '/gold/city_dashboard_summary/' },
  energy_cost_daily: { published: true, container: '/gold/energy_cost_daily/' },
  // volume horaire → proxy uniquement ; assetId = id catalogue DSP (dataset:facis:…)
  net_grid_hourly: { published: false, datasetId: 'dataset:facis:net-grid-hourly', table: 'net_grid_hourly' },
  pv_performance_hourly: { published: false, datasetId: 'dataset:facis:energy-balance-hourly', table: 'energy_balance_hourly' },
};

// Contrat (dsp_agreements) : agreement interne du pod, actif, rate limit 10/min.
export const DSP_AGREEMENT = 'agreement:interne:contrat-cadre';

export function accessPlan(assetId) {
  const asset = GOLD_ASSETS[assetId];
  if (!asset) throw new Error(`asset gold inconnu du mapping §13.3: ${assetId}`);
  return asset.published
    ? { via: 'ldp', container: asset.container }
    : { via: 'proxy', container: null, datasetId: asset.datasetId };
}

// Contrat proxy C1.9 : POST /app/query (auth session OIDC), body {agreement, assetId, from, to},
// réponse identique à /dsp/data, rate limit par utilisateur, audit dsp_access_audit.
// assetId = id du catalogue DSP (dataset:facis:…), pas le nom de table.
export function buildProxyRequest({ assetId, from, to }) {
  const plan = accessPlan(assetId);
  if (plan.via !== 'proxy') {
    throw new Error(`${assetId} est publié en conteneur LDP (§13.3) : lecture LDP directe, pas de proxy`);
  }
  if (!assetId || !from || !to) throw new Error('body proxy incomplet: {assetId, from, to} requis');
  return {
    method: 'POST',
    url: `${config.podUrl.replace(/\/+$/, '')}/app/query`,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agreement: DSP_AGREEMENT, assetId: plan.datasetId ?? assetId, from, to }),
  };
}

// Appel du proxy avec le fetch authentifié de session (fetchAuthn injecté par sib-auth, §13.7).
// 429 → backoff (spec §2/§10) ; autres erreurs → body dspace:Error transmis.
export async function queryGold(fetchFn, params) {
  const req = buildProxyRequest(params);
  const res = await fetchFn(req.url, { method: req.method, headers: req.headers, body: req.body });
  if (res.status === 429) {
    const err = new Error('rate limit proxy (60 req/min) — backoff');
    err.status = 429;
    throw err;
  }
  if (!res.ok) {
    const err = new Error(`proxy /app/query : ${res.status}`);
    err.status = res.status;
    err.body = await res.json().catch(() => null);
    throw err;
  }
  return res.json();
}
