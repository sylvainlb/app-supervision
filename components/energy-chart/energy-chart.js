// energy-chart — graphique de consommation (spec front §7.3). Base : ComponentObjectHandler → OrbitComponent.
// Attributs : building (IRI), metric (net_grid_hourly | pv_performance_hourly | agrégat publié),
// window (24h | 7d | 30d). Hourly → proxy POST /app/query (§13.3, C1.9) ; agrégats → conteneur LDP publié.
// Badge de fraîcheur RG-4. Chart.js si disponible (window.Chart), sinon tableau repli.
import { html, css } from 'lit';
import Chart from 'chart.js/auto';
import { OrbitComponent, resolveMembers, getJson } from '../boilerplate/index.js';
import { field } from '../../src/lib/context.js';
import { queryGold } from '../../src/lib/gold-access.js';
import { metricAccess, selectWindow, buildSeries, formatFreshness, latestTimestamp, WINDOWS } from './logic.js';

export class EnergyChart extends OrbitComponent {
  static properties = {
    ...OrbitComponent.properties,
    building: { type: String },
    metric: { type: String },
    window: { type: String },
    rows: { type: Array, attribute: false },
  };

  static styles = css`
    ${OrbitComponent.styles}
    .toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
    .toolbar strong { font-size: 1.05rem; font-weight: 700; }
    .freshness { font-size: 0.77rem; font-weight: 600; background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; border-radius: 999px; padding: 4px 11px; }
    .toolbar label { margin-left: auto; font-size: 0.85rem; color: var(--muted); display: inline-flex; align-items: center; gap: 7px; }
    .chart-wrap { height: 320px; background: #fff; border: 1px solid var(--border); border-radius: var(--radius, 14px); box-shadow: var(--shadow); padding: 14px; }
    .chart-wrap canvas { max-height: 100%; }
    details.datatable { margin-top: 12px; font-size: 0.85rem; color: var(--muted); background: #fff; border: 1px solid var(--border); border-radius: 12px; padding: 10px 14px; box-shadow: var(--shadow); }
    details.datatable summary { cursor: pointer; font-weight: 600; }
    table { margin-top: 12px; max-height: 260px; display: block; overflow: auto; box-shadow: none; border: 0; }
  `;

  constructor() {
    super();
    this.building = '';
    this.metric = 'net_grid_hourly';
    this.window = '24h';
    this.rows = [];
  }

  async load() {
    const access = metricAccess(this.metric);
    if (access.via === 'proxy') {
      // Ne jamais extraire la méthode (perd le `this`) : wrapper résolu à l'appel.
      const fetchFn = (u, i) => (window.sibStore?.fetchAuthn ?? fetch)(u, i);
      const res = await queryGold(fetchFn, this._proxyParams());
      // Le proxy renvoie {columns, rows} avec rows = tableaux positionnels → objets.
      const cols = res.columns ?? [];
      this.rows = (res.rows ?? []).map((r) => (Array.isArray(r) ? Object.fromEntries(cols.map((c, i) => [c, r[i]])) : r));
    } else {
      const data = await getJson(access.container);
      const rows = await resolveMembers(data);
      this.rows = this.building
        ? rows.filter((r) => field(r, 'meter_id') === this.building || field(r, 'building') === this.building)
        : rows;
    }
    this._renderChart();
    return this.rows;
  }

  _proxyParams() {
    // assetId = nom du metric (net_grid_hourly…) ; buildProxyRequest fait le mapping
    // vers l'id catalogue DSP (dataset:facis:…) — ne pas mapper deux fois.
    const { from, to } = selectWindow(this.window);
    return { assetId: this.metric, from, to };
  }

  isEmpty() {
    return this.rows.length === 0;
  }

  updated() {
    // Le canvas n'existe qu'après le render du task : on (re)dessine le graphique ici.
    if (this._task?.status === 2 /* COMPLETE */) this._renderChart();
  }

  async _renderChart() {
    const series = buildSeries(this.rows, this.metric);
    const canvas = this.renderRoot.querySelector('canvas');
    if (!canvas) return;
    if (this._chart) { this._chart.destroy(); this._chart = null; }
    // Courbes lissées + remplissage en dégradé (emerald) sous la courbe.
    const ctx = canvas.getContext('2d');
    const PALETTE = ['#10b981', '#6366f1', '#d97706', '#0284c7', '#db2777'];
    const datasets = series.datasets.map((d, i) => {
      const color = PALETTE[i % PALETTE.length];
      // happy-dom / vieux contextes : createLinearGradient peut manquer → repli couleur pleine transparente.
      let grad = color + '33';
      if (ctx && typeof ctx.createLinearGradient === 'function') {
        grad = ctx.createLinearGradient(0, 0, 0, canvas.height || 300);
        grad.addColorStop(0, color + '55');
        grad.addColorStop(1, color + '00');
      }
      return {
        ...d,
        borderColor: color,
        backgroundColor: grad,
        borderWidth: 2.5,
        tension: 0.35,
        fill: i === 0,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: color,
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2,
      };
    });
    this._chart = new Chart(ctx, {
      type: 'line',
      data: { labels: series.labels.map((l) => String(l).slice(11, 16)), datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: true, position: 'top', labels: { usePointStyle: true, boxWidth: 8, boxHeight: 8 } },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.92)',
            padding: 10,
            cornerRadius: 10,
            callbacks: { label: (c) => `${c.dataset.label} : ${Math.round(c.parsed.y * 10) / 10} kW` },
          },
        },
        scales: {
          x: {
            title: { display: true, text: 'hour' },
            ticks: { maxTicksLimit: 12 },
            grid: { display: false },
          },
          y: {
            title: { display: true, text: 'kW' },
            grid: { color: 'rgba(15, 23, 42, 0.06)' },
            border: { display: false },
          },
        },
      },
    });
  }

  renderContent() {
    const series = buildSeries(this.rows, this.metric);
    const fmtHour = (l) => String(l).slice(11, 16); // "2026-11-20T10:00:00.000Z" → "10:00"
    const fmtVal = (v) => (typeof v === 'number' ? String(Math.round(v * 10) / 10) : v);
    return html`
      <div class="toolbar">
        <strong>${this.building ? 'Net consumption — building (grid)' : 'Net consumption — site (grid)'}</strong>
        <span class="freshness">${formatFreshness(latestTimestamp(this.rows))}</span>
        <label>range
          <select @change=${(e) => { this.window = e.target.value; this.refresh(); }}>
            ${Object.keys(WINDOWS).map((w) => html`<option value=${w} ?selected=${w === this.window}>${w}</option>`)}
          </select>
        </label>
      </div>
      <div class="chart-wrap"><canvas></canvas></div>
      <details class="datatable">
        <summary>Show hourly values</summary>
      <table>
        <thead><tr><th>hour</th>${series.datasets.map((d) => html`<th>${d.label}</th>`)}</tr></thead>
        <tbody>
          ${series.labels.map((l, i) => html`<tr><td>${fmtHour(l)}</td>${series.datasets.map((d) => html`<td>${fmtVal(d.data[i])}</td>`)}</tr>`)}
        </tbody>
      </table>
      </details>`;
  }
}

customElements.define('energy-chart', EnergyChart);
