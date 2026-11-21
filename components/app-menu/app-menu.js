// <app-menu> — menu de l'app généré dynamiquement depuis les préférences
// (spec app-store-spec.md v0.4 §1.6.1, CA-A1).
//
// - Lit /features/ (catalogue) + /prefs/<me> via window.appStore (§1.6.1).
// - Rend un lien par feature enabled=true, triées (menu_order, slug) (§1.9.1),
//   en joignant au catalogue — les slugs des prefs inconnus du catalogue sont
//   ignorés (§1.9.4d).
// - N'affiche que les features dont la route existe dans orbit.json (§1.9.8).
// - Installe le guard de route du shell : route d'une feature désactivée →
//   redirect '/' (§1.9.7, CA-A4).
// - Se met à jour à chaud : abonnement appStore.onChange + événement `save`
//   (contrat §1.9.9) — le boilerplate OrbitComponent écoute déjà `save`.
import { html, css } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { unsafeStatic, html as staticHtml } from 'lit/static-html.js';
import { OrbitComponent, getJson, resolveMembers } from '../boilerplate/index.js';
import appStore from '../shared/app-store-api.js';
import { menuEntries, titleOf, get } from '../shared/logic.js';
import { iconSvg } from '../shared/icons.js';

// solid-link si le Store SIB est chargé (Orbit prod), sinon <a> — même contrat
// : les deux dispatchent `requestNavigation`.
const LINK_TAG = typeof customElements !== 'undefined' && customElements.get('solid-link')
  ? unsafeStatic('solid-link')
  : unsafeStatic('a');

export class AppMenu extends OrbitComponent {
  static properties = {
    ...OrbitComponent.properties,
    prefsObj: { type: Object, attribute: false },
    locale: { type: String },
    theme: { type: String, reflect: true },
  };

  static styles = css`
    ${OrbitComponent.styles}
    nav ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
    .menu-link {
      display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 10px;
      color: var(--ink); text-decoration: none; font-size: 0.92rem; font-weight: 500;
      transition: background .12s ease;
    }
    .menu-link:hover { background: #f0fdfa; }
    .menu-link.active { background: #ccfbf1; color: var(--brand-dark); font-weight: 700; }
    .menu-link .icon { width: 20px; height: 20px; flex-shrink: 0; color: var(--muted); }
    .menu-link.active .icon { color: var(--brand-dark); }
    h1 { font-size: 0.78rem; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); margin: 0 0 8px 12px; }
    /* thème sombre (shell à menu latéral foncé) : <app-menu theme="dark"> */
    :host([theme="dark"]) { --ink: #e2e8f0; --muted: #94a3b8; --border: rgba(148,163,184,.18); }
    :host([theme="dark"]) .menu-link { color: #94a3b8; }
    :host([theme="dark"]) .menu-link:hover { background: rgba(30,41,59,.8); color: #f1f5f9; }
    :host([theme="dark"]) .menu-link.active {
      background: linear-gradient(90deg, rgba(6,78,59,.9), rgba(6,78,59,.35));
      color: #6ee7b7; font-weight: 600;
    }
    :host([theme="dark"]) .menu-link.active .icon { color: #34d399; }
    :host([theme="dark"]) .menu-link .icon { color: #94a3b8; }
    :host([theme="dark"]) h1 { color: #64748b; padding: 0 14px 10px; margin: 0 0 6px; }
  `;

  constructor() {
    super();
    this.dataSrc = '/features/';
    this.prefsObj = {};
    this.locale = window.getLocale?.() ?? 'en';
  }

  async load() {
    const data = await getJson(this.dataSrc);
    this.objects = (await resolveMembers(data)).filter((f) => f && get(f, "slug"));
    await appStore.whenReady();           // prefs chargées (read-after-write)
    this.prefsObj = appStore.getPrefs();
    return data;
  }

  connectedCallback() {
    super.connectedCallback();
    // Mise à jour à chaud sur PATCH des prefs (CA-A1 : sans rechargement) :
    // appStore émet onChange après chaque patchPrefs + événement `save` (§1.9.9).
    this._unsub = appStore.onChange(() => { this.prefsObj = appStore.getPrefs(); });
    // Guard de route du shell (§1.9.7) — installé une seule fois.
    if (!AppMenu._guardInstalled) {
      AppMenu._guardInstalled = true;
      appStore.installRouteGuard({ defaultPath: '/' });
    }
  }

  disconnectedCallback() {
    this._unsub?.();
    super.disconnectedCallback();
  }

  // §1.9.8 — le menu n'affiche que les features dont la route existe dans
  // orbit.json (check au runtime ; un check CI au build avertit aussi).
  routeExists(feature) {
    const routes = window.orbit?.routes;
    if (!Array.isArray(routes)) return true; // hors shell Orbit (tests) : pas de filtre
    return routes.some((r) => r.path === feature.route || r.name === feature.route);
  }

  isEmpty() {
    return menuEntries(this.objects, this.prefsObj, {
      locale: this.locale, routeExists: (f) => this.routeExists(f), role: appStore.getRole(),
    }).length === 0;
  }

  renderContent() {
    const entries = menuEntries(this.objects, this.prefsObj, {
      locale: this.locale,
      routeExists: (f) => this.routeExists(f),
      role: appStore.getRole(), // §1.4.1 role_min : filtrage menu (UX)
    });
    const current = window.location.pathname;
    return html`
      <nav aria-label="app menu">
        <h1>Menu</h1>
        <ul>
          ${entries.map((e) => {
            const active = current === e.route || (e.route?.includes(':') && current.startsWith(e.route.split(':')[0]));
            return staticHtml`<${LINK_TAG}
              class="menu-link ${active ? 'active' : ''}"
              data-route="${e.route ?? ''}"
              data-path="${e.route ?? ''}"
              @click=${(ev) => {
                ev.preventDefault();
                this.navigate(e.route, e.route);
              }}
            >${unsafeHTML(iconSvg(e.icon || 'extension'))}<span class="lbl">${e.title || titleOf({ slug: e.slug }, this.locale)}</span></${LINK_TAG}>`;
          })}
        </ul>
      </nav>`;
  }
}

customElements.define('app-menu', AppMenu);
