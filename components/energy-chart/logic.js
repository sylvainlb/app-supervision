// Logique pure energy-chart — spec front §7.3 + §13.3 (mapping) + RG-4 (fraîcheur).
import { GOLD_ASSETS, buildProxyRequest } from '../../src/lib/gold-access.js';

export const WINDOWS = { '24h': 24 * 3600e3, '7d': 7 * 24 * 3600e3, '30d': 30 * 24 * 3600e3 };

// Sélecteur de fenêtre 24 h / 7 j / 30 j → {from, to} ISO 8601 (contrat DSP/proxy).
export function selectWindow(range, now = new Date()) {
  const ms = WINDOWS[range];
  if (!ms) throw new Error(`fenêtre inconnue: ${range} (attendu: ${Object.keys(WINDOWS).join(' | ')})`);
  return { from: new Date(now.getTime() - ms).toISOString(), to: now.toISOString() };
}

// Voie d'accès selon le metric : hourly volumineux → proxy, agrégats → conteneur LDP publié.
export function metricAccess(metric) {
  const asset = GOLD_ASSETS[metric];
  if (!asset) throw new Error(`metric inconnu: ${metric}`);
  return asset.published ? { via: 'ldp', container: asset.container } : { via: 'proxy' };
}

// Appel proxy (C1.9) pour un metric horaire.
export function metricQuery(metric, range, now) {
  const { from, to } = selectWindow(range, now);
  return buildProxyRequest({ assetId: metric, from, to });
}

// Série graphique : net_grid signée (conso positive / injection négative, deux couleurs).
export function buildSeries(rows, metric) {
  const labels = rows.map((r) => r.ts_hour ?? r.ts ?? '');
  if (metric === 'net_grid_hourly') {
    return {
      labels,
      datasets: [
        { label: 'conso (kW)', data: rows.map((r) => Math.max(0, r.net_grid_kw ?? 0)) },
        { label: 'injection (kW)', data: rows.map((r) => Math.min(0, r.net_grid_kw ?? 0)) },
      ],
    };
  }
  if (metric === 'pv_performance_hourly') {
    return { labels, datasets: [{ label: 'PV (W)', data: rows.map((r) => r.power_w ?? 0) }] };
  }
  return { labels, datasets: [{ label: metric, data: rows.map((r) => r.value ?? r.cost ?? 0) }] };
}

// Badge de fraîcheur RG-4 (« données à HH:MM — refresh ~10 min »).
export function formatFreshness(ts) {
  if (!ts) return 'fraîcheur inconnue';
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `données à ${hh}:${mm} — refresh ~10 min`;
}

export function latestTimestamp(rows) {
  return (rows ?? []).map((r) => r.ts_hour ?? r.ts ?? '').sort().at(-1) ?? null;
}
