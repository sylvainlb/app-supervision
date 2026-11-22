// anomaly-list — anomaly list (front spec §7.4). Base: ComponentObjectsHandler → OrbitComponent.
// Data: published gold container /gold/anomaly_candidates/ (§13.3). Client-side filters.
// "Create a ticket" → requestNavigation route ticket-new with ?anomaly=<@id> (prefills anomaly_ref).
import { html, css } from 'lit';
import { OrbitComponent, getJson } from '../boilerplate/index.js';
import { field } from '../../src/lib/context.js';
import { filterAnomalies, ticketPrefill, anomalyTs } from './logic.js';

export class AnomalyList extends OrbitComponent {
  static properties = {
    ...OrbitComponent.properties,
    filterSeverity: { type: String, attribute: false },
    filterBuilding: { type: String, attribute: false },
    building: { type: String }, // IRI or path /buildings/<pk>: filters by the building's meter_id
  };

  static styles = css`
    ${OrbitComponent.styles}
    ul { list-style: none; padding: 0; display: grid; gap: 10px; }
    li.anomaly {
      display: flex; align-items: center; gap: 14px; background: #fff;
      border: 1px solid var(--border); border-left: 4px solid #94a3b8; border-radius: 12px;
      padding: 12px 16px; box-shadow: var(--shadow);
      transition: transform .15s ease, box-shadow .15s ease;
    }
    li.anomaly:hover { transform: translateX(3px); box-shadow: var(--shadow-lg); }
    li.anomaly:has(.sev-HIGH) { border-left-color: #ea580c; }
    li.anomaly:has(.sev-CRITICAL) { border-left-color: #b91c1c; }
    li.anomaly:has(.sev-MEDIUM) { border-left-color: #d97706; }
    li.anomaly:has(.sev-LOW) { border-left-color: #64748b; }
    li.anomaly .meta { flex: 1; font-size: 0.88rem; color: #334155; line-height: 1.45; }
    .empty { color: var(--muted); padding: 12px; }
    .filters { margin-bottom: 14px; }
    .filters select { box-shadow: var(--shadow); font-weight: 500; }
  `;

  constructor() {
    super();
    this.dataSrc = '/gold/anomaly_candidates/';
    this.filterSeverity = '';
    this.filterBuilding = '';
    this.building = '';
  }

  // On a building detail page, the building attribute = path /buildings/<pk>:
  // we resolve the resource to get its meter_id and filter the anomalies on it.
  async connectedCallback() {
    super.connectedCallback?.();
    if (this.building?.startsWith('/buildings/') && !this.filterBuilding) {
      try {
        const b = await getJson(this.building);
        this.filterBuilding = String(field(b, 'meter_id') ?? '');
      } catch { /* filter ignored if the building does not answer */ }
    }
  }

  renderContent() {
    const rows = filterAnomalies(this.objects, { severity: this.filterSeverity || undefined, building: this.filterBuilding || undefined });
    const severities = [...new Set(this.objects.map((a) => String(field(a, 'severity') ?? '').toUpperCase()).filter(Boolean))];
    return html`
      <div class="filters">
        <select @change=${(e) => { this.filterSeverity = e.target.value; }}>
          <option value="">all severities</option>
          ${severities.map((s) => html`<option value=${s} ?selected=${s === this.filterSeverity}>${s}</option>`)}
        </select>
      </div>
      ${rows.length === 0 ? html`<div class="empty">No active anomaly — everything is normal.</div>` : html`
      <ul>
        ${rows.map((a) => {
          const sev = String(field(a, 'severity') ?? '').toUpperCase();
          const sevLabel = { HIGH: 'High', CRITICAL: 'Critical', MEDIUM: 'Medium', LOW: 'Low' }[sev] ?? sev;
          return html`
          <li class="anomaly">
            <span class="badge sev-${sev}">${sevLabel}</span>
            <span class="meta">
              <strong>Meter ${field(a, 'meter_id') ?? '?'}</strong> — detected on ${String(anomalyTs(a) ?? '').slice(0, 19).replace('T', ' at ')}
              — z-score=${field(a, 'z_score') ?? '?'} (threshold ~3)
              ${field(a, 'active_power_kw') != null ? html`<br>measured power: ${Math.round(field(a, 'active_power_kw') * 10) / 10} kW` : ''}
            </span>
            <button @click=${() => this._createTicket(a)}>Create intervention ticket</button>
          </li>`;
        })}
      </ul>`}`;
  }

  _createTicket(anomaly) {
    this.navigate('ticket-new', null, { anomaly: anomaly['@id'], prefill: ticketPrefill(anomaly) });
  }
}

customElements.define('anomaly-list', AnomalyList);
