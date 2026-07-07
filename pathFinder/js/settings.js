import { Storage, StorageKeys } from "./storage.js";

/**
 * Settings — central, observable application state.
 * Holds user preferences + runtime mode flags. Persists to localStorage.
 * Also owns the undo/redo history of board snapshots.
 */
export class Settings {
  #listeners = new Set();

  constructor() {
    const saved = Storage.get(StorageKeys.SETTINGS, {});
    this.algorithm = saved.algorithm ?? "bfs";
    this.maze = "none";
    this.speed = saved.speed ?? "medium";
    this.theme = Storage.get(StorageKeys.THEME, "dark");
    this.contrast = Storage.get(StorageKeys.CONTRAST, "normal");
    this.gridSize = saved.gridSize ?? 30;
    this.soundOn = saved.soundOn ?? false;
    this.brush = "wall"; // 'wall' | 'weight'

    // Runtime mode flags
    this.educational = false;
    this.comparison = false;
    this.stepMode = false;

    // Undo/redo history (board snapshots as compact strings)
    this.undoStack = [];
    this.redoStack = [];
    this.maxHistory = 50;
  }

  /** Subscribe to any change. Returns an unsubscribe fn. */
  subscribe(cb) { this.#listeners.add(cb); return () => this.#listeners.delete(cb); }
  #notify(key) { this.#listeners.forEach((cb) => cb(key, this)); }

  /** Update a single field, persist, and notify. */
  set(key, value) {
    if (this[key] === value) return;
    this[key] = value;
    this.persist();
    this.#notify(key);
  }

  persist() {
    Storage.set(StorageKeys.SETTINGS, {
      algorithm: this.algorithm,
      speed: this.speed,
      gridSize: this.gridSize,
      soundOn: this.soundOn,
    });
    Storage.set(StorageKeys.THEME, this.theme);
    Storage.set(StorageKeys.CONTRAST, this.contrast);
  }

  /* ---------------- Undo / Redo ---------------- */

  pushHistory(snapshot) {
    this.undoStack.push(snapshot);
    if (this.undoStack.length > this.maxHistory) this.undoStack.shift();
    this.redoStack.length = 0; // new action invalidates redo
  }
  undo(current) {
    if (!this.undoStack.length) return null;
    this.redoStack.push(current);
    return this.undoStack.pop();
  }
  redo(current) {
    if (!this.redoStack.length) return null;
    this.undoStack.push(current);
    return this.redoStack.pop();
  }
  clearHistory() { this.undoStack.length = 0; this.redoStack.length = 0; }
}