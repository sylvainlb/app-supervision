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
    .toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
    .toolbar strong { font-size: 1.05rem; }
    .freshness { font-size: 0.78rem; background: #f0fdfa; color: #0f766e; border: 1px solid #99f6e4; border-radius: 999px; padding: 3px 10px; }
    .chart-wrap { height: 300px; background: #fff; border-radius: 8px; box-shadow: var(--shadow); padding: 8px; }
    .chart-wrap canvas { max-height: 100%; }
    details.datatable { margin-top: 10px; font-size: 0.85rem; color: var(--muted); }
    table { margin-top: 12px; max-height: 260px; display: block; overflow: auto; }
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
    this._chart = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: series,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: true, position: 'top' },
          tooltip: { callbacks: { label: (c) => `${c.dataset.label} : ${Math.round(c.parsed.y * 10) / 10} kW` } },
        },
        scales: {
          x: { title: { display: true, text: 'heure' }, ticks: { maxTicksLimit: 12 } },
          y: { title: { display: true, text: 'kW' } },
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
        <strong>${this.building ? 'Consommation nette du bâtiment (réseau)' : 'Consommation nette du parc (réseau)'}</strong>
        <span class="freshness">${formatFreshness(latestTimestamp(this.rows))}</span>
        <label>fenêtre
          <select @change=${(e) => { this.window = e.target.value; this.refresh(); }}>
            ${Object.keys(WINDOWS).map((w) => html`<option value=${w} ?selected=${w === this.window}>${w}</option>`)}
          </select>
        </label>
      </div>
      <div class="chart-wrap"><canvas></canvas></div>
      <details class="datatable">
        <summary>Voir les valeurs horaires</summary>
      <table>
        <thead><tr><th>heure</th>${series.datasets.map((d) => html`<th>${d.label}</th>`)}</tr></thead>
        <tbody>
          ${series.labels.map((l, i) => html`<tr><td>${fmtHour(l)}</td>${series.datasets.map((d) => html`<td>${fmtVal(d.data[i])}</td>`)}</tr>`)}
        </tbody>
      </table>
      </details>`;
  }
}

customElements.define('energy-chart', EnergyChart);
