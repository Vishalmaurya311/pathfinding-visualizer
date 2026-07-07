import { PriorityQueue } from "../dataStructures/priorityQueue.js";
import { reconstructPath, buildResult } from "./bfs.js";
import { coordKey } from "../utils.js";

/**
 * Dijkstra's Algorithm — weighted shortest path (non-negative weights).
 * Uses a min Priority Queue keyed by cumulative distance. Guarantees the
 * least-cost path when all edge weights are >= 0.
 */
export function dijkstra(grid, educational = false) {
  const start = grid.start;
  const end = grid.end;

  const visitedOrder = [];
  const steps = [];
  const pq = new PriorityQueue();
  const finalized = new Set(); // nodes with confirmed shortest distance

  start.distance = 0;
  pq.enqueue(start, 0);
  let found = false;

  while (!pq.isEmpty) {
    const current = pq.dequeue();
    if (finalized.has(current.key)) continue; // stale entry (lazy deletion)
    finalized.add(current.key);
    current.visited = true;
    if (!current.isStart && !current.isEnd) visitedOrder.push(current);

    if (current === end) { found = true; break; }

    const neighbors = [];
    for (const neighbor of grid.getNeighbors(current)) {
      if (neighbor.isWall || finalized.has(neighbor.key)) continue;
      // Relaxation: distance to neighbor via current
      const tentative = current.distance + neighbor.cost;
      if (tentative < neighbor.distance) {
        neighbor.distance = tentative;
        neighbor.previous = current;
        pq.enqueue(neighbor, tentative);
        neighbors.push(neighbor);
      }
    }

    if (educational) {
      steps.push({
        current,
        neighbors,
        structure: pq.toArray().map((e) => `${e.value.row},${e.value.col}:${e.priority}`),
        structureType: "Priority Queue",
        note: `Finalized (${current.row},${current.col}) at distance ${current.distance}. Relaxed ${neighbors.length} neighbor(s).`,
      });
    }
  }

  const path = reconstructPath(end, found);
  return buildResult(visitedOrder, path, steps, found);
}