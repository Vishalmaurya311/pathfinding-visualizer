/**
 * MinHeap — binary heap keyed by a numeric priority.
 * Stores { value, priority } entries. Root is always the minimum priority.
 * Backbone for PriorityQueue (used by Dijkstra, A*, Greedy).
 *
 * Complexity: insert O(log n), extractMin O(log n), peek O(1).
 */
export class MinHeap {
  #heap = []; // array of { value, priority }

  get size() { return this.#heap.length; }
  get isEmpty() { return this.#heap.length === 0; }

  #parent(i) { return (i - 1) >> 1; }
  #left(i)   { return (i << 1) + 1; }
  #right(i)  { return (i << 1) + 2; }

  #swap(i, j) {
    const t = this.#heap[i];
    this.#heap[i] = this.#heap[j];
    this.#heap[j] = t;
  }

  /** Insert a value with a given numeric priority. */
  insert(value, priority) {
    this.#heap.push({ value, priority });
    this.#bubbleUp(this.#heap.length - 1);
    return this;
  }

  #bubbleUp(i) {
    while (i > 0) {
      const p = this.#parent(i);
      if (this.#heap[i].priority < this.#heap[p].priority) {
        this.#swap(i, p);
        i = p;
      } else break;
    }
  }

  /** Remove and return the minimum-priority value. */
  extractMin() {
    if (this.isEmpty) return undefined;
    const min = this.#heap[0];
    const last = this.#heap.pop();
    if (!this.isEmpty) {
      this.#heap[0] = last;
      this.#bubbleDown(0);
    }
    return min.value;
  }

  peek() { return this.isEmpty ? undefined : this.#heap[0].value; }

  #bubbleDown(i) {
    const n = this.#heap.length;
    while (true) {
      let smallest = i;
      const l = this.#left(i);
      const r = this.#right(i);
      if (l < n && this.#heap[l].priority < this.#heap[smallest].priority) smallest = l;
      if (r < n && this.#heap[r].priority < this.#heap[smallest].priority) smallest = r;
      if (smallest === i) break;
      this.#swap(i, smallest);
      i = smallest;
    }
  }

  /** Snapshot of entries (for educational visualization). */
  toArray() { return this.#heap.map(e => ({ value: e.value, priority: e.priority })); }

  clear() { this.#heap = []; }
}