// Pure energy-chart logic — front spec §7.3 + §13.3 (mapping) + RG-4 (freshness).
import { GOLD_ASSETS, buildProxyRequest } from '../../src/lib/gold-access.js';

export const WINDOWS = { '24h': 24 * 3600e3, '7d': 7 * 24 * 3600e3, '30d': 30 * 24 * 3600e3 };

// Window selector 24 h / 7 d / 30 d → {from, to} ISO 8601 (DSP/proxy contract).
export function selectWindow(range, now = new Date()) {
  const ms = WINDOWS[range];
  if (!ms) throw new Error(`unknown range: ${range} (expected: ${Object.keys(WINDOWS).join(' | ')})`);
  return { from: new Date(now.getTime() - ms).toISOString(), to: now.toISOString() };
}

// Access path by metric: voluminous hourly → proxy, aggregates → published LDP container.
export function metricAccess(metric) {
  const asset = GOLD_ASSETS[metric];
  if (!asset) throw new Error(`unknown metric: ${metric}`);
  return asset.published ? { via: 'ldp', container: asset.container } : { via: 'proxy' };
}

// Proxy call (C1.9) for an hourly metric.
export function metricQuery(metric, range, now) {
  const { from, to } = selectWindow(range, now);
  return buildProxyRequest({ assetId: metric, from, to });
}

// Chart series: signed net_grid (positive consumption / negative injection, two colors).
export function buildSeries(rows, metric) {
  const labels = rows.map((r) => r.hour ?? r.ts_hour ?? r.ts ?? '');
  if (metric === 'net_grid_hourly') {
    return {
      labels,
      datasets: [
        { label: 'consumption (kW)', data: rows.map((r) => Math.max(0, r.net_grid_kw ?? 0)) },
        { label: 'injection (kW)', data: rows.map((r) => Math.min(0, r.net_grid_kw ?? 0)) },
      ],
    };
  }
  if (metric === 'pv_performance_hourly') {
    return { labels, datasets: [{ label: 'PV (W)', data: rows.map((r) => r.power_w ?? 0) }] };
  }
  return { labels, datasets: [{ label: metric, data: rows.map((r) => r.value ?? r.cost ?? 0) }] };
}

// RG-4 freshness badge ("data as of HH:MM — refresh ~10 min").
export function formatFreshness(ts) {
  if (!ts) return 'freshness unknown';
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `data as of ${hh}:${mm} — refresh ~10 min`;
}

export function latestTimestamp(rows) {
  return (rows ?? []).map((r) => r.hour ?? r.ts_hour ?? r.ts ?? '').sort().at(-1) ?? null;
}
