// ticket-detail — détail ticket (spec front §7.6). Base : ComponentObjectHandler → OrbitComponent.
// Data : /tickets/<pk> + /tickets/<pk>/comments/. Transitions RG-2 via PATCH merge-patch ;
// 412 → recharger + toast « modifié entre-temps » (§10). Commentaires en append.
import { html, css } from 'lit';
import { OrbitComponent, resolveMembers, getJson } from '../boilerplate/index.js';
import { field } from '../../src/lib/context.js';
import { actionForStatus } from '../../src/lib/http-contract.js';
import { allowedTransitions, commentPayload } from './logic.js';

export class TicketDetail extends OrbitComponent {
  static properties = {
    ...OrbitComponent.properties,
    comments: { type: Array, attribute: false },
    role: { type: String },
    webid: { type: String },
    toast: { type: String, attribute: false },
    commentText: { type: String, attribute: false },
  };

  static styles = css`
    ${OrbitComponent.styles}
    h2 { display: flex; align-items: center; gap: 10px; margin: 0 0 14px; font-size: 1.3rem; }
    .fiche { background: #fff; border: 1px solid var(--border, #e5eaf0); border-radius: var(--radius, 14px); box-shadow: var(--shadow); padding: 18px 20px; margin-bottom: 16px; }
    .fiche p { margin: 7px 0; color: #334155; font-size: 0.92rem; line-height: 1.5; }
    .actions { margin: 14px 0; display: flex; gap: 10px; flex-wrap: wrap; }
    .actions button { margin-right: 0; text-transform: capitalize; }
    section.comments { background: #fff; border: 1px solid var(--border, #e5eaf0); border-radius: var(--radius, 14px); box-shadow: var(--shadow); padding: 16px 20px; }
    section.comments h3 { margin: 0 0 8px; font-size: 1rem; }
    section.comments ul { list-style: none; padding: 0; }
    section.comments li { border-bottom: 1px solid #f1f5f9; padding: 9px 0; font-size: 0.9rem; color: #334155; }
    section.comments li:last-child { border-bottom: 0; }
    .comment-form { display: flex; gap: 10px; margin-top: 12px; }
    .comment-form input { flex: 1; }
  `;

  constructor() {
    super();
    this.comments = [];
    this.role = 'gestionnaire';
    this.webid = '';
    this.toast = '';
    this.commentText = '';
  }

  async load() {
    const data = await getJson(this.dataSrc);
    this.object = this.isType(data) ? data : null;
    const comments = await getJson(`${this.dataSrc}/comments/`).catch(() => ({ 'ldp:contains': [] }));
    this.comments = await resolveMembers(comments);
    return data;
  }

  async _changeStatus(to) {
    this.toast = '';
    try {
      await window.sibStore.patch(this.dataSrc, { status: to });
      document.dispatchEvent(new CustomEvent('save', { detail: { resource: { '@id': this.dataSrc } } }));
      this.refresh();
    } catch (e) {
      if (e?.status === 412 || actionForStatus(e?.status) === 'conflict-reload') {
        this.toast = 'modified in the meantime — resource reloaded, please try again';
        this.refresh();
      } else {
        throw e;
      }
    }
  }

  async _addComment() {
    if (!this.commentText) return;
    await window.sibStore.post(`${this.dataSrc}/comments/`, commentPayload(this.commentText, this.webid));
    this.commentText = '';
    document.dispatchEvent(new CustomEvent('save', { detail: { resource: { '@id': this.dataSrc } } }));
    this.refresh();
  }

  renderContent() {
    const t = this.object ?? {};
    const idOf = (v) => String(v ?? '').replace(/.*\//, '');
    const assigned = idOf(this.webid) !== '' && idOf(field(t, 'assigned_to')) === idOf(this.webid);
    const transitions = allowedTransitions(t, this.role, { assigned });
    return html`
      <h2>${field(t, 'title') ?? ''} <span class="badge st-${field(t, 'status') ?? 'OPEN'}">${field(t, 'status') ?? ''}</span></h2>
      ${this.toast ? html`<div class="toast" role="status">${this.toast}</div>` : ''}
      <div class="fiche">
        <p>${field(t, 'description') ?? ''}</p>
        <p>building: ${field(t, 'building_id') ?? ''} ·
           <span class="badge pri-${field(t, 'priority') ?? 'MEDIUM'}">${field(t, 'priority') ?? 'MEDIUM'}</span>
           · created by ${field(t, 'created_by') ?? ''} · assigned to ${field(t, 'assigned_to') ?? 'nobody'}</p>
        ${field(t, 'anomaly_ref') ? html`<p>linked anomaly: ${field(t, 'anomaly_ref')}</p>` : ''}
      </div>
      <div class="actions">
        ${transitions.filter((x) => x.allowed).map((x) => html`
          <button @click=${() => this._changeStatus(x.to)}>${x.to}</button>`)}
      </div>
      <section class="comments">
        <h3>Comments</h3>
        <ul>${this.comments.map((c) => html`<li><strong>${field(c, 'author') ?? ''}</strong> · ${(field(c, 'ts') ?? '').slice(0, 19).replace('T', ' ')} — ${field(c, 'text') ?? ''}</li>`)}</ul>
        <div class="comment-form">
          <input .value=${this.commentText} @input=${(e) => { this.commentText = e.target.value; }} placeholder="Add a comment…">
          <button @click=${() => this._addComment()}>add</button>
        </div>
      </section>`;
  }
}

customElements.define('ticket-detail', TicketDetail);
