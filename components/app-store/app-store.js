// <app-store> — route /store : liste du catalogue + toggles + configuration par
// feature + édition admin des métadonnées (spec app-store-spec.md v0.4 §1.6.2,
// CA-A2, CA-A3).
//
// - Liste : ComponentObjectsHandler sur /features/ + prefs courante.
// - Toggle : PATCH merge-patch /prefs/<pk> body {"prefs": {"<slug>": {"enabled":…}}}
//   (forme R1 §1.5) via window.appStore.patchPrefs → événement `save` (§1.9.9) :
//   <app-menu> et la route courante se mettent à jour à chaud. 412 → toast.
// - Configurer : modale dans /store (§1.9.11), formulaire piloté par le
//   config_schema de la feature (méta-schéma §1.9.6), écrit la sous-clé
//   `config` des prefs (validation front v1, CA-A3).
// - Admin (v1) : édition des métadonnées UNIQUEMENT des features déjà
//   packagées (§1.9.8) → PATCH /features/<slug> (IRI par slug, CA-A7).
import { html, css } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { OrbitComponent, getJson, resolveMembers } from '../boilerplate/index.js';
import appStore, { AppStoreConflictError } from '../shared/app-store-api.js';
import { iconSvg } from '../shared/icons.js';
import {
  titleOf, featureEnabled, isConfigured, configDefaults,
  togglePatch, configPatch, validateConfig, normalizeFieldValue, roleAllowed,
} from '../shared/logic.js';

function field(obj, name) {
  if (!obj || typeof obj !== 'object') return undefined;
  if (obj[name] !== undefined) return obj[name];
  for (const k of Object.keys(obj)) if (k.endsWith(':' + name)) return obj[k];
  return undefined;
}

export class AppStore extends OrbitComponent {
  static properties = {
    ...OrbitComponent.properties,
    prefsObj: { type: Object, attribute: false },
    locale: { type: String },
    editingSlug: { type: String, attribute: false },   // modale config ouverte
    editingValues: { type: Object, attribute: false },
    editingErrors: { type: Object, attribute: false },
    adminSlug: { type: String, attribute: false },     // modale admin ouverte
    adminValues: { type: Object, attribute: false },
    adminError: { type: String, attribute: false },
    toast: { type: String, attribute: false },
    catalogueMissing: { type: Boolean, attribute: false }, // GET /features/ → 404 (SQL non appliqué)
  };

  static styles = css`
    ${OrbitComponent.styles}
    ul.features { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px; }
    .feature { display: flex; flex-direction: column; gap: 8px; }
    .feature .head { display: flex; align-items: center; gap: 10px; }
    .feature .icon { width: 24px; height: 24px; flex-shrink: 0; color: var(--brand-dark); }
    .feature h3 { margin: 0; font-size: 1rem; }
    .feature .desc { font-size: 0.84rem; color: var(--muted); margin: 0; }
    .feature .actions { display: flex; align-items: center; gap: 10px; margin-top: 6px; }
    .switch { position: relative; display: inline-block; width: 42px; height: 24px; flex-shrink: 0; }
    .switch input { opacity: 0; width: 0; height: 0; }
    .slider { position: absolute; inset: 0; cursor: pointer; background: #cbd5e1; border-radius: 999px; transition: background .15s ease; }
    .slider::before { content: ""; position: absolute; width: 18px; height: 18px; left: 3px; top: 3px; background: #fff; border-radius: 50%; transition: transform .15s ease; box-shadow: 0 1px 3px rgba(15,23,42,.3); }
    .switch input:checked + .slider { background: var(--brand); }
    .switch input:checked + .slider::before { transform: translateX(18px); }
    .overlay { position: fixed; inset: 0; background: rgba(15,23,42,.45); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal { background: #fff; border-radius: 14px; box-shadow: var(--shadow-lg); padding: 20px; width: min(560px, 92vw); max-height: 86vh; overflow: auto; }
    .modal h2 { margin: 0 0 12px; font-size: 1.1rem; }
    .modal label { display: block; font-size: 0.82rem; font-weight: 600; color: var(--muted); margin: 10px 0 4px; }
    .modal input[type=text], .modal input[type=number], .modal select, .modal textarea { width: 100%; box-sizing: border-box; }
    .modal textarea { font-family: ui-monospace, monospace; font-size: 0.82rem; min-height: 70px; }
    .modal .row { display: flex; gap: 10px; align-items: center; }
    .modal .foot { display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; }
    .field-error { color: #dc2626; font-size: 0.78rem; margin-top: 3px; }
    .badge.configured { background: #ccfbf1; color: #0f766e; margin-left: 8px; }
  `;

  constructor() {
    super();
    this.dataSrc = '/features/';
    this.prefsObj = {};
    this.locale = window.getLocale?.() ?? 'fr';
    this.editingSlug = null;
    this.editingValues = {};
    this.editingErrors = {};
    this.adminSlug = null;
    this.adminValues = {};
    this.adminError = '';
    this.toast = '';
    this.catalogueMissing = false;
  }

  async load() {
    let data;
    try {
      data = await getJson(this.dataSrc);
    } catch (e) {
      // Catalogue absent côté serveur (sql/010–012 non appliqués) : état explicite,
      // pas un crash — le déploiement back est la cause (voir sql/README.md).
      if (e.status === 404) {
        this.catalogueMissing = true;
        this.objects = [];
        await appStore.whenReady().catch(() => {});
        this.catalogueMissing = appStore.isCatalogueMissing() || this.catalogueMissing;
        this.prefsObj = appStore.getPrefs();
        return null;
      }
      throw e;
    }
    this.catalogueMissing = false;
    const role = appStore.getRole();
    this.objects = (await resolveMembers(data))
      .filter((f) => f && field(f, 'slug'))
      // §1.4.1 role_min : la liste /store ne montre que les features accessibles à ce rôle (UX)
      .filter((f) => roleAllowed(field(f, 'role_min') ?? 'all', role))
      .sort((a, b) => ((field(a, 'menu_order') ?? 0) - (field(b, 'menu_order') ?? 0)) || field(a, 'slug').localeCompare(field(b, 'slug'))); // même tri que le menu (§1.9.1)
    await appStore.whenReady();
    this.prefsObj = appStore.getPrefs();
    return data;
  }

  connectedCallback() {
    super.connectedCallback();
    this._unsub = appStore.onChange(() => { this.prefsObj = appStore.getPrefs(); });
  }

  disconnectedCallback() {
    this._unsub?.();
    super.disconnectedCallback();
  }

  isEmpty() { return this.objects.length === 0 && !this.catalogueMissing; }

  isAdmin() { return appStore.isAdmin(); }

  // ---------------------------------------------------------------- toggle
  async onToggle(feature, ev) {
    const enabled = ev.target.checked;
    try {
      // CA-A2 : PATCH merge-patch forme R1 + save (§1.9.9) → menu à jour à chaud.
      await appStore.patchPrefs(togglePatch(field(feature, "slug"), enabled));
      this.prefsObj = appStore.getPrefs();
      this.toast = '';
    } catch (e) {
      if (e instanceof AppStoreConflictError) {
        this.toast = 'Modifié entre-temps — préférences rechargées.'; // §1.9.9 (412)
        this.prefsObj = appStore.getPrefs();
      } else {
        this.toast = `Erreur ${e.status ?? ''} : ${e.message}`;
      }
      ev.target.checked = !enabled; // rollback visuel
    }
  }

  // ------------------------------------------------------- modale config
  openConfig(feature) {
    const entry = this.prefsObj?.[field(feature, "slug")] ?? {};
    const schema = field(feature, 'config_schema') ?? { fields: [] };
    const current = entry.config ?? {};
    const values = { ...configDefaults(schema), ...current };
    this.editingValues = values;
    this.editingErrors = {};
    this.editingSlug = field(feature, "slug");
  }

  closeConfig() {
    this.editingSlug = null;
    this.editingErrors = {};
  }

  onFieldInput(f, ev) {
    const raw = f.type === 'boolean' ? ev.target.checked : ev.target.value;
    this.editingValues = { ...this.editingValues, [f.key]: normalizeFieldValue(f, raw) };
  }

  async saveConfig(feature) {
    const schema = field(feature, 'config_schema') ?? { fields: [] };
    // CA-A3 : validation front v1 contre le méta-schéma §1.9.6
    const cleaned = {};
    for (const f of schema.fields ?? []) {
      if (this.editingValues[f.key] !== undefined) cleaned[f.key] = this.editingValues[f.key];
    }
    const { ok, errors } = validateConfig(schema, cleaned);
    if (!ok) { this.editingErrors = errors; return; }
    try {
      await appStore.patchPrefs(configPatch(field(feature, "slug"), cleaned)); // sous-clé config
      this.prefsObj = appStore.getPrefs();
      this.closeConfig();
    } catch (e) {
      this.editingErrors = { _global: e instanceof AppStoreConflictError ? 'Modifié entre-temps — rechargé.' : e.message };
    }
  }

  renderField(f) {
    const v = this.editingValues[f.key];
    const err = this.editingErrors[f.key];
    const label = html`<label for="f-${f.key}">${f.label ?? f.key}${f.required ? ' *' : ''}</label>`;
    let input;
    if (f.type === 'boolean') {
      input = html`<input id="f-${f.key}" type="checkbox" .checked=${!!v} @change=${(e) => this.onFieldInput(f, e)}>`;
    } else if (f.type === 'enum') {
      input = html`<select id="f-${f.key}" @change=${(e) => this.onFieldInput(f, e)}>
        ${(f.options ?? []).map((o) => html`<option value=${o} ?selected=${v === o}>${o}</option>`)}
      </select>`;
    } else if (f.type === 'number') {
      input = html`<input id="f-${f.key}" type="number" .value=${v ?? ''} @input=${(e) => this.onFieldInput(f, e)}>`;
    } else if (f.type === 'array' || f.type === 'object') {
      const txt = f.type === 'array' ? (Array.isArray(v) ? v.join('\n') : '') : JSON.stringify(v ?? f.default ?? (f.type === 'object' ? {} : []), null, 2);
      input = html`<textarea id="f-${f.key}" @input=${(e) => this.onFieldInput(f, e)}>${txt}</textarea>`;
    } else {
      input = html`<input id="f-${f.key}" type="text" .value=${v ?? ''} @input=${(e) => this.onFieldInput(f, e)}>`;
    }
    return html`${label}${input}${err ? html`<div class="field-error">${err}</div>` : ''}`;
  }

  renderConfigModal(feature) {
    const schema = field(feature, 'config_schema') ?? { fields: [] };
    return html`
      <div class="overlay" @click=${(e) => { if (e.target === e.currentTarget) this.closeConfig(); }}>
        <div class="modal" role="dialog" aria-label="config ${field(feature, "slug")}">
          <h2>${titleOf(feature, this.locale)} — configuration</h2>
          ${schema.fields?.length ? schema.fields.map((f) => this.renderField(f)) : html`<p class="desc">Aucune option configurable.</p>`}
          ${this.editingErrors._global ? html`<div class="field-error">${this.editingErrors._global}</div>` : ''}
          <div class="foot">
            <button class="secondary" @click=${() => this.closeConfig()}>Annuler</button>
            <button @click=${() => this.saveConfig(feature)}>Enregistrer</button>
          </div>
        </div>
      </div>`;
  }

  // ------------------------------------------------------- admin (métadonnées)
  openAdmin(feature) {
    this.adminError = '';
    this.adminValues = {
      title_fr: field(feature, 'title_i18n')?.fr ?? '',
      desc_fr: field(feature, 'description_i18n')?.fr ?? '',
      icon: field(feature, 'icon') ?? 'extension',
      menu_order: field(feature, 'menu_order') ?? 0,
      default_enabled: !!featureEnabled({}, feature),
      config_schema: JSON.stringify(field(feature, 'config_schema') ?? { fields: [] }, null, 2),
    };
    this.adminSlug = field(feature, "slug");
  }

  closeAdmin() { this.adminSlug = null; this.adminError = ''; }

  async saveAdmin(feature) {
    let configSchema;
    try { configSchema = JSON.parse(this.adminValues.config_schema); }
    catch { this.adminError = 'config_schema : JSON invalide'; return; }
    const patch = {
      title_i18n: { fr: this.adminValues.title_fr },
      description_i18n: { fr: this.adminValues.desc_fr },
      icon: this.adminValues.icon || 'extension',
      menu_order: Number(this.adminValues.menu_order) || 0,
      default_enabled: !!this.adminValues.default_enabled,
      config_schema: configSchema,
    };
    try {
      // Admin v1 : métadonnées uniquement (§1.9.8) → PATCH /features/<slug> (CA-A7).
      const res = await (window.sibStore?.fetchAuthn ?? fetch)(`/features/${field(feature, 'slug')}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/merge-patch+json', accept: 'application/ld+json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(`PATCH /features/${field(feature, "slug")} → ${res.status}`);
      this.closeAdmin();
      await this.refresh();
    } catch (e) { this.adminError = e.message; }
  }

  renderAdminModal(feature) {
    const v = this.adminValues;
    return html`
      <div class="overlay" @click=${(e) => { if (e.target === e.currentTarget) this.closeAdmin(); }}>
        <div class="modal" role="dialog" aria-label="éditer ${field(feature, "slug")}">
          <h2>Métadonnées — ${field(feature, "slug")}</h2>
          <label for="a-title">Titre (fr)</label>
          <input id="a-title" type="text" .value=${v.title_fr} @input=${(e) => this.adminValues = { ...v, title_fr: e.target.value }}>
          <label for="a-desc">Description (fr)</label>
          <textarea id="a-desc" @input=${(e) => this.adminValues = { ...v, desc_fr: e.target.value }}>${v.desc_fr}</textarea>
          <label for="a-icon">Icône (Material Icons)</label>
          <input id="a-icon" type="text" .value=${v.icon} @input=${(e) => this.adminValues = { ...v, icon: e.target.value }}>
          <label for="a-order">Ordre du menu</label>
          <input id="a-order" type="number" .value=${v.menu_order} @input=${(e) => this.adminValues = { ...v, menu_order: e.target.value }}>
          <label for="a-def"><input id="a-def" type="checkbox" .checked=${v.default_enabled} @change=${(e) => this.adminValues = { ...v, default_enabled: e.target.checked }}> activée par défaut</label>
          <label for="a-schema">config_schema (JSON)</label>
          <textarea id="a-schema" @input=${(e) => this.adminValues = { ...v, config_schema: e.target.value }}>${v.config_schema}</textarea>
          ${this.adminError ? html`<div class="field-error">${this.adminError}</div>` : ''}
          <div class="foot">
            <button class="secondary" @click=${() => this.closeAdmin()}>Annuler</button>
            <button @click=${() => this.saveAdmin(feature)}>Enregistrer</button>
          </div>
        </div>
      </div>`;
  }

  // ------------------------------------------------------------------ render
  renderContent() {
    if (this.catalogueMissing) {
      return html`<div class="error" role="alert">
        Catalogue indisponible : <code>GET /features/ → 404</code> côté serveur.
        Intégrer <code>app-store/model/app-store.model.json</code> au <code>model.json</code> de l'app
        (appliqué au boot par le nœud FAP-LDP) + exécuter <code>sql/012_backfill_prefs.sql</code>
        (rôle <code>admin</code>) + seed <code>101_seed_demo.sql</code> — voir
        <code>app-store/sql/README.md</code> — ou lancer en démo avec <code>VITE_FIXTURES=1</code>.
      </div>`;
    }
    const admin = this.isAdmin();
    const editing = this.objects.find((f) => field(f, "slug") === this.editingSlug);
    const adminFeature = this.objects.find((f) => field(f, "slug") === this.adminSlug);
    return html`
      ${this.toast ? html`<div class="toast" role="status">${this.toast}</div>` : ''}
      <ul class="features">
        ${this.objects.map((f) => {
          const enabled = featureEnabled(this.prefsObj, f);
          const schema = field(f, 'config_schema') ?? { fields: [] };
          const entry = this.prefsObj?.[field(f, "slug")] ?? {};
          const configured = isConfigured(entry.config, schema); // §1.9.11
          return html`
            <li class="card feature">
              <div class="head">
                ${unsafeHTML(iconSvg(field(f, 'icon') || 'extension'))}
                <h3>${titleOf(f, this.locale)}</h3>
                ${configured ? html`<span class="badge configured">configuré</span>` : ''}
              </div>
              <p class="desc">${field(f, 'description_i18n')?.[this.locale] ?? field(f, 'description_i18n')?.fr ?? ''}</p>
              <div class="actions">
                <label class="switch" title="activer/désactiver">
                  <input type="checkbox" .checked=${enabled} @change=${(e) => this.onToggle(f, e)}>
                  <span class="slider"></span>
                </label>
                <button class="secondary" ?disabled=${!enabled} @click=${() => this.openConfig(f)}>Configurer</button>
                ${admin ? html`<button class="secondary" @click=${() => this.openAdmin(f)}>Éditer</button>` : ''}
              </div>
            </li>`;
        })}
      </ul>
      ${editing ? this.renderConfigModal(editing) : ''}
      ${adminFeature ? this.renderAdminModal(adminFeature) : ''}
    `;
  }
}

customElements.define('app-store', AppStore);
