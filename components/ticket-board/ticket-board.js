// ticket-board — tableau des tickets par statut (spec front §7.5). Base : ComponentObjectsHandler → OrbitComponent.
// Data : /tickets/ (RLS filtre selon le rôle). Colonnes par statut + compteurs ; tri priorité/date (§7.5).
// Pas de drag & drop en v1 ; clic carte → route détail.
import { html, css } from 'lit';
import { OrbitComponent } from '../boilerplate/index.js';
import { field } from '../../src/lib/context.js';

const STATUS_LABEL = { OPEN: 'Open', IN_PROGRESS: 'In progress', RESOLVED: 'Resolved', CLOSED: 'Closed' };
import { groupByStatus } from './logic.js';

export class TicketBoard extends OrbitComponent {
  static styles = css`
    ${OrbitComponent.styles}
    .board { display: flex; gap: 16px; align-items: flex-start; }
    .column {
      flex: 1; min-width: 0; background: #f6f8fb; border: 1px solid var(--border, #e5eaf0);
      border-radius: var(--radius, 14px); padding: 12px; box-shadow: var(--shadow);
    }
    .column h3 {
      margin: 0 0 10px; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: .06em;
      color: var(--muted, #64748b); display: flex; justify-content: space-between; align-items: center;
      padding: 2px 4px 8px; border-bottom: 2px solid var(--border, #e5eaf0);
    }
    .column[data-status="OPEN"] h3 { color: #475569; border-bottom-color: #cbd5e1; }
    .column[data-status="IN_PROGRESS"] h3 { color: #c2410c; border-bottom-color: #fed7aa; }
    .column[data-status="RESOLVED"] h3 { color: #0369a1; border-bottom-color: #bae6fd; }
    .column[data-status="CLOSED"] h3 { color: #047857; border-bottom-color: #a7f3d0; }
    .count { background: #fff; color: var(--ink, #0f172a); border: 1px solid var(--border, #e5eaf0); border-radius: 999px; padding: 1px 10px; font-size: 0.76rem; font-weight: 700; box-shadow: var(--shadow); }
    .card {
      background: #fff; border: 1px solid var(--border, #e5eaf0); border-radius: 11px; margin: 9px 0; padding: 11px 12px;
      cursor: pointer; box-shadow: var(--shadow); font-size: 0.88rem;
      transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease;
    }
    .card:hover { transform: translateY(-2px); box-shadow: var(--shadow-lg); border-color: #6ee7b7; }
    .card strong { font-weight: 600; line-height: 1.35; }
    .card .meta { color: var(--muted, #64748b); font-size: 0.77rem; margin-top: 7px; display: flex; gap: 8px; align-items: center; }
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
            <h3>${STATUS_LABEL[status] ?? status} <span class="count">${tickets.length}</span></h3>
            ${tickets.map((t) => html`
              <div class="card" @click=${() => this.navigate('ticket-detail', t['@id'])}>
                <strong>${field(t, 'title')}</strong>
                <div class="meta">
                  <span class="badge pri-${field(t, 'priority') ?? 'MEDIUM'}">${field(t, 'priority') ?? 'MEDIUM'}</span>
                  <span>${(field(t, 'created_at') ?? '').slice(0, 19).replace('T', ' ')}</span>
                </div>
              </div>`)}
          </section>`)}
      </div>`;
  }
}

customElements.define('ticket-board', TicketBoard);
