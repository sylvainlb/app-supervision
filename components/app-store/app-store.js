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
import { iconSvg } from '../shared/icons.js';
import { OrbitComponent, getJson, resolveMembers } from '../boilerplate/index.js';
import appStore, { AppStoreConflictError } from '../shared/app-store-api.js';
import {
  titleOf, featureEnabled, isConfigured, configDefaults,
  togglePatch, configPatch, validateConfig, normalizeFieldValue, roleAllowed,
  isDistant, isInstalled, upgradeAvailable, installedEntry,
  groupByCategory, categoryLabel, featureMatchesQuery,
} from '../shared/logic.js';
import { installFeature, uninstallFeature, upgradeFeature } from '../shared/install.js';
import { SriMismatchError } from '../shared/loader.js';

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
    installSlug: { type: String, attribute: false },   // modale d'installation ouverte (v2)
    installing: { type: Boolean, attribute: false },    // install en cours (fetch + vérif SRI)
    query: { type: String },                            // recherche texte du store
    activeCat: { type: String, attribute: false },      // filtre catégorie ('all' = toutes)
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
    .badge { margin-left: 8px; font-size: .72rem; padding: 2px 8px; border-radius: 999px; background: #e0e7ff; color: #3730a3; }
    .badge.configured { background: #ccfbf1; color: #0f766e; }   /* teal : user-configured */
    .badge.installed { background: #dcfce7; color: #15803d; }    /* green : remote feature installed */
    .badge.remote { background: #e0e7ff; color: #3730a3; }       /* indigo : remote, not installed yet */
    .badge.upgrade { background: #fef3c7; color: #b45309; }      /* amber : update available */
    .toolbar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 14px; }
    .toolbar .search { flex: 1 1 240px; }
    .chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .chip { border: 1px solid #cbd5e1; background: #fff; border-radius: 999px; padding: 4px 12px; font-size: .8rem; cursor: pointer; }
    .chip.on { background: var(--brand); border-color: var(--brand); color: #fff; }
    section.cat { margin-bottom: 18px; }
    section.cat > h2 { font-size: .85rem; margin: 0 0 10px; color: var(--muted); text-transform: uppercase; letter-spacing: .05em; }
    .modal .pkg { font-size: .85rem; color: var(--muted); margin: 4px 0 0; }
    .modal .pkg code { background: #f1f5f9; padding: 1px 6px; border-radius: 6px; }
    .modal .sri { margin-top: 12px; font-size: .78rem; color: var(--muted); }
    .modal .sri code { display: block; margin-top: 4px; background: #0f172a; color: #a5f3fc; padding: 8px 10px; border-radius: 8px; font-size: .72rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .modal .trust { margin-top: 12px; font-size: .78rem; background: #fffbeb; border: 1px solid #fde68a; color: #92400e; border-radius: 8px; padding: 8px 10px; }
    .modal .warn { margin-top: 12px; font-size: .8rem; background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; border-radius: 8px; padding: 8px 10px; }
  `;

  constructor() {
    super();
    this.dataSrc = '/features/';
    this.prefsObj = {};
    this.locale = window.getLocale?.() ?? 'en';
    this.editingSlug = null;
    this.editingValues = {};
    this.editingErrors = {};
    this.adminSlug = null;
    this.adminValues = {};
    this.installSlug = null;
    this.installing = false;
    this.query = '';
    this.activeCat = 'all';
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
    const slug = field(feature, "slug");
    try {
      if (enabled && isDistant(feature)) {
        // v2 §2.2.3 — modale de confirmation explicite (pas de window.confirm) :
        // on n'installe qu'après clic sur « Installer » (voir confirmInstall).
        ev.target.checked = false; // la case ne passe que si l'installation réussit
        this.installSlug = slug;
        return;
      } else if (!enabled && isDistant(feature)) {
        await uninstallFeature(appStore, feature); // §2.2.4 : révocation
      } else {
        // CA-A2 : PATCH merge-patch forme R1 + save (§1.9.9) → menu à jour à chaud.
        await appStore.patchPrefs(togglePatch(slug, enabled));
      }
      this.prefsObj = appStore.getPrefs();
      this.toast = '';
    } catch (e) {
      if (e instanceof AppStoreConflictError) {
        this.toast = 'Changed in the meantime — preferences reloaded.'; // §1.9.9 (412)
        this.prefsObj = appStore.getPrefs();
      } else if (e instanceof SriMismatchError) {
        this.toast = `Installation refused: ${e.message}`; // CA-A5
      } else {
        this.toast = `Error ${e.status ?? ''}: ${e.message}`;
      }
      ev.target.checked = !enabled; // rollback visuel
    }
  }

  // ------------------------------------------- modale d'installation (v2 §2.2.3)
  async confirmInstall(feature) {
    this.installing = true;
    try {
      // CA-A5 : SRI vérifié avant import (O-A1) ; SriMismatchError → refusé
      // (window.__appStoreLoaderDeps = hook de test pour injecter fetchFn/importFn)
      const r = await installFeature(appStore, feature, window.__appStoreLoaderDeps ?? {});
      this.toast = r.installed
        ? `« ${titleOf(feature, this.locale)} ” installed (v${r.version ?? field(feature, 'version')}) — SHA-384 fingerprint verified.`
        : '';
      this.prefsObj = appStore.getPrefs();
    } catch (e) {
      if (e instanceof AppStoreConflictError) {
        this.toast = 'Changed in the meantime — preferences reloaded.';
        this.prefsObj = appStore.getPrefs();
      } else if (e instanceof SriMismatchError) {
        this.toast = `Installation refused: invalid SHA-384 fingerprint (${e.message}).`; // CA-A5
      } else {
        this.toast = `Error ${e.status ?? ''}: ${e.message}`;
      }
    } finally {
      this.installing = false;
      this.installSlug = null;
    }
  }

  // v2 CA-A6 — upgrade proposé si le catalogue annonce version > installed_version
  async onUpgrade(feature, ev) {
    ev?.preventDefault();
    try {
      const r = await upgradeFeature(appStore, feature, this.prefsObj, {});
      this.toast = r.upgraded
        ? `Updated to v${field(feature, 'version')} (fingerprint re-verified).`
        : 'Already up to date.';
      this.prefsObj = appStore.getPrefs();
    } catch (e) {
      this.toast = e instanceof SriMismatchError ? `Upgrade refused: ${e.message}` : `Error: ${e.message}`;
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
      this.editingErrors = { _global: e instanceof AppStoreConflictError ? 'Changed in the meantime — reloaded.' : e.message };
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
          ${schema.fields?.length ? schema.fields.map((f) => this.renderField(f)) : html`<p class="desc">No configurable option.</p>`}
          ${this.editingErrors._global ? html`<div class="field-error">${this.editingErrors._global}</div>` : ''}
          <div class="foot">
            <button class="secondary" @click=${() => this.closeConfig()}>Cancel</button>
            <button @click=${() => this.saveConfig(feature)}>Save</button>
          </div>
        </div>
      </div>`;
  }

  // ------------------------------------------------------- admin (métadonnées)
  openAdmin(feature) {
    this.adminError = '';
    this.adminValues = {
      title_en: field(feature, 'title_i18n')?.en ?? field(feature, 'title_i18n')?.fr ?? '',
      desc_en: field(feature, 'description_i18n')?.en ?? field(feature, 'description_i18n')?.fr ?? '',
      icon: field(feature, 'icon') ?? 'extension',
      category: field(feature, 'category') ?? '',
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
    catch { this.adminError = 'config_schema: invalid JSON'; return; }
    const patch = {
      title_i18n: { en: this.adminValues.title_en },
      description_i18n: { en: this.adminValues.desc_en },
      icon: this.adminValues.icon || 'extension',
      category: this.adminValues.category || null, // 021_features_category.sql
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
        <div class="modal" role="dialog" aria-label="edit ${field(feature, "slug")}">
          <h2>Metadata — ${field(feature, "slug")}</h2>
          <label for="a-title">Title (en)</label>
          <input id="a-title" type="text" .value=${v.title_en} @input=${(e) => this.adminValues = { ...v, title_en: e.target.value }}>
          <label for="a-desc">Description (en)</label>
          <textarea id="a-desc" @input=${(e) => this.adminValues = { ...v, desc_en: e.target.value }}>${v.desc_en}</textarea>
          <label for="a-icon">Icon (name)</label>
          <input id="a-icon" type="text" .value=${v.icon} @input=${(e) => this.adminValues = { ...v, icon: e.target.value }}>
          <label for="a-cat">Category (store section)</label>
          <input id="a-cat" type="text" .value=${v.category} placeholder="supervision, operations, energy, compliance, tools" @input=${(e) => this.adminValues = { ...v, category: e.target.value }}>
          <label for="a-order">Menu order</label>
          <input id="a-order" type="number" .value=${v.menu_order} @input=${(e) => this.adminValues = { ...v, menu_order: e.target.value }}>
          <label for="a-def"><input id="a-def" type="checkbox" .checked=${v.default_enabled} @change=${(e) => this.adminValues = { ...v, default_enabled: e.target.checked }}> enabled by default</label>
          <label for="a-schema">config_schema (JSON)</label>
          <textarea id="a-schema" @input=${(e) => this.adminValues = { ...v, config_schema: e.target.value }}>${v.config_schema}</textarea>
          ${this.adminError ? html`<div class="field-error">${this.adminError}</div>` : ''}
          <div class="foot">
            <button class="secondary" @click=${() => this.closeAdmin()}>Cancel</button>
            <button @click=${() => this.saveAdmin(feature)}>Save</button>
          </div>
        </div>
      </div>`;
  }

  // ------------------------------------ modale d'installation (v2 §2.2.3, CA-A5)
  renderInstallModal(feature) {
    const slug = field(feature, 'slug');
    const pkg = field(feature, 'npm_package') ?? slug;
    const version = field(feature, 'version') ?? '?';
    const sri = field(feature, 'sri');
    const shortSri = sri ? `${sri.slice(0, 19)}…${sri.slice(-8)}` : '';
    const desc = field(feature, 'description_i18n')?.[this.locale] ?? field(feature, 'description_i18n')?.fr ?? '';
    return html`
      <div class="overlay" @click=${(e) => { if (e.target === e.currentTarget && !this.installing) this.installSlug = null; }}>
        <div class="modal" role="dialog" aria-modal="true" aria-label="install ${titleOf(feature, this.locale)}">
          <h2>Install “${titleOf(feature, this.locale)}”?</h2>
          ${desc ? html`<p class="desc">${desc}</p>` : ''}
          <p class="pkg">Package <code>${pkg}@${version}</code> — loaded on the fly from <code>${field(feature, 'cdn_url')}</code></p>
          ${sri
            ? html`<div class="sri">SHA-384 fingerprint (verified before loading)
                <code title=${sri}>${shortSri}</code></div>`
            : html`<div class="warn">No fingerprint (sri) in the catalogue — installation will be refused.</div>`}
          <div class="trust">This component will run with <strong>your rights</strong> on this pod (read/write access to your data), like any other feature. Only install packages you trust.</div>
          <div class="foot">
            <button class="secondary" ?disabled=${this.installing} @click=${() => { this.installSlug = null; }}>Cancel</button>
            <button ?disabled=${this.installing || !sri} @click=${() => this.confirmInstall(feature)}>
              ${this.installing ? 'Installing…' : 'Install'}
            </button>
          </div>
        </div>
      </div>`;
  }

  // ------------------------------------------------- organisation du store
  // Spec §1.6.2 révisée : le store est organisé par catégorie (rayons, colonne
  // app.features.category — migration 021) avec recherche texte ; le menu
  // (<app-menu>) reste plat.
  renderToolbar() {
    const cats = ['all', ...new Set(this.objects.map((f) => String(field(f, 'category') ?? '')))];
    return html`
      <div class="toolbar">
        <input class="search" type="search" placeholder="Search features…" .value=${this.query}
               @input=${(e) => { this.query = e.target.value; }}>
        <div class="chips">
          ${cats.map((c) => {
            const n = c === 'all' ? this.objects.length : this.objects.filter((f) => String(field(f, 'category') ?? '') === c).length;
            const label = c === 'all' ? `All (${n})` : `${categoryLabel(c, this.locale)} (${n})`;
            return html`<button class="chip ${this.activeCat === c ? 'on' : ''}" aria-pressed=${this.activeCat === c}
              @click=${() => { this.activeCat = c; }}>${label}</button>`;
          })}
        </div>
      </div>`;
  }

  renderCard(f) {
    const admin = this.isAdmin();
    const enabled = featureEnabled(this.prefsObj, f);
    const schema = field(f, 'config_schema') ?? { fields: [] };
    const slug = field(f, "slug");
    const entry = installedEntry(this.prefsObj, slug);
    const configured = isConfigured(entry.config, schema); // §1.9.11
    const distant = isDistant(f);                    // v2 : cdn_url + tag au catalogue
    const installed = isInstalled(f, this.prefsObj);  // CA-A5
    const upgrade = upgradeAvailable(f, this.prefsObj); // CA-A6
    return html`
      <li class="card feature">
        <div class="head">
          ${unsafeHTML(iconSvg(field(f, 'icon') || 'extension'))}
          <h3>${titleOf(f, this.locale)}</h3>
          ${configured ? html`<span class="badge configured">configured</span>` : ''}
          ${distant && installed ? html`<span class="badge installed" title="actually installed version (fingerprint verified)">installed v${entry.installed_version ?? ''}</span>` : ''}
          ${distant && !installed && !enabled ? html`<span class="badge remote" title="remote component (CDN) — downloaded and fingerprint-verified on activation">remote · not installed</span>` : ''}
          ${upgrade ? html`<span class="badge upgrade" title="the catalogue offers a newer version">update available: v${field(f, 'version')}</span>` : ''}
        </div>
        <p class="desc">${field(f, 'description_i18n')?.[this.locale] ?? field(f, 'description_i18n')?.fr ?? ''}</p>
        <div class="actions">
          <label class="switch" title="toggle on/off">
            <input type="checkbox" .checked=${enabled} @change=${(e) => this.onToggle(f, e)}>
            <span class="slider"></span>
          </label>
          ${enabled && (schema.fields ?? []).length > 0
            ? html`<button class="secondary" @click=${() => this.openConfig(f)}>Configure</button>`
            : ''}
          ${upgrade ? html`<button class="secondary" @click=${(e) => this.onUpgrade(f, e)}>Update</button>` : ''}
          ${admin ? html`<button class="secondary" @click=${() => this.openAdmin(f)}>Edit</button>` : ''}
        </div>
      </li>`;
  }

  // ------------------------------------------------------------------ render
  renderContent() {
    if (this.catalogueMissing) {
      return html`<div class="error" role="alert">
        Catalogue unavailable: <code>GET /features/ → 404</code> server-side.
        Add <code>app-store/model/app-store.model.json</code> to the app's <code>model.json</code>
        (applied at boot by the FAP-LDP node) + run <code>sql/012_backfill_prefs.sql</code>
        (role <code>admin</code>) + seed <code>101_seed_demo.sql</code> — see
        <code>app-store/sql/README.md</code> — or run the demo with <code>VITE_FIXTURES=1</code>.
      </div>`;
    }
    const admin = this.isAdmin();
    const editing = this.objects.find((f) => field(f, "slug") === this.editingSlug);
    const adminFeature = this.objects.find((f) => field(f, "slug") === this.adminSlug);
    return html`
      ${this.toast ? html`<div class="toast" role="status">${this.toast}</div>` : ''}
      ${this.renderToolbar()}
      ${(() => {
        const visible = this.objects.filter((f) =>
          (this.activeCat === 'all' || String(field(f, 'category') ?? '') === this.activeCat) &&
          featureMatchesQuery(f, this.query, this.locale));
        const groups = groupByCategory(visible, this.locale);
        if (!groups.length) return html`<p class="desc">No feature matches.</p>`;
        return groups.map((g) => html`
          <section class="cat" data-category=${g.category || 'other'}>
            <h2>${g.label}</h2>
            <ul class="features">${g.features.map((f) => this.renderCard(f))}</ul>
          </section>`);
      })()}
      ${editing ? this.renderConfigModal(editing) : ''}
      ${adminFeature ? this.renderAdminModal(adminFeature) : ''}
      ${this.installSlug ? this.renderInstallModal(this.objects.find((f) => field(f, 'slug') === this.installSlug)) : ''}
    `;
  }
}

customElements.define('app-store', AppStore);
