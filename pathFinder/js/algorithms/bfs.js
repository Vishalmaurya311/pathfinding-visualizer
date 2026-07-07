import { Queue } from "../dataStructures/queue.js";
import { coordKey } from "../utils.js";

/**
 * Breadth First Search — unweighted shortest path.
 * Explores level by level using a FIFO Queue. Guarantees the fewest
 * number of edges to the target (ignores weights).
 *
 * @param {import('../grid.js').Grid} grid
 * @param {boolean} educational - capture per-step snapshots
 */
export function bfs(grid, educational = false) {
  const start = grid.start;
  const end = grid.end;

  const visitedOrder = [];
  const steps = [];
  const visited = new Set([start.key]); // Visited Set (hash set)
  const queue = new Queue();

  queue.enqueue(start);
  let found = false;

  while (!queue.isEmpty) {
    const current = queue.dequeue();
    current.visited = true;
    if (!current.isStart && !current.isEnd) visitedOrder.push(current);

    if (current === end) { found = true; break; }

    const neighbors = [];
    for (const neighbor of grid.getNeighbors(current)) {
      if (neighbor.isWall || visited.has(neighbor.key)) continue;
      visited.add(neighbor.key);
      neighbor.previous = current;
      queue.enqueue(neighbor);
      neighbors.push(neighbor);
    }

    if (educational) {
      steps.push({
        current,
        neighbors,
        structure: queue.toArray().map((c) => coordKey(c.row, c.col)),
        structureType: "Queue",
        note: `Dequeued (${current.row},${current.col}). Enqueued ${neighbors.length} unvisited neighbor(s). BFS expands by distance in edges.`,
      });
    }
  }

  const path = reconstructPath(end, found);
  return buildResult(visitedOrder, path, steps, found);
}

/* Shared helpers (re-exported for other algorithms) */
export function reconstructPath(end, found) {
  const path = [];
  if (!found) return path;
  let node = end;
  while (node) { path.unshift(node); node = node.previous; }
  return path;
}

export function buildResult(visitedOrder, path, steps, found) {
  let pathCost = 0;
  for (const c of path) pathCost += c.cost;
  return {
    visitedOrder,
    path,
    steps,
    found,
    stats: {
      visited: visitedOrder.length,
      explored: visitedOrder.length,
      pathLength: path.length ? path.length - 1 : 0, // edges
      pathCost,
    },
  };
}