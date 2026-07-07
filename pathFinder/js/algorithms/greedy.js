import { PriorityQueue } from "../dataStructures/priorityQueue.js";
import { reconstructPath, buildResult } from "./bfs.js";
import { manhattan } from "../utils.js";

/**
 * Greedy Best-First Search — informed but NOT optimal.
 * Prioritizes purely by the heuristic h(n) (estimated distance to goal),
 * ignoring the cost already spent (g). Very fast, but can produce
 * suboptimal paths. Great contrast to A*.
 */
export function greedy(grid, educational = false) {
  const start = grid.start;
  const end = grid.end;

  const visitedOrder = [];
  const steps = [];
  const pq = new PriorityQueue();
  const visited = new Set([start.key]);

  start.hCost = manhattan(start, end);
  pq.enqueue(start, start.hCost);
  let found = false;

  while (!pq.isEmpty) {
    const current = pq.dequeue();
    current.visited = true;
    if (!current.isStart && !current.isEnd) visitedOrder.push(current);

    if (current === end) { found = true; break; }

    const neighbors = [];
    for (const neighbor of grid.getNeighbors(current)) {
      if (neighbor.isWall || visited.has(neighbor.key)) continue;
      visited.add(neighbor.key);
      neighbor.previous = current;
      neighbor.hCost = manhattan(neighbor, end);
      pq.enqueue(neighbor, neighbor.hCost); // priority = heuristic ONLY
      neighbors.push(neighbor);
    }

    if (educational) {
      steps.push({
        current,
        neighbors,
        structure: pq.toArray()
          .map((e) => `${e.value.row},${e.value.col}:h=${e.priority}`),
        structureType: "Priority Queue (heuristic only)",
        note: `Chose (${current.row},${current.col}) with lowest h=${current.hCost}. Greedy ignores path cost, so it may overshoot the optimum.`,
      });
    }
  }

  const path = reconstructPath(end, found);
  return buildResult(visitedOrder, path, steps, found);
}