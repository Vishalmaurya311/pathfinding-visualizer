import { MinHeap } from "./minHeap.js";

/**
 * PriorityQueue — thin, semantic wrapper over MinHeap.
 * Lower priority number = higher precedence (min-priority queue).
 * Used by Dijkstra (distance), A* (f-cost), Greedy (h-cost).
 */
export class PriorityQueue {
  #heap = new MinHeap();

  enqueue(value, priority) { this.#heap.insert(value, priority); return this; }
  dequeue() { return this.#heap.extractMin(); }
  peek() { return this.#heap.peek(); }

  get size() { return this.#heap.size; }
  get isEmpty() { return this.#heap.isEmpty; }

  toArray() { return this.#heap.toArray(); }
  clear() { this.#heap.clear(); }
}