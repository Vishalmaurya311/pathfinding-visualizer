/**
 * storage.js — thin, safe localStorage wrapper.
 * All access is guarded so private-mode / disabled storage never throws.
 */
const NS = "pfv:"; // namespace to avoid key collisions

export const Storage = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(NS + key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(NS + key, JSON.stringify(value)); return true; }
    catch { return false; }
  },
  remove(key) {
    try { localStorage.removeItem(NS + key); } catch { /* noop */ }
  },
};

/** Keys used by the app (single source of truth). */
export const StorageKeys = Object.freeze({
  THEME: "theme",
  SETTINGS: "settings",
  CONTRAST: "contrast",
});