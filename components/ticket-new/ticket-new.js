// ticket-new — ticket creation form (front spec §7.4: prefilled from
// ?anomaly=<@id>: title + tickets:anomaly_ref). POST /tickets/ then back to the list.
import { LitElement, html, css } from 'lit';
import { sharedStyles , resolveMembers, getJson } from '../boilerplate/index.js';
import { field } from '../../src/lib/context.js';
import { validateTicket, buildTicketPayload, PRIORITIES } from './logic.js';

export class TicketNew extends LitElement {
  static properties = {
    anomaly: { type: String }, // @id of the anomaly (query ?anomaly=)
    buildings: { type: Array, attribute: false },
    form: { type: Object, attribute: false },
    errors: { type: Array, attribute: false },
    webid: { type: String },
  };

  static styles = css`
    ${sharedStyles}
    form { background: #fff; border: 1px solid var(--border, #e5eaf0); border-radius: var(--radius, 14px); box-shadow: var(--shadow); padding: 20px 22px; max-width: 520px; }
    /* clean vertical grid: label above, full-width field below */
    form label { display: grid; gap: 6px; margin: 0 0 14px; font-size: 0.86rem; font-weight: 600; color: #334155; }
    form input, form select, form textarea { width: 100%; }
    form textarea { min-height: 96px; resize: vertical; }
    form select { appearance: none; background-image: linear-gradient(45deg, transparent 50%, #64748b 50%), linear-gradient(135deg, #64748b 50%, transparent 50%); background-position: calc(100% - 18px) 50%, calc(100% - 13px) 50%; background-size: 5px 5px; background-repeat: no-repeat; padding-right: 32px; }
    .errors { color: #dc2626; margin: 0 0 12px; padding-left: 18px; }
    .anomaly-link { background: #ecfdf5; border: 1px solid #a7f3d0; color: #047857; border-radius: 10px; padding: 9px 13px; font-size: 0.88rem; font-weight: 500; margin-bottom: 14px; overflow-wrap: anywhere; }
    h2 { margin-top: 0; font-size: 1.3rem; }
    .form-foot { display: flex; justify-content: flex-end; margin-top: 4px; }
    button[type="submit"] { min-width: 130px; }
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
      this.form = { ...this.form, title: `Anomaly ${this.anomaly}` };
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
      <h2>New ticket</h2>
      ${this.anomaly ? html`<p class="anomaly-link">linked anomaly: ${this.anomaly}</p>` : ''}
      <form @submit=${(e) => { e.preventDefault(); this._submit(); }}>
        <label>title <input .value=${this.form.title} @input=${(e) => { this.form = { ...this.form, title: e.target.value }; }}></label>
        <label>description <textarea .value=${this.form.description} @input=${(e) => { this.form = { ...this.form, description: e.target.value }; }}></textarea></label>
        <label>building
          <select @change=${(e) => { this.form = { ...this.form, building_id: e.target.value }; }}>
            <option value="" ?selected=${!this.form.building_id}>— select —</option>
            ${this.buildings.map((b) => html`<option value=${b['@id']} ?selected=${b['@id'] === this.form.building_id}>${field(b, 'name') ?? b['@id']}</option>`)}
          </select>
        </label>
        <label>priority
          <select @change=${(e) => { this.form = { ...this.form, priority: e.target.value }; }}>
            ${PRIORITIES.map((p) => html`<option value=${p} ?selected=${p === this.form.priority}>${p}</option>`)}
          </select>
        </label>
        ${this.errors.length > 0 ? html`<ul class="errors">${this.errors.map((e) => html`<li>${e}</li>`)}</ul>` : ''}
        <div class="form-foot"><button type="submit">Create</button></div>
      </form>`;
  }
}

customElements.define('ticket-new', TicketNew);
