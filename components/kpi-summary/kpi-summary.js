// kpi-summary — cartes KPI du tableau de bord (vue d'ensemble du parc).
import { html, css } from 'lit';
import { OrbitComponent, resolveMembers, getJson } from '../boilerplate/index.js';
import { computeKpis } from './logic.js';

export class KpiSummary extends OrbitComponent {
  static styles = css`
    ${OrbitComponent.styles}
    .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
    .kpi { background: #fff; border: 1px solid var(--border); border-radius: 10px; box-shadow: var(--shadow); padding: 14px 16px; }
    .kpi .value { font-size: 1.7rem; font-weight: 700; color: var(--ink); }
    .kpi .label { font-size: 0.82rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; }
    .kpi.warn .value { color: #dc2626; }
    .kpi.caution .value { color: #d97706; }
  `;

  constructor() {
    super();
    this.dataSrc = '/buildings/';
    this.kpis = null;
  }

  isEmpty() { return false; } // le contenu vient de this.kpis, pas de objects

  async load() {
    const [buildings, anomalies, tickets] = await Promise.all([
      getJson(this.dataSrc).catch(() => ({ 'ldp:contains': [] })),
      getJson('/gold/anomaly_candidates/').catch(() => ({ 'ldp:contains': [] })),
      getJson('/tickets/').catch(() => ({ 'ldp:contains': [] })),
    ]);
    this.kpis = computeKpis(
      await resolveMembers(buildings),
      await resolveMembers(anomalies),
      await resolveMembers(tickets),
    );
    return this.kpis;
  }

  renderContent() {
    const k = this.kpis ?? { buildings: 0, anomaliesActive: 0, anomaliesCritical: 0, ticketsOpen: 0 };
    return html`
      <div class="kpis">
        <div class="kpi"><div class="value">${k.buildings}</div><div class="label">bâtiments surveillés</div></div>
        <div class="kpi ${k.anomaliesCritical > 0 ? 'warn' : k.anomaliesActive > 0 ? 'caution' : ''}">
          <div class="value">${k.anomaliesActive}</div><div class="label">anomalies actives${k.anomaliesCritical ? ` (${k.anomaliesCritical} haute${k.anomaliesCritical > 1 ? 's' : ''})` : ''}</div>
        </div>
        <div class="kpi ${k.ticketsOpen > 0 ? 'caution' : ''}"><div class="value">${k.ticketsOpen}</div><div class="label">tickets ouverts</div></div>
      </div>`;
  }
}

customElements.define('kpi-summary', KpiSummary);
