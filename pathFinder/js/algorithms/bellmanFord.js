import { reconstructPath, buildResult } from "./bfs.js";

/**
 * Bellman-Ford — weighted shortest path that tolerates negative edges
 * (and can detect negative cycles). Relaxes ALL edges V-1 times.
 * On a grid we model each move to a neighbor as an edge of weight = neighbor.cost.
 *
 * Slower than Dijkstra (O(V·E)) but more general. We record each node the
 * first time its distance improves, to produce a meaningful visited order.
 */
export function bellmanFord(grid, educational = false) {
  const start = grid.start;
  const end = grid.end;

  const visitedOrder = [];
  const steps = [];
  const seen = new Set();

  // Collect all non-wall vertices
  const vertices = [];
  grid.forEach((cell) => { if (!cell.isWall) vertices.push(cell); });

  start.distance = 0;
  let found = false;

  // Relax all edges |V| - 1 times
  for (let iteration = 0; iteration < vertices.length - 1; iteration++) {
    let updatedThisPass = false;

    for (const u of vertices) {
      if (u.distance === Infinity) continue; // not yet reachable
      for (const v of grid.getNeighbors(u)) {
        if (v.isWall) continue;
        const tentative = u.distance + v.cost;
        if (tentative < v.distance) {
          v.distance = tentative;
          v.previous = u;
          updatedThisPass = true;

          if (!seen.has(v.key) && !v.isStart && !v.isEnd) {
            seen.add(v.key);
            v.visited = true;
            visitedOrder.push(v);
          }

          if (educational) {
            steps.push({
              current: v,
              neighbors: [u],
              structure: [`iter ${iteration + 1}`, `d[${v.row},${v.col}] = ${tentative}`],
              structureType: "Distance Map (relaxation)",
              note: `Iteration ${iteration + 1}: relaxed edge (${u.row},${u.col})→(${v.row},${v.col}). New distance ${tentative}.`,
            });
          }
        }
      }
    }

    // Early exit: no changes ⇒ distances have converged
    if (!updatedThisPass) break;
  }

  found = end.distance !== Infinity;
  const path = reconstructPath(end, found);
  return buildResult(visitedOrder, path, steps, found);
}