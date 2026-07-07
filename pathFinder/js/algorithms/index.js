import { bfs } from "./bfs.js";
import { dfs } from "./dfs.js";
import { dijkstra } from "./dijkstra.js";
import { astar } from "./astar.js";
import { greedy } from "./greedy.js";
import { bellmanFord } from "./bellmanFord.js";

/** Maps the <select> value → algorithm function. */
export const ALGORITHMS = Object.freeze({
  bfs,
  dfs,
  dijkstra,
  astar,
  greedy,
  bellmanFord,
});

/**
 * Complexity & educational metadata for the Complexity Panel.
 * V = vertices (cells), E = edges (~4V on a 4-dir grid).
 */
export const ALGO_INFO = Object.freeze({
  bfs: {
    name: "Breadth First Search",
    weighted: false,
    guarantees: true,
    time: { best: "O(V + E)", average: "O(V + E)", worst: "O(V + E)" },
    space: "O(V)",
    dataStructure: "Queue (FIFO)",
    advantages: [
      "Guarantees the shortest path in unweighted graphs",
      "Simple and predictable, explores in expanding rings",
    ],
    disadvantages: [
      "Ignores edge weights (not for weighted graphs)",
      "Can explore many nodes with no goal bias",
    ],
    applications: [
      "Shortest path in unweighted networks",
      "Web crawling, peer-to-peer discovery, GPS on uniform grids",
      "Social network 'degrees of separation'",
    ],
    pseudocode: `queue ← [start]
mark start visited
while queue not empty:
  node ← queue.dequeue()
  if node == goal: return path
  for each neighbor of node:
    if not visited and not wall:
      mark visited; neighbor.prev ← node
      queue.enqueue(neighbor)`,
  },

  dfs: {
    name: "Depth First Search",
    weighted: false,
    guarantees: false,
    time: { best: "O(V + E)", average: "O(V + E)", worst: "O(V + E)" },
    space: "O(V)",
    dataStructure: "Stack (LIFO)",
    advantages: [
      "Low memory on deep, narrow graphs",
      "Great for maze generation & connectivity checks",
    ],
    disadvantages: [
      "Does NOT guarantee the shortest path",
      "Can wander far from the goal",
    ],
    applications: [
      "Maze generation, topological sorting",
      "Cycle detection, connected components",
      "Backtracking solvers (Sudoku, N-Queens)",
    ],
    pseudocode: `stack ← [start]
while stack not empty:
  node ← stack.pop()
  if visited: continue
  mark visited
  if node == goal: return path
  for each neighbor (reversed):
    if not visited and not wall:
      neighbor.prev ← node
      stack.push(neighbor)`,
  },

  dijkstra: {
    name: "Dijkstra's Algorithm",
    weighted: true,
    guarantees: true,
    time: { best: "O(E + V log V)", average: "O(E + V log V)", worst: "O(E + V log V)" },
    space: "O(V)",
    dataStructure: "Min Priority Queue (Binary Heap)",
    advantages: [
      "Optimal shortest path for non-negative weights",
      "Foundational, well-understood, widely used",
    ],
    disadvantages: [
      "Cannot handle negative edge weights",
      "Explores uniformly — no goal heuristic",
    ],
    applications: [
      "GPS & road navigation, network routing (OSPF)",
      "Flight/transit pricing, robotics path planning",
    ],
    pseudocode: `dist[start] ← 0; pq ← {(start, 0)}
while pq not empty:
  u ← pq.extractMin()
  if u finalized: continue
  finalize u
  for each neighbor v of u:
    alt ← dist[u] + weight(v)
    if alt < dist[v]:
      dist[v] ← alt; v.prev ← u
      pq.insert(v, alt)`,
  },

  astar: {
    name: "A* Search",
    weighted: true,
    guarantees: true,
    time: { best: "O(E)", average: "O(E)", worst: "O(E + V log V)" },
    space: "O(V)",
    dataStructure: "Open Set (Priority Queue) + Closed Set",
    advantages: [
      "Optimal with an admissible heuristic",
      "Usually far fewer nodes explored than Dijkstra (goal-directed)",
    ],
    disadvantages: [
      "Heuristic quality drives performance",
      "Higher per-node overhead (g, h, f bookkeeping)",
    ],
    applications: [
      "Game AI pathfinding, robotics motion planning",
      "Map routing where a distance heuristic exists",
    ],
    pseudocode: `g[start] ← 0; f[start] ← h(start)
open ← {(start, f[start])}
while open not empty:
  u ← open.extractMin()   // lowest f
  if u == goal: return path
  add u to closed
  for each neighbor v:
    tentativeG ← g[u] + weight(v)
    if tentativeG < g[v]:
      v.prev ← u; g[v] ← tentativeG
      f[v] ← g[v] + h(v)
      open.insert(v, f[v])`,
  },

  greedy: {
    name: "Greedy Best-First Search",
    weighted: false,
    guarantees: false,
    time: { best: "O(E)", average: "O(E)", worst: "O(E + V log V)" },
    space: "O(V)",
    dataStructure: "Priority Queue (heuristic only)",
    advantages: [
      "Very fast — heads straight for the goal",
      "Explores few nodes when the heuristic is good",
    ],
    disadvantages: [
      "NOT optimal — can produce longer paths",
      "Easily fooled by walls/obstacles (local traps)",
    ],
    applications: [
      "Quick approximate routing where speed > optimality",
      "Heuristic-guided search prototypes",
    ],
    pseudocode: `pq ← {(start, h(start))}
while pq not empty:
  u ← pq.extractMin()   // lowest h ONLY
  if u == goal: return path
  for each neighbor v:
    if not visited and not wall:
      v.prev ← u
      pq.insert(v, h(v))`,
  },

  bellmanFord: {
    name: "Bellman-Ford",
    weighted: true,
    guarantees: true,
    time: { best: "O(V·E)", average: "O(V·E)", worst: "O(V·E)" },
    space: "O(V)",
    dataStructure: "Distance Map + Edge Relaxation",
    advantages: [
      "Handles negative edge weights",
      "Detects negative-weight cycles",
    ],
    disadvantages: [
      "Slower than Dijkstra — O(V·E)",
      "Relaxes every edge repeatedly",
    ],
    applications: [
      "Currency arbitrage detection",
      "Distance-vector routing (RIP protocol)",
      "Graphs where negative weights are possible",
    ],
    pseudocode: `dist[start] ← 0
repeat |V| - 1 times:
  for each edge (u, v):
    if dist[u] + w(u,v) < dist[v]:
      dist[v] ← dist[u] + w(u,v)
      v.prev ← u
// optional pass detects negative cycles`,
  },
});

/** Convenience: get the runner + info for a key. */
export function getAlgorithm(key) {
  return { run: ALGORITHMS[key], info: ALGO_INFO[key] };
}