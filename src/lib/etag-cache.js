// Weak ETag concurrency + cache — front spec §2: stale If-Match (PUT/PATCH) → 412;
// If-None-Match (GET) → 304, serve the cache. Invalidation on the `save` event (§5).

export class EtagCache {
  #entries = new Map(); // url -> { etag, body }

  store(url, etag, body) {
    if (etag) this.#entries.set(url, { etag, body });
  }

  get(url) {
    return this.#entries.get(url);
  }

  // Purge the resource and its container (mutation via solid-form → save event, §5).
  purge(url) {
    this.#entries.delete(url);
    const container = url.replace(/[^/]+\/?$/, '');
    this.#entries.delete(container);
  }

  requestHeaders(url, method) {
    const entry = this.#entries.get(url);
    if (!entry) return {};
    return method === 'GET' ? { 'If-None-Match': entry.etag } : { 'If-Match': entry.etag };
  }

  handleResponse(url, status, etag, body) {
    if (status === 304) return { action: 'serve-cache', body: this.#entries.get(url)?.body };
    if (status === 412) return { action: 'conflict-reload' };
    if (status >= 200 && status < 300) {
      this.store(url, etag, body);
      return { action: 'ok', body };
    }
    return { action: 'error', status };
  }
}
