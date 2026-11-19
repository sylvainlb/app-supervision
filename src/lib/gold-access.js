// Deux voies d'accès aux données gold — spec front §9 + mapping définitif §13.3.
// Règle absolue §13.1 : jamais de HMAC côté navigateur, jamais d'appel direct /dsp/data.
// Le proxy ORCE POST /app/query signe côté serveur (spec fap-light C1.9 / D-8 / CA-S10).

export const GOLD_ASSETS = {
  anomaly_candidates: { published: true, container: '/gold/anomaly_candidates/' },
  city_dashboard_summary: { published: true, container: '/gold/city_dashboard_summary/' },
  energy_cost_daily: { published: true, container: '/gold/energy_cost_daily/' },
  net_grid_hourly: { published: false }, // volume horaire → proxy uniquement
  pv_performance_hourly: { published: false }, // volume horaire → proxy uniquement
};

export function accessPlan(assetId) {
  const asset = GOLD_ASSETS[assetId];
  if (!asset) throw new Error(`asset gold inconnu du mapping §13.3: ${assetId}`);
  return asset.published
    ? { via: 'ldp', container: asset.container }
    : { via: 'proxy', container: null };
}

// Contrat proxy C1.9 : POST /app/query (auth session OIDC/DPoP), body {assetId, from, to},
// réponse identique à /dsp/data, rate limit 60 req/min/utilisateur, audit dsp_access_audit.
export function buildProxyRequest({ assetId, from, to }) {
  if (accessPlan(assetId).via !== 'proxy') {
    throw new Error(`${assetId} est publié en conteneur LDP (§13.3) : lecture LDP directe, pas de proxy`);
  }
  if (!assetId || !from || !to) throw new Error('body proxy incomplet: {assetId, from, to} requis');
  return {
    method: 'POST',
    url: '/app/query',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assetId, from, to }),
  };
}
