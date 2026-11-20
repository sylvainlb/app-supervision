// kpi-summary — cartes KPI du tableau de bord (vue d'ensemble du parc).
import { html, css } from 'lit';
import { OrbitComponent, resolveMembers, getJson } from '../boilerplate/index.js';
import { computeKpis } from './logic.js';

export class KpiSummary extends OrbitComponent {
  static styles = css`
    ${OrbitComponent.styles}
    .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
    .kpi {
      position: relative; overflow: hidden;
      background: #fff; border: 1px solid var(--border); border-radius: var(--radius, 14px);
      box-shadow: var(--shadow); padding: 16px 18px;
      transition: transform .18s ease, box-shadow .18s ease;
    }
    .kpi:hover { transform: translateY(-3px); box-shadow: var(--shadow-lg); }
    .kpi::before { content: ""; position: absolute; inset: 0 auto 0 0; width: 4px; background: linear-gradient(180deg, var(--brand-light, #34d399), var(--brand, #10b981)); }
    .kpi .icon {
      position: absolute; top: 14px; right: 14px; width: 38px; height: 38px; border-radius: 11px;
      display: flex; align-items: center; justify-content: center;
      background: var(--brand-soft, #d1fae5); color: var(--brand-dark, #059669);
    }
    .kpi .icon svg { width: 20px; height: 20px; }
    .kpi .value { font-size: 2rem; font-weight: 800; color: var(--ink); letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
    .kpi .label { font-size: 0.78rem; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; margin-top: 2px; }
    .kpi.warn { background: linear-gradient(135deg, #fff 55%, #fef2f2); }
    .kpi.warn::before { background: linear-gradient(180deg, #f87171, #dc2626); }
    .kpi.warn .icon { background: #fee2e2; color: #b91c1c; }
    .kpi.warn .value { color: #dc2626; }
    .kpi.caution { background: linear-gradient(135deg, #fff 55%, #fffbeb); }
    .kpi.caution::before { background: linear-gradient(180deg, #fbbf24, #d97706); }
    .kpi.caution .icon { background: #fef3c7; color: #b45309; }
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
    const iconBuilding = html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16"/><path d="M15 9h4a2 2 0 0 1 2 2v10"/><line x1="9" y1="7" x2="11" y2="7"/><line x1="9" y1="11" x2="11" y2="11"/><line x1="9" y1="15" x2="11" y2="15"/></svg>`;
    const iconAlert = html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
    const iconTicket = html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2.5 2.5 0 0 0 0 5v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2.5 2.5 0 0 0 0-5z"/><line x1="13" y1="5" x2="13" y2="19" stroke-dasharray="2.5 3"/></svg>`;
    return html`
      <div class="kpis">
        <div class="kpi">
          <span class="icon">${iconBuilding}</span>
          <div class="value">${k.buildings}</div><div class="label">monitored buildings</div>
        </div>
        <div class="kpi ${k.anomaliesCritical > 0 ? 'warn' : k.anomaliesActive > 0 ? 'caution' : ''}">
          <span class="icon">${iconAlert}</span>
          <div class="value">${k.anomaliesActive}</div><div class="label">active anomalies${k.anomaliesCritical ? ` (${k.anomaliesCritical} high)` : ''}</div>
        </div>
        <div class="kpi ${k.ticketsOpen > 0 ? 'caution' : ''}">
          <span class="icon">${iconTicket}</span>
          <div class="value">${k.ticketsOpen}</div><div class="label">open tickets</div>
        </div>
      </div>`;
  }
}

customElements.define('kpi-summary', KpiSummary);
