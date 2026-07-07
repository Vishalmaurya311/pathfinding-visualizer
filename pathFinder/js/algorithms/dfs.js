import { Stack } from "../dataStructures/stack.js";
import { reconstructPath, buildResult } from "./bfs.js";
import { coordKey } from "../utils.js";

/**
 * Depth First Search — explores as deep as possible before backtracking.
 * Uses a LIFO Stack. Does NOT guarantee the shortest path; useful to
 * demonstrate traversal order & backtracking behavior.
 */
export function dfs(grid, educational = false) {
  const start = grid.start;
  const end = grid.end;

  const visitedOrder = [];
  const steps = [];
  const visited = new Set();
  const stack = new Stack();

  stack.push(start);
  let found = false;

  while (!stack.isEmpty) {
    const current = stack.pop();
    if (visited.has(current.key)) continue;
    visited.add(current.key);
    current.visited = true;
    if (!current.isStart && !current.isEnd) visitedOrder.push(current);

    if (current === end) { found = true; break; }

    const neighbors = [];
    // Push in reverse so exploration feels natural (up, right, down, left)
    const raw = grid.getNeighbors(current);
    for (let i = raw.length - 1; i >= 0; i--) {
      const neighbor = raw[i];
      if (neighbor.isWall || visited.has(neighbor.key)) continue;
      if (!neighbor.previous && neighbor !== start) neighbor.previous = current;
      stack.push(neighbor);
      neighbors.push(neighbor);
    }

    if (educational) {
      steps.push({
        current,
        neighbors,
        structure: stack.toArray().map((c) => coordKey(c.row, c.col)),
        structureType: "Stack",
        note: `Popped (${current.row},${current.col}) from the stack top. Pushed unvisited neighbors — DFS dives deep before backtracking.`,
      });
    }
  }

  const path = reconstructPath(end, found);
  return buildResult(visitedOrder, path, steps, found);
}