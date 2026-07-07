/**
 * utils.js — shared helpers used across modules.
 * Pure functions only; no DOM/state coupling.
 */

/** Clamp a number to an inclusive range. */
export const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

/** Sleep for `ms` milliseconds (used by the animation scheduler). */
export const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

/** Random integer in [min, max] inclusive. */
export const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/** Deterministic string key for a coordinate — used by Sets/Maps. */
export const coordKey = (row, col) => `${row},${col}`;

/** Parse a coordKey back to [row, col]. */
export const parseKey = (key) => key.split(",").map(Number);

/** Manhattan distance heuristic (4-directional grids). */
export const manhattan = (a, b) => Math.abs(a.row - b.row) + Math.abs(a.col - b.col);

/** Euclidean distance heuristic. */
export const euclidean = (a, b) =>
  Math.sqrt((a.row - b.row) ** 2 + (a.col - b.col) ** 2);

/** Chebyshev distance heuristic (8-directional grids). */
export const chebyshev = (a, b) =>
  Math.max(Math.abs(a.row - b.row), Math.abs(a.col - b.col));

/** Debounce — delays invoking fn until `wait`ms after the last call. */
export function debounce(fn, wait = 150) {
  let t;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

/** Throttle — invoke at most once per `limit`ms. */
export function throttle(fn, limit = 60) {
  let inThrottle = false;
  return function (...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/** Estimate memory usage in KB from a node count (rough heuristic). */
export const estimateMemoryKB = (nodeCount) =>
  Math.round((nodeCount * 64) / 1024 * 100) / 100; // ~64 bytes/node

/** Speed presets → per-step delay in ms. `instant` skips animation. */
export const SPEED_DELAYS = Object.freeze({
  verySlow: 90,
  slow: 45,
  medium: 20,
  fast: 8,
  veryFast: 3,
  instant: 0,
});

/** Human-readable speed labels for the stats panel. */
export const SPEED_LABELS = Object.freeze({
  verySlow: "Very Slow",
  slow: "Slow",
  medium: "Medium",
  fast: "Fast",
  veryFast: "Very Fast",
  instant: "Instant",
});

/** Simple pub/sub event bus for decoupled module communication. */
export class EventBus {
  #listeners = new Map();
  on(event, cb) {
    if (!this.#listeners.has(event)) this.#listeners.set(event, new Set());
    this.#listeners.get(event).add(cb);
    return () => this.#listeners.get(event)?.delete(cb);
  }
  emit(event, payload) {
    this.#listeners.get(event)?.forEach((cb) => cb(payload));
  }
}

/** Announce a message to screen readers via the live region. */
export function announce(message) {
  const live = document.getElementById("sr-live");
  if (live) live.textContent = message;
}