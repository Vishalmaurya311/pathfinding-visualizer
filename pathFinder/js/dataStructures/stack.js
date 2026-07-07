/**
 * Stack — LIFO (Last-In, First-Out).
 * Used by DFS. Simple array-backed with O(1) push/pop.
 */
export class Stack {
  #items = [];

  push(value) { this.#items.push(value); return this; }

  pop() { return this.#items.pop(); }

  peek() { return this.#items[this.#items.length - 1]; }

  get size() { return this.#items.length; }
  get isEmpty() { return this.#items.length === 0; }

  /** Snapshot for educational visualization (top last). */
  toArray() { return [...this.#items]; }

  clear() { this.#items = []; }
}