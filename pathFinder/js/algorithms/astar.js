import { PriorityQueue } from "../dataStructures/priorityQueue.js";
import { reconstructPath, buildResult } from "./bfs.js";
import { manhattan } from "../utils.js";

/**
 * A* Search — informed weighted shortest path.
 * f(n) = g(n) + h(n)
 *   g = actual cost from start
 *   h = heuristic estimate to goal (Manhattan, admissible on 4-dir grids)
 * With an admissible heuristic, A* is optimal and typically explores far
 * fewer nodes than Dijkstra.
 */
export function astar(grid, educational = false) {
  const start = grid.start;
  const end = grid.end;

  const visitedOrder = [];
  const steps = [];
  const openSet = new PriorityQueue();   // frontier keyed by fCost
  const closedSet = new Set();           // fully evaluated nodes
  const inOpen = new Set();

  start.gCost = 0;
  start.hCost = manhattan(start, end);
  start.fCost = start.hCost;
  openSet.enqueue(start, start.fCost);
  inOpen.add(start.key);
  let found = false;

  while (!openSet.isEmpty) {
    const current = openSet.dequeue();
    if (closedSet.has(current.key)) continue;
    closedSet.add(current.key);
    inOpen.delete(current.key);
    current.visited = true;
    if (!current.isStart && !current.isEnd) visitedOrder.push(current);

    if (current === end) { found = true; break; }

    const neighbors = [];
    for (const neighbor of grid.getNeighbors(current)) {
      if (neighbor.isWall || closedSet.has(neighbor.key)) continue;

      const tentativeG = current.gCost + neighbor.cost;
      if (tentativeG < neighbor.gCost) {
        neighbor.previous = current;
        neighbor.gCost = tentativeG;
        neighbor.hCost = manhattan(neighbor, end);
        neighbor.fCost = neighbor.gCost + neighbor.hCost;
        openSet.enqueue(neighbor, neighbor.fCost);
        inOpen.add(neighbor.key);
        neighbors.push(neighbor);
      }
    }

    if (educational) {
      steps.push({
        current,
        neighbors,
        structure: openSet.toArray()
          .map((e) => `${e.value.row},${e.value.col}:f=${e.priority}`),
        structureType: "Open Set (Priority Queue)",
        note: `Expanded (${current.row},${current.col}) g=${current.gCost} h=${current.hCost} f=${current.fCost}. Closed set size: ${closedSet.size}.`,
      });
    }
  }

  const path = reconstructPath(end, found);
  return buildResult(visitedOrder, path, steps, found);
}