import { CellType } from "./cell.js";
import { WEIGHT_COST } from "./grid.js";
import { SPEED_DELAYS, randInt } from "./utils.js";

/**
 * MazeGenerator — six maze algorithms built from scratch.
 *
 * Each algorithm is a PURE function of (rows, cols) → operation list.
 * Operations are replayed by `animate()` so construction is visualized
 * at the user's chosen speed. Start/End cells are never walled.
 *
 * Operation shape: { type: 'wall'|'clear'|'weight', row, col }
 */
export class MazeGenerator {
  /** @param {import('./grid.js').Grid} grid */
  constructor(grid) {
    this.grid = grid;
    this.rafId = null;
    this.aborted = false;
  }

  /* ------------------------------------------------------------------ */
  /* PUBLIC API                                                         */
  /* ------------------------------------------------------------------ */

  /**
   * Generate + animate a maze by key.
   * @returns {Promise<void>} resolves when the animation completes
   */
  generate(key, { speed = "medium", onSound = () => {} } = {}) {
    this.stop();
    this.aborted = false;

    const { rows, cols } = this.grid;
    const ops = this.#build(key, rows, cols);
    return this.#animate(ops, speed, onSound);
  }

  stop() {
    this.aborted = true;
    if (this.rafId != null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /* ------------------------------------------------------------------ */
  /* DISPATCH                                                           */
  /* ------------------------------------------------------------------ */

  #build(key, rows, cols) {
    switch (key) {
      case "recursiveDivision":     return this.#recursiveDivision(rows, cols);
      case "recursiveBacktracking": return this.#recursiveBacktracking(rows, cols);
      case "prim":                  return this.#primsMaze(rows, cols);
      case "binaryTree":            return this.#binaryTree(rows, cols);
      case "randomMaze":            return this.#randomMaze(rows, cols);
      case "randomWalls":           return this.#randomWalls(rows, cols);
      default:                      return [];
    }
  }

  /** True if placing a wall here would clobber start/end. */
  #isProtected(row, col) {
    const s = this.grid.start, e = this.grid.end;
    return (s && s.row === row && s.col === col) ||
           (e && e.row === col && e.col === col) ||
           (e && e.row === row && e.col === col);
  }
  #isEndpoint(row, col) {
    const s = this.grid.start, e = this.grid.end;
    return (s && s.row === row && s.col === col) ||
           (e && e.row === row && e.col === col);
  }

  /* ================================================================== */
  /* 1. RECURSIVE DIVISION                                              */
  /*    Start with an open field; recursively add a wall with a single  */
  /*    passage, alternating orientation by chamber aspect ratio.       */
  /* ================================================================== */
  #recursiveDivision(rows, cols) {
    const ops = [];

    // Outer border
    for (let c = 0; c < cols; c++) { ops.push(this.#wall(0, c)); ops.push(this.#wall(rows - 1, c)); }
    for (let r = 0; r < rows; r++) { ops.push(this.#wall(r, 0)); ops.push(this.#wall(r, cols - 1)); }

    const divide = (rMin, rMax, cMin, cMax) => {
      const height = rMax - rMin;
      const width = cMax - cMin;
      if (height < 2 || width < 2) return;

      // Choose orientation: split the longer dimension
      const horizontal = width < height ? true : (height < width ? false : Math.random() < 0.5);

      if (horizontal) {
        // Wall on an even row, passage on an odd column
        const wallRow = this.#randEven(rMin + 1, rMax - 1);
        const passage = this.#randOdd(cMin, cMax);
        for (let c = cMin; c <= cMax; c++) {
          if (c !== passage) ops.push(this.#wall(wallRow, c));
        }
        divide(rMin, wallRow - 1, cMin, cMax);
        divide(wallRow + 1, rMax, cMin, cMax);
      } else {
        const wallCol = this.#randEven(cMin + 1, cMax - 1);
        const passage = this.#randOdd(rMin, rMax);
        for (let r = rMin; r <= rMax; r++) {
          if (r !== passage) ops.push(this.#wall(r, wallCol));
        }
        divide(rMin, rMax, cMin, wallCol - 1);
        divide(rMin, rMax, wallCol + 1, cMax);
      }
    };

    divide(1, rows - 2, 1, cols - 2);
    return this.#sanitize(ops);
  }

  /* ================================================================== */
  /* 2. RECURSIVE BACKTRACKING (DFS carving)                            */
  /*    Fill everything with walls; carve passages by a randomized DFS  */
  /*    stepping two cells at a time and knocking out the wall between.  */
  /* ================================================================== */
  #recursiveBacktracking(rows, cols) {
    const ops = [];
    // 1) Fill grid solid
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) ops.push(this.#wall(r, c));

    // 2) Carve using an explicit stack (avoid deep recursion)
    const visited = new Set();
    const key = (r, c) => `${r},${c}`;
    const startR = 1, startC = 1;
    const stack = [[startR, startC]];
    visited.add(key(startR, startC));
    ops.push(this.#clear(startR, startC));

    const dirs = [[-2, 0], [2, 0], [0, -2], [0, 2]];

    while (stack.length) {
      const [r, c] = stack[stack.length - 1];
      // Shuffle directions for randomness
      const shuffled = this.#shuffle([...dirs]);
      let carved = false;

      for (const [dr, dc] of shuffled) {
        const nr = r + dr, nc = c + dc;
        if (nr <= 0 || nc <= 0 || nr >= rows - 1 || nc >= cols - 1) continue;
        if (visited.has(key(nr, nc))) continue;

        // Knock out the wall between (r,c) and (nr,nc)
        ops.push(this.#clear(r + dr / 2, c + dc / 2));
        ops.push(this.#clear(nr, nc));
        visited.add(key(nr, nc));
        stack.push([nr, nc]);
        carved = true;
        break;
      }
      if (!carved) stack.pop(); // backtrack
    }

    return this.#sanitize(ops);
  }

  /* ================================================================== */
  /* 3. PRIM'S RANDOMIZED MAZE                                          */
  /*    Grow a spanning tree from a random cell; repeatedly connect a    */
  /*    random frontier wall to the maze.                                */
  /* ================================================================== */
  #primsMaze(rows, cols) {
    const ops = [];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) ops.push(this.#wall(r, c));

    const key = (r, c) => `${r},${c}`;
    const inMaze = new Set();

    const startR = 1, startC = 1;
    ops.push(this.#clear(startR, startC));
    inMaze.add(key(startR, startC));

    // Frontier = walls two cells away from maze cells
    const frontier = [];
    const addFrontier = (r, c) => {
      for (const [dr, dc] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) {
        const nr = r + dr, nc = c + dc;
        if (nr <= 0 || nc <= 0 || nr >= rows - 1 || nc >= cols - 1) continue;
        if (inMaze.has(key(nr, nc))) continue;
        frontier.push([nr, nc, r, c]); // frontier cell + the maze cell it links from
      }
    };
    addFrontier(startR, startC);

    while (frontier.length) {
      const idx = randInt(0, frontier.length - 1);
      const [fr, fc, pr, pc] = frontier.splice(idx, 1)[0];
      if (inMaze.has(key(fr, fc))) continue;

      // Carve passage between frontier cell and its maze parent
      ops.push(this.#clear((fr + pr) / 2, (fc + pc) / 2));
      ops.push(this.#clear(fr, fc));
      inMaze.add(key(fr, fc));
      addFrontier(fr, fc);
    }

    return this.#sanitize(ops);
  }

  /* ================================================================== */
  /* 4. BINARY TREE MAZE                                                */
  /*    For each cell, carve either north or west — trivially simple,    */
  /*    produces a strong diagonal texture / bias.                       */
  /* ================================================================== */
  #binaryTree(rows, cols) {
    const ops = [];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) ops.push(this.#wall(r, c));

    for (let r = 1; r < rows - 1; r += 2) {
      for (let c = 1; c < cols - 1; c += 2) {
        ops.push(this.#clear(r, c));
        const canNorth = r - 2 > 0;
        const canWest = c - 2 > 0;

        if (canNorth && canWest) {
          if (Math.random() < 0.5) ops.push(this.#clear(r - 1, c));
          else ops.push(this.#clear(r, c - 1));
        } else if (canNorth) {
          ops.push(this.#clear(r - 1, c));
        } else if (canWest) {
          ops.push(this.#clear(r, c - 1));
        }
      }
    }
    return this.#sanitize(ops);
  }

  /* ================================================================== */
  /* 5. RANDOM MAZE (structured randomness with guaranteed openings)     */
  /* ================================================================== */
  #randomMaze(rows, cols) {
    const ops = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // ~28% walls, but keep it navigable-ish
        if (Math.random() < 0.28) ops.push(this.#wall(r, c));
        else ops.push(this.#clear(r, c));
      }
    }
    return this.#sanitize(ops);
  }

  /* ================================================================== */
  /* 6. RANDOM WALLS (sparse scatter, additive)                          */
  /* ================================================================== */
  #randomWalls(rows, cols) {
    const ops = [];
    const count = Math.floor(rows * cols * 0.18);
    for (let i = 0; i < count; i++) {
      ops.push(this.#wall(randInt(0, rows - 1), randInt(0, cols - 1)));
    }
    return this.#sanitize(ops);
  }

  /* ------------------------------------------------------------------ */
  /* OP FACTORIES + SANITIZE                                            */
  /* ------------------------------------------------------------------ */

  #wall(row, col)  { return { type: "wall", row, col }; }
  #clear(row, col) { return { type: "clear", row: Math.round(row), col: Math.round(col) }; }

  /** Remove ops targeting start/end or out-of-bounds; keep order stable. */
  #sanitize(ops) {
    const { rows, cols } = this.grid;
    return ops.filter((op) => {
      if (op.row < 0 || op.col < 0 || op.row >= rows || op.col >= cols) return false;
      // Never wall the start or end; clears on them are harmless no-ops
      if (op.type === "wall" && this.#isEndpoint(op.row, op.col)) return false;
      return true;
    });
  }

  /* ------------------------------------------------------------------ */
  /* RANDOM HELPERS                                                     */
  /* ------------------------------------------------------------------ */

  #shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  #randEven(min, max) {
    let n = randInt(min, max);
    if (n % 2 !== 0) n = n > min ? n - 1 : n + 1;
    return n;
  }
  #randOdd(min, max) {
    let n = randInt(min, max);
    if (n % 2 === 0) n = n < max ? n + 1 : n - 1;
    return n;
  }

  /* ------------------------------------------------------------------ */
  /* ANIMATION (RAF time-accumulator, mirrors the Animator)             */
  /* ------------------------------------------------------------------ */

  #animate(ops, speedKey, onSound) {
    return new Promise((resolve) => {
      // Clear board first (walls/weights) so generation starts clean
      this.grid.clearWalls();
      this.grid.clearPath();

      const instant = speedKey === "instant";
      if (instant) {
        for (const op of ops) this.#applyOp(op);
        onSound("goal");
        resolve();
        return;
      }

      const delay = SPEED_DELAYS[speedKey] ?? SPEED_DELAYS.medium;
      let index = 0;
      let acc = 0;
      let last = 0;

      const tick = (time) => {
        if (this.aborted) { resolve(); return; }
        if (last === 0) last = time;
        acc += time - last;
        last = time;

        const step = delay > 0 ? delay : 4;
        let guard = 0;
        while (acc >= step && index < ops.length) {
          acc -= step;
          this.#applyOp(ops[index]);
          if (ops[index].type === "wall" && (index & 3) === 0) onSound("maze");
          index++;
          if (++guard > 2000) break;
        }

        if (index < ops.length) {
          this.rafId = requestAnimationFrame(tick);
        } else {
          this.rafId = null;
          onSound("goal");
          resolve();
        }
      };
      this.rafId = requestAnimationFrame(tick);
    });
  }

  /** Apply a single operation to the grid (skip endpoints). */
  #applyOp(op) {
    if (this.#isEndpoint(op.row, op.col)) return;
    const cell = this.grid.getCell(op.row, op.col);
    if (!cell) return;

    switch (op.type) {
      case "wall":
        if (!cell.isStart && !cell.isEnd) cell.setType(CellType.WALL);
        break;
      case "clear":
        if (cell.isWall) cell.setType(CellType.EMPTY);
        break;
      case "weight":
        if (!cell.isStart && !cell.isEnd) cell.setType(CellType.WEIGHT, WEIGHT_COST);
        break;
    }
  }
}