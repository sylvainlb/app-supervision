// Orchestration v2 — install / uninstall / upgrade of distant features
// (app-store-spec.md Part 2 §2.2.3–§2.2.5, CA-A5/CA-A6).
//
// Uses window.appStore (app-store-api.js) for prefs + catalogue, and
// loader.js for the SRI check before import. The user confirmation
// is injectable (confirmFn) to stay testable.
import { get as getField, isDistant, installPatch, uninstallPatch, upgradeAvailable, installedEntry } from './logic.js';
import { loadRemoteModule, evictModule, SriMismatchError } from './loader.js';

/**
 * Enables a feature (packaged or distant).
 * - packaged (v1): simple toggle enabled=true.
 * - distant (v2): confirmFn({npmPackage, version, sri}) → loadRemoteModule (SRI
 *   checked, CA-A5) → patchPrefs(installPatch(slug, version, sri)): the
 *   actually loaded version is recorded in the prefs (§2.1).
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
  // §2.2.3 — explicit dialog "install <package>@<version>?" (shows the sri)
  const ok = confirmFn ? await confirmFn({ npmPackage, version, sri, slug }) : true;
  if (!ok) return { installed: false };
  // §2.2.2 / CA-A5 — MANUAL SHA-384 check BEFORE import (O-A1)
  await loadRemoteModule({ cdnUrl, sri, tag: getField(feature, 'tag') }, { fetchFn, importFn });
  // §2.2.3 — prefs: enabled + actually loaded version/sri (front audit)
  await appStoreApi.patchPrefs(installPatch(slug, version, sri));
  return { installed: true, version, sri };
}

/**
 * Uninstalls a distant feature (§2.2.4): prefs updated (enabled=false,
 * installed_* removed), module removed from the cache, blob URL revoked. Packaged
 * (v1) features cannot be uninstalled.
 */
export async function uninstallFeature(appStoreApi, feature, { fetchFn } = {}) {
  const slug = getField(feature, 'slug');
  if (!isDistant(feature)) throw new Error(`packaged feature cannot be uninstalled: ${slug}`);
  const cdnUrl = getField(feature, 'cdn_url');
  evictModule(cdnUrl); // module removed from cache + blob revoked
  await appStoreApi.patchPrefs(uninstallPatch(slug));
  return { uninstalled: true };
}

/**
 * Upgrade (CA-A6): the catalogue announces version > installed_version →
 * re-download + re-verification of the NEW sri, then prefs updated.
 */
export async function upgradeFeature(appStoreApi, feature, prefsObj, { confirmFn, fetchFn, importFn } = {}) {
  const slug = getField(feature, 'slug');
  if (!upgradeAvailable(feature, prefsObj)) return { upgraded: false };
  evictModule(getField(feature, 'cdn_url')); // force the re-fetch (no cache hit)
  return installFeature(appStoreApi, feature, { confirmFn, fetchFn, importFn });
}

export { SriMismatchError, upgradeAvailable, installedEntry };
