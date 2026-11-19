// user-admin — CRUD users/rôles, réservé admin (spec front §7.7). Base : ComponentObjectsHandler → OrbitComponent.
// Data : /users/ (ACL/RLS). CRUD via store.post/put/delete ; webid = IRI déréférençable.
import { html, css } from 'lit';
import { OrbitComponent } from '../boilerplate/index.js';
import { ROLES } from '../../src/lib/transitions.js';
import { validateUser, userPayload } from './logic.js';

export class UserAdmin extends OrbitComponent {
  static properties = {
    ...OrbitComponent.properties,
    form: { type: Object, attribute: false },
    errors: { type: Array, attribute: false },
  };

  static styles = css`
    ${OrbitComponent.styles}
    table { border-collapse: collapse; } td, th { border: 1px solid #ccc; padding: 4px 8px; }
    .errors { color: #b00020; }
    form label { display: block; margin: 4px 0; }
  `;

  constructor() {
    super();
    this.dataSrc = '/users/';
    this.form = { webid: '', name: '', email: '', role: 'technicien' };
    this.errors = [];
  }

  async _submit() {
    this.errors = validateUser(this.form);
    if (this.errors.length > 0) return;
    await window.sibStore.post(this.dataSrc, userPayload(this.form));
    this.form = { webid: '', name: '', email: '', role: 'technicien' };
    document.dispatchEvent(new CustomEvent('save', { detail: { resource: { '@id': this.dataSrc } } }));
    this.refresh();
  }

  async _remove(user) {
    await window.sibStore.delete(user['@id']);
    document.dispatchEvent(new CustomEvent('save', { detail: { resource: { '@id': this.dataSrc } } }));
    this.refresh();
  }

  renderContent() {
    return html`
      <table>
        <thead><tr><th>webid</th><th>name</th><th>email</th><th>rôle</th><th></th></tr></thead>
        <tbody>
          ${this.objects.map((u) => html`
            <tr>
              <td>${u['users:webid'] ?? u['@id']}</td><td>${u['users:name'] ?? ''}</td>
              <td>${u['users:email'] ?? ''}</td><td>${u['users:role'] ?? ''}</td>
              <td><button @click=${() => this._remove(u)}>supprimer</button></td>
            </tr>`)}
        </tbody>
      </table>
      <form @submit=${(e) => { e.preventDefault(); this._submit(); }}>
        <label>webid <input .value=${this.form.webid} @input=${(e) => { this.form = { ...this.form, webid: e.target.value }; }}></label>
        <label>name <input .value=${this.form.name} @input=${(e) => { this.form = { ...this.form, name: e.target.value }; }}></label>
        <label>email <input .value=${this.form.email} @input=${(e) => { this.form = { ...this.form, email: e.target.value }; }}></label>
        <label>rôle
          <select @change=${(e) => { this.form = { ...this.form, role: e.target.value }; }}>
            ${ROLES.map((r) => html`<option value=${r} ?selected=${r === this.form.role}>${r}</option>`)}
          </select>
        </label>
        ${this.errors.length > 0 ? html`<ul class="errors">${this.errors.map((e) => html`<li>${e}</li>`)}</ul>` : ''}
        <button type="submit">créer</button>
      </form>`;
  }
}

customElements.define('user-admin', UserAdmin);
