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
    h2 { display: flex; align-items: center; gap: 10px; margin: 0 0 10px; }
    .fiche { background: #fff; border: 1px solid var(--border, #e2e8f0); border-radius: 10px; box-shadow: var(--shadow); padding: 14px 16px; margin-bottom: 14px; }
    .fiche p { margin: 6px 0; color: #334155; font-size: 0.92rem; }
    .actions { margin: 12px 0; }
    .actions button { margin-right: 8px; }
    section.comments { background: #fff; border: 1px solid var(--border, #e2e8f0); border-radius: 10px; padding: 14px 16px; }
    section.comments ul { list-style: none; padding: 0; }
    section.comments li { border-bottom: 1px solid #f1f5f9; padding: 8px 0; font-size: 0.9rem; color: #334155; }
    section.comments li:last-child { border-bottom: 0; }
    .comment-form { display: flex; gap: 8px; margin-top: 10px; }
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
    const idOf = (v) => String(v ?? '').replace(/.*\//, '');
    const assigned = idOf(this.webid) !== '' && idOf(field(t, 'assigned_to')) === idOf(this.webid);
    const transitions = allowedTransitions(t, this.role, { assigned });
    return html`
      <h2>${field(t, 'title') ?? ''} <span class="badge st-${field(t, 'status') ?? 'OPEN'}">${field(t, 'status') ?? ''}</span></h2>
      ${this.toast ? html`<div class="toast" role="status">${this.toast}</div>` : ''}
      <div class="fiche">
        <p>${field(t, 'description') ?? ''}</p>
        <p>bâtiment : ${field(t, 'building_id') ?? ''} ·
           <span class="badge pri-${field(t, 'priority') ?? 'MEDIUM'}">${field(t, 'priority') ?? 'MEDIUM'}</span>
           · créé par ${field(t, 'created_by') ?? ''} · assigné à ${field(t, 'assigned_to') ?? 'personne'}</p>
        ${field(t, 'anomaly_ref') ? html`<p>anomalie liée : ${field(t, 'anomaly_ref')}</p>` : ''}
      </div>
      <div class="actions">
        ${transitions.filter((x) => x.allowed).map((x) => html`
          <button @click=${() => this._changeStatus(x.to)}>${x.to}</button>`)}
      </div>
      <section class="comments">
        <h3>Commentaires</h3>
        <ul>${this.comments.map((c) => html`<li><strong>${field(c, 'author') ?? ''}</strong> · ${(field(c, 'ts') ?? '').slice(0, 19).replace('T', ' ')} — ${field(c, 'text') ?? ''}</li>`)}</ul>
        <div class="comment-form">
          <input .value=${this.commentText} @input=${(e) => { this.commentText = e.target.value; }} placeholder="Ajouter un commentaire…">
          <button @click=${() => this._addComment()}>ajouter</button>
        </div>
      </section>`;
  }
}

customElements.define('ticket-detail', TicketDetail);
