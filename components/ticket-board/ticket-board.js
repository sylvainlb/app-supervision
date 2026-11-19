// ticket-board — tableau des tickets par statut (spec front §7.5). Base : ComponentObjectsHandler → OrbitComponent.
// Data : /tickets/ (RLS filtre selon le rôle). Colonnes par statut + compteurs ; tri priorité/date (§7.5).
// Pas de drag & drop en v1 ; clic carte → route détail.
import { html, css } from 'lit';
import { OrbitComponent } from '../boilerplate/index.js';
import { groupByStatus } from './logic.js';

export class TicketBoard extends OrbitComponent {
  static styles = css`
    ${OrbitComponent.styles}
    .board { display: flex; gap: 14px; align-items: flex-start; }
    .column { flex: 1; background: #f8fafc; border: 1px solid var(--border, #e2e8f0); border-radius: 10px; padding: 10px; }
    .column h3 { margin: 0 0 8px; font-size: 0.8rem; text-transform: uppercase; letter-spacing: .04em; color: var(--muted, #64748b); display: flex; justify-content: space-between; align-items: center; }
    .count { background: #e2e8f0; color: var(--ink, #0f172a); border-radius: 999px; padding: 1px 9px; font-size: 0.78rem; }
    .card { background: #fff; border: 1px solid var(--border, #e2e8f0); border-radius: 8px; margin: 8px 0; padding: 10px; cursor: pointer; box-shadow: var(--shadow); font-size: 0.88rem; }
    .card:hover { box-shadow: 0 4px 10px rgba(17,24,39,.12); border-color: #99f6e4; }
    .card .meta { color: var(--muted, #64748b); font-size: 0.78rem; margin-top: 4px; display: flex; gap: 8px; align-items: center; }
  `;

  constructor() {
    super();
    this.dataSrc = '/tickets/';
  }

  renderContent() {
    const groups = groupByStatus(this.objects);
    return html`
      <div class="board">
        ${Object.entries(groups).map(([status, tickets]) => html`
          <section class="column" data-status=${status}>
            <h3>${status} <span class="count">${tickets.length}</span></h3>
            ${tickets.map((t) => html`
              <div class="card" @click=${() => this.navigate('ticket-detail', t['@id'])}>
                <strong>${t['tickets:title']}</strong>
                <div class="meta">
                  <span class="badge pri-${t['tickets:priority'] ?? 'MEDIUM'}">${t['tickets:priority'] ?? 'MEDIUM'}</span>
                  <span>${t['tickets:created_at'] ?? ''}</span>
                </div>
              </div>`)}
          </section>`)}
      </div>`;
  }
}

customElements.define('ticket-board', TicketBoard);
