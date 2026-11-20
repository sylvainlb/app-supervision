// ticket-new — formulaire de création de ticket (spec front §7.4 : pré-rempli depuis
// ?anomaly=<@id> : titre + tickets:anomaly_ref). POST /tickets/ puis retour à la liste.
import { LitElement, html, css } from 'lit';
import { sharedStyles , resolveMembers, getJson } from '../boilerplate/index.js';
import { field } from '../../src/lib/context.js';
import { validateTicket, buildTicketPayload, PRIORITIES } from './logic.js';

export class TicketNew extends LitElement {
  static properties = {
    anomaly: { type: String }, // @id de l'anomalie (query ?anomaly=)
    buildings: { type: Array, attribute: false },
    form: { type: Object, attribute: false },
    errors: { type: Array, attribute: false },
    webid: { type: String },
  };

  static styles = css`
    ${sharedStyles}
    form { background: #fff; border: 1px solid var(--border, #e2e8f0); border-radius: 10px; box-shadow: var(--shadow); padding: 16px; max-width: 480px; }
    form label { display: block; margin: 10px 0; font-size: 0.88rem; color: #334155; }
    form input, form select, form textarea { width: 100%; margin-top: 4px; }
    .errors { color: #dc2626; }
    .anomaly-link { background: #f0fdfa; border: 1px solid #99f6e4; color: #0f766e; border-radius: 8px; padding: 8px 12px; font-size: 0.88rem; }
    h2 { margin-top: 0; }
  `;

  constructor() {
    super();
    this.anomaly = '';
    this.buildings = [];
    this.webid = '';
    this.errors = [];
    this.form = { title: '', description: '', priority: 'MEDIUM', building_id: '' };
  }

  connectedCallback() {
    super.connectedCallback();
    getJson('/buildings/').then((d) => resolveMembers(d)).then((rows) => {
      this.buildings = rows;
    });
    if (this.anomaly) {
      this.form = { ...this.form, title: `Anomalie ${this.anomaly}` };
    }
  }

  async _submit() {
    this.errors = validateTicket(this.form);
    if (this.errors.length > 0) return;
    const payload = buildTicketPayload({ ...this.form, anomaly_ref: this.anomaly || undefined, created_by: this.webid });
    await window.sibStore.post('/tickets/', payload);
    document.dispatchEvent(new CustomEvent('save', { detail: { resource: { '@id': '/tickets/' } } }));
    document.dispatchEvent(new CustomEvent('requestNavigation', { detail: { route: 'tickets' } }));
  }

  render() {
    return html`
      <h2>Nouveau ticket</h2>
      ${this.anomaly ? html`<p class="anomaly-link">anomalie liée : ${this.anomaly}</p>` : ''}
      <form @submit=${(e) => { e.preventDefault(); this._submit(); }}>
        <label>titre <input .value=${this.form.title} @input=${(e) => { this.form = { ...this.form, title: e.target.value }; }}></label>
        <label>description <textarea .value=${this.form.description} @input=${(e) => { this.form = { ...this.form, description: e.target.value }; }}></textarea></label>
        <label>bâtiment
          <select @change=${(e) => { this.form = { ...this.form, building_id: e.target.value }; }}>
            <option value="">— choisir —</option>
            ${this.buildings.map((b) => html`<option value=${b['@id']}>${field(b, 'name') ?? b['@id']}</option>`)}
          </select>
        </label>
        <label>priorité
          <select @change=${(e) => { this.form = { ...this.form, priority: e.target.value }; }}>
            ${PRIORITIES.map((p) => html`<option value=${p} ?selected=${p === this.form.priority}>${p}</option>`)}
          </select>
        </label>
        ${this.errors.length > 0 ? html`<ul class="errors">${this.errors.map((e) => html`<li>${e}</li>`)}</ul>` : ''}
        <button type="submit">créer</button>
      </form>`;
  }
}

customElements.define('ticket-new', TicketNew);
