// ticket-detail — détail ticket (spec front §7.6). Base : ComponentObjectHandler → OrbitComponent.
// Data : /tickets/<pk> + /tickets/<pk>/comments/. Transitions RG-2 via PATCH merge-patch ;
// 412 → recharger + toast « modifié entre-temps » (§10). Commentaires en append.
import { html, css } from 'lit';
import { OrbitComponent } from '../boilerplate/index.js';
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
    .toast { background: #fff3cd; border: 1px solid #ffecb5; padding: 6px; margin: 6px 0; }
    .actions button { margin-right: 6px; }
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
    const data = await window.sibStore.getData(this.dataSrc);
    this.object = this.isType(data) ? data : null;
    const comments = await window.sibStore.getData(`${this.dataSrc}/comments/`).catch(() => ({ 'ldp:contains': [] }));
    this.comments = comments?.['ldp:contains'] ?? [];
    return data;
  }

  async _changeStatus(to) {
    this.toast = '';
    try {
      await window.sibStore.patch(this.dataSrc, { 'tickets:status': to });
      document.dispatchEvent(new CustomEvent('save', { detail: { resource: { '@id': this.dataSrc } } }));
      this.refresh();
    } catch (e) {
      if (e?.status === 412 || actionForStatus(e?.status) === 'conflict-reload') {
        this.toast = 'modifié entre-temps — ressource rechargée, merci de réessayer';
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
    const assigned = t['tickets:assigned_to'] === this.webid;
    const transitions = allowedTransitions(t, this.role, { assigned });
    return html`
      <h2>${t['tickets:title'] ?? ''} <span class="badge">${t['tickets:status'] ?? ''}</span></h2>
      ${this.toast ? html`<div class="toast" role="status">${this.toast}</div>` : ''}
      <p>${t['tickets:description'] ?? ''}</p>
      <p>bâtiment : ${t['tickets:building_id'] ?? ''} · priorité : ${t['tickets:priority'] ?? 'MEDIUM'}
         · créé par ${t['tickets:created_by'] ?? ''} · assigné à ${t['tickets:assigned_to'] ?? 'personne'}</p>
      ${t['tickets:anomaly_ref'] ? html`<p>anomalie liée : ${t['tickets:anomaly_ref']}</p>` : ''}
      <div class="actions">
        ${transitions.filter((x) => x.allowed).map((x) => html`
          <button @click=${() => this._changeStatus(x.to)}>${x.to}</button>`)}
      </div>
      <section>
        <h3>Commentaires</h3>
        <ul>${this.comments.map((c) => html`<li>${c['comments:ts'] ?? ''} — ${c['comments:author'] ?? ''} : ${c['comments:text'] ?? ''}</li>`)}</ul>
        <input .value=${this.commentText} @input=${(e) => { this.commentText = e.target.value; }}>
        <button @click=${() => this._addComment()}>ajouter</button>
      </section>`;
  }
}

customElements.define('ticket-detail', TicketDetail);
