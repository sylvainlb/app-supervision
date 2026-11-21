// Orchestration v2 — install / uninstall / upgrade des features distantes
// (spec app-store-spec.md Partie 2 §2.2.3–§2.2.5, CA-A5/CA-A6).
//
// Utilise window.appStore (app-store-api.js) pour les prefs + le catalogue, et
// loader.js pour la vérification SRI avant import. La confirmation utilisateur
// est injectable (confirmFn) pour rester testable.
import { get as getField, isDistant, installPatch, uninstallPatch, upgradeAvailable, installedEntry } from './logic.js';
import { loadRemoteModule, evictModule, SriMismatchError } from './loader.js';

/**
 * Active une feature (packagée ou distante).
 * - packagée (v1) : simple toggle enabled=true.
 * - distante (v2) : confirmFn({npmPackage, version, sri}) → loadRemoteModule (SRI
 *   vérifié, CA-A5) → patchPrefs(installPatch(slug, version, sri)) : la version
 *   réellement chargée est enregistrée dans les prefs (§2.1).
 * @returns {Promise<{installed:boolean, version?:string, sri?:string}>}
 */
export async function installFeature(appStoreApi, feature, { confirmFn, fetchFn, importFn } = {}) {
  const slug = getField(feature, 'slug');
  if (!isDistant(feature)) {
    await appStoreApi.patchPrefs({ [slug]: { enabled: true } });
    return { installed: true };
  }
  const cdnUrl = getField(feature, 'cdn_url');
  const sri = getField(feature, 'sri');
  const version = getField(feature, 'version');
  const npmPackage = getField(feature, 'npm_package') ?? slug;
  // §2.2.3 — boîte de dialogue explicite « installer <package>@<version> ? » (affiche le sri)
  const ok = confirmFn ? await confirmFn({ npmPackage, version, sri, slug }) : true;
  if (!ok) return { installed: false };
  // §2.2.2 / CA-A5 — vérification SHA-384 manuelle AVANT import (O-A1)
  await loadRemoteModule({ cdnUrl, sri, tag: getField(feature, 'tag') }, { fetchFn, importFn });
  // §2.2.3 — prefs : enabled + version/sri réellement chargés (audit front)
  await appStoreApi.patchPrefs(installPatch(slug, version, sri));
  return { installed: true, version, sri };
}

/**
 * Désinstalle une feature distante (§2.2.4) : prefs mises à jour (enabled=false,
 * installed_* supprimés), module retiré du cache, blob URL révoqué. Les features
 * packagées (v1) ne sont pas désinstallables.
 */
export async function uninstallFeature(appStoreApi, feature, { fetchFn } = {}) {
  const slug = getField(feature, 'slug');
  if (!isDistant(feature)) throw new Error(`feature packagée non désinstallable : ${slug}`);
  const cdnUrl = getField(feature, 'cdn_url');
  evictModule(cdnUrl); // module retiré du cache + blob révoqué
  await appStoreApi.patchPrefs(uninstallPatch(slug));
  return { uninstalled: true };
}

/**
 * Upgrade (CA-A6) : le catalogue annonce version > installed_version →
 * re-téléchargement + re-vérification du NOUVEAU sri, puis prefs mises à jour.
 */
export async function upgradeFeature(appStoreApi, feature, prefsObj, { confirmFn, fetchFn, importFn } = {}) {
  const slug = getField(feature, 'slug');
  if (!upgradeAvailable(feature, prefsObj)) return { upgraded: false };
  evictModule(getField(feature, 'cdn_url')); // force le re-fetch (pas de cache hit)
  return installFeature(appStoreApi, feature, { confirmFn, fetchFn, importFn });
}

export { SriMismatchError, upgradeAvailable, installedEntry };
