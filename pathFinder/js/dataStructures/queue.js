/**
 * Queue — FIFO (First-In, First-Out).
 * Implemented with a circular head pointer to achieve amortized O(1)
 * dequeue without repeatedly re-indexing the underlying array.
 * Used by BFS.
 */
export class Queue {
  #items = [];
  #head = 0;

  /** @param {*} value */
  enqueue(value) {
    this.#items.push(value);
    return this;
  }

  /** @returns {*} the front value, or undefined if empty */
  dequeue() {
    if (this.isEmpty) return undefined;
    const value = this.#items[this.#head];
    this.#items[this.#head] = undefined; // release reference
    this.#head++;
    // Periodically compact to reclaim memory
    if (this.#head > 32 && this.#head * 2 >= this.#items.length) {
      this.#items = this.#items.slice(this.#head);
      this.#head = 0;
    }
    return value;
  }

  peek() {
    return this.isEmpty ? undefined : this.#items[this.#head];
  }

  get size() { return this.#items.length - this.#head; }
  get isEmpty() { return this.size === 0; }

  /** Snapshot of current contents (for educational visualization). */
  toArray() { return this.#items.slice(this.#head); }

  clear() { this.#items = []; this.#head = 0; }
}