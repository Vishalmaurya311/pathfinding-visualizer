import { Grid, WEIGHT_COST } from "./grid.js";
import { getAlgorithm } from "./algorithms/index.js";
import { Animator, SoundEngine, showToast } from "./animation.js";
import { MazeGenerator } from "./maze.js";
import { Settings } from "./settings.js";
import { Controls } from "./controls.js";
import { CellType } from "./cell.js";
import {
  SPEED_LABELS, estimateMemoryKB, debounce, announce, clamp,
} from "./utils.js";

/**
 * App — the orchestrator. Wires Grid + Algorithms + Animator + Maze
 * + Panels + Comparison + Educational into one cohesive application.
 */
class App {
  constructor() {
    this.settings = new Settings();
    this.sound = new SoundEngine();

    // Grids
    this.gridEl = document.getElementById("main-grid");
    this.compareEl = document.getElementById("compare-grid");
    this.grid = new Grid(this.gridEl, {
      onEdit: () => this.#onBoardEdit(),
      onSound: (n) => this.sound.play(n),
    });
    this.compareGrid = null; // built lazily in comparison mode

    // Animators (main + compare)
    this.animator = this.#makeAnimator("main");
    this.compareAnimator = null;

    this.maze = new MazeGenerator(this.grid);
    this.lastTrace = null;

    this.#init();
  }

  /* ================================================================== */
  /* INIT                                                               */
  /* ================================================================== */

  #init() {
    // Apply persisted theme/settings to the UI
    this.#applyTheme(this.settings.theme);
    document.documentElement.setAttribute("data-contrast", this.settings.contrast);
    this.#syncControlsToSettings();

    // Build the grid sized to viewport
    this.#buildGrid(this.settings.gridSize);

    // Wire controls
    this.controls = new Controls(this.#actions());

    // Panels
    this.#renderComplexity();
    this.#updateStats();

    // Responsive: refit on resize
    window.addEventListener("resize", debounce(() => this.#fitGrid(), 150));

    // Snapshot initial board for undo baseline
    this.#snapshot();

    announce("Pathfinding Visualizer ready.");
  }

  #makeAnimator(which) {
    return new Animator({
      onVisit: (n) => { if (which === "main") this.#setStat("stat-visited", n), this.#setStat("stat-explored", n); },
      onPath: (n) => { if (which === "main") this.#setStat("stat-path", Math.max(0, n - 1)); },
      onStep: (step, meta) => { if (which === "main") this.#renderEducational(step, meta); },
      onSound: (name) => this.sound.play(name),
      onComplete: (found) => this.#onComplete(found, which),
      playSpeed: () => this.settings.speed,
    });
  }

  /* ================================================================== */
  /* GRID BUILD / RESIZE                                                */
  /* ================================================================== */

  #buildGrid(size) {
    const cols = size;
    const rows = clamp(Math.round(size * 0.6), 10, 40);
    this.grid.build(rows, cols);
    if (this.settings.comparison && this.compareGrid) {
      this.compareGrid.build(rows, cols);
      this.#mirrorBoard();
    }
    this.#fitGrid();
    this.#updateStats();
  }

  #fitGrid() {
    const stageWidth = document.querySelector(".stage").clientWidth;
    const divisor = this.settings.comparison ? 2.2 : 1;
    const available = (stageWidth / divisor) - 20;
    this.grid.fitCellSize(available);
  }

  /* ================================================================== */
  /* ACTION MAP (passed to Controls)                                    */
  /* ================================================================== */

  #actions() {
    return {
      selectAlgorithm: (v) => { this.settings.set("algorithm", v); this.#renderComplexity(); this.#updateStats(); },
      selectMaze: (v) => { this.settings.maze = v; if (v !== "none") this.generateMaze(); },
      selectSpeed: (v) => { this.settings.set("speed", v); this.animator.setSpeed(v); this.#updateStats(); },
      selectTheme: (v) => { this.settings.set("theme", v); this.#applyTheme(v); },
      resizeGrid: debounce((v) => { this.settings.set("gridSize", v); this.#buildGrid(v); this.#snapshot(); }, 120),

      start: () => this.run(),
      pause: () => { this.animator.pause(); this.compareAnimator?.pause(); },
      resume: () => { this.animator.resume(); this.compareAnimator?.resume(); },
      stop: () => this.stopAll(),
      replay: () => this.replay(),
      nextStep: () => this.animator.nextStep(),

      clearPath: () => this.clearPath(),
      clearWalls: () => { this.#snapshot(); this.grid.clearWalls(); },
      reset: () => this.reset(),

      randomWeights: () => { this.#snapshot(); this.grid.randomWeights(); },
      randomStart: () => { this.#snapshot(); this.grid.randomStart(); },
      randomEnd: () => { this.#snapshot(); this.grid.randomEnd(); },

      generateMaze: () => this.generateMaze(),

      toggleSound: () => this.#toggleSound(),
      toggleEducational: () => this.#toggleEducational(),
      toggleCompare: () => this.#toggleCompare(),

      moveStart: (dr, dc) => this.#moveStart(dr, dc),
      undo: () => this.#undo(),
      redo: () => this.#redo(),
    };
  }

  /* ================================================================== */
  /* RUN ALGORITHM                                                      */
  /* ================================================================== */

  run() {
    if (this.animator.isRunning && this.animator.state === "playing") return;
    this.clearPath();

    const { run, info } = getAlgorithm(this.settings.algorithm);
    if (!run) return;

    this.grid.lock();
    this.controls.setRunning(true);
    this.sound.resetDrift();

    // Measure execution time of the pure computation
    const t0 = performance.now();
    const trace = run(this.grid, this.settings.educational);
    const t1 = performance.now();
    this.lastTrace = trace;

    this.#setStat("stat-time", `${(t1 - t0).toFixed(2)} ms`);
    this.#setStat("stat-memory", `${estimateMemoryKB(trace.stats.visited)} KB`);
    this.#setStat("stat-algo", info.name);

    // Comparison mode: run the second algorithm too
    if (this.settings.comparison) return this.#runComparison(trace);

    this.animator.play(trace, {
      speed: this.settings.speed,
      stepMode: this.settings.stepMode,
    });

    announce(`Running ${info.name}.`);
  }

  replay() {
    if (!this.lastTrace) { showToast("Nothing to replay yet.", "warning"); return; }
    this.clearPath();
    // Rebuild bookkeeping refs are stale after clearPath; re-run for correctness
    this.run();
  }

  stopAll() {
    this.animator.stop();
    this.compareAnimator?.stop();
    this.maze.stop();
    this.grid.unlock();
    this.controls.setRunning(false);
  }

  #onComplete(found, which) {
    if (which !== "main") return;
    this.grid.unlock();
    this.controls.setRunning(false);
    if (found) {
      showToast(`Path found! Length: ${this.lastTrace.stats.pathLength} · Cost: ${this.lastTrace.stats.pathCost}`, "success");
      announce("Path found.");
    } else {
      showToast("No path exists between start and end.", "error");
      announce("No path found.");
    }
  }

  /* ================================================================== */
  /* COMPARISON MODE                                                    */
  /* ================================================================== */

  #toggleCompare() {
    const on = !this.settings.comparison;
    this.settings.comparison = on;
    document.getElementById("btn-compare").setAttribute("aria-pressed", String(on));
    document.querySelector(".grid-container").classList.toggle("is-comparing", on);
    this.compareEl.classList.toggle("grid--hidden", !on);

    if (on) {
      // Build a mirror grid + a second animator
      this.compareGrid = new Grid(this.compareEl, { onEdit: () => {}, onSound: () => {} });
      this.compareGrid.build(this.grid.rows, this.grid.cols);
      this.compareGrid.lock(); // right grid is a read-only mirror
      this.compareAnimator = this.#makeAnimator("compare");
      this.#mirrorBoard();
      showToast("Comparison mode ON — pick a second algorithm in the prompt.", "info");
    } else {
      this.compareAnimator?.stop();
      this.compareGrid = null;
      this.compareAnimator = null;
    }
    this.#fitGrid();
  }

  /** Copy walls/weights/start/end from main → compare grid. */
  #mirrorBoard() {
    if (!this.compareGrid) return;
    this.compareGrid.forEach((cell) => {
      const src = this.grid.getCell(cell.row, cell.col);
      cell.clearVisuals(); cell.resetPathData();
      cell.setType(src.type, src.weight);
      if (src.isStart) this.compareGrid.start = cell;
      if (src.isEnd) this.compareGrid.end = cell;
    });
  }

  #runComparison(mainTrace) {
    // Ask which algorithm to compare against
    const second = prompt(
      "Compare against which algorithm?\n" +
      "bfs · dfs · dijkstra · astar · greedy · bellmanFord",
      this.settings.algorithm === "astar" ? "dijkstra" : "astar"
    );
    const { run, info } = getAlgorithm(second) || {};
    if (!run) { showToast("Unknown algorithm — comparison cancelled.", "error"); this.stopAll(); return; }

    this.#mirrorBoard();
    const t0 = performance.now();
    const compareTrace = run(this.compareGrid, false);
    const t1 = performance.now();

    // Play both simultaneously
    this.animator.play(mainTrace, { speed: this.settings.speed });
    this.compareAnimator.play(compareTrace, { speed: this.settings.speed });

    // Announce a winner once both finish (simple heuristic: shorter path, then fewer visited)
    const mainName = getAlgorithm(this.settings.algorithm).info.name;
    setTimeout(() => {
      const winner = this.#judge(mainTrace, compareTrace, mainName, info.name, (t1 - t0));
      showToast(winner, "success", 5000);
    }, 300);
  }

  #judge(a, b, aName, bName) {
    const score = (t) => (t.found ? 0 : 1e9) + t.stats.pathCost * 1000 + t.stats.visited;
    const sa = score(a), sb = score(b);
    if (sa === sb) return `Tie: ${aName} vs ${bName}`;
    const win = sa < sb ? aName : bName;
    return `🏆 Winner: ${win} — fewer visited / shorter path`;
  }

  /* ================================================================== */
  /* MAZE                                                               */
  /* ================================================================== */

  async generateMaze() {
    const key = this.settings.maze === "none" ? "recursiveBacktracking" : this.settings.maze;
    this.#snapshot();
    this.grid.lock();
    this.controls.setRunning(true);
    await this.maze.generate(key, { speed: this.settings.speed, onSound: (n) => this.sound.play(n) });
    this.grid.unlock();
    this.controls.setRunning(false);
    this.#updateStats();
    if (this.settings.comparison) this.#mirrorBoard();
    showToast("Maze generated.", "success");
  }

  /* ================================================================== */
  /* BOARD OPS                                                          */
  /* ================================================================== */

  clearPath() {
    this.grid.clearPath();
    if (this.compareGrid) this.compareGrid.clearPath();
    this.#setStat("stat-visited", 0);
    this.#setStat("stat-explored", 0);
    this.#setStat("stat-path", 0);
  }

  reset() {
    this.stopAll();
    this.grid.reset();
    if (this.compareGrid) this.#mirrorBoard();
    this.lastTrace = null;
    this.settings.clearHistory();
    this.#snapshot();
    this.#updateStats();
    announce("Board reset.");
  }

  #moveStart(dr, dc) {
    const s = this.grid.start;
    const next = this.grid.getCell(s.row + dr, s.col + dc);
    if (next && !next.isWall && !next.isEnd) {
      this.#snapshot();
      this.grid.setStart(next);
      if (this.compareGrid) this.#mirrorBoard();
    }
  }

  #onBoardEdit() { this.#updateStats(); }

  /* ================================================================== */
  /* UNDO / REDO                                                        */
  /* ================================================================== */

  /** Compact board snapshot: type char per cell + start/end coords. */
  #serialize() {
    const chars = { empty: "0", wall: "1", weight: "2", start: "3", end: "4", checkpoint: "5" };
    let s = `${this.grid.rows},${this.grid.cols};`;
    this.grid.forEach((c) => { s += chars[c.type] ?? "0"; });
    return s;
  }
  #snapshot() { this.settings.pushHistory(this.#serialize()); }

  #restore(snapshot) {
    if (!snapshot) return;
    const [dims, body] = snapshot.split(";");
    const [rows, cols] = dims.split(",").map(Number);
    if (rows !== this.grid.rows || cols !== this.grid.cols) this.grid.build(rows, cols);

    const types = ["empty", "wall", "weight", "start", "end", "checkpoint"];
    let i = 0;
    this.grid.forEach((c) => {
      const t = types[+body[i++]] ?? "empty";
      c.clearVisuals(); c.resetPathData();
      c.setType(CellType[t.toUpperCase()], t === "weight" ? WEIGHT_COST : 1);
      if (t === "start") this.grid.start = c;
      if (t === "end") this.grid.end = c;
    });
    if (this.compareGrid) this.#mirrorBoard();
    this.#updateStats();
  }

  #undo() {
    const snap = this.settings.undo(this.#serialize());
    if (snap == null) { showToast("Nothing to undo.", "warning"); return; }
    this.#restore(snap);
    announce("Undo.");
  }
  #redo() {
    const snap = this.settings.redo(this.#serialize());
    if (snap == null) { showToast("Nothing to redo.", "warning"); return; }
    this.#restore(snap);
    announce("Redo.");
  }

  /* ================================================================== */
  /* TOGGLES                                                            */
  /* ================================================================== */

  #toggleSound() {
    const on = this.sound.toggle(!this.settings.soundOn);
    this.settings.set("soundOn", on);
    const btn = document.getElementById("sound-toggle");
    btn.setAttribute("aria-pressed", String(on));
    btn.querySelector("i").className = on ? "fa-solid fa-volume-high" : "fa-solid fa-volume-xmark";
    if (on) this.sound.play("click");
  }

  #toggleEducational() {
    const on = !this.settings.educational;
    this.settings.educational = on;
    this.settings.stepMode = on; // educational implies step-friendly pacing
    document.getElementById("btn-educational").setAttribute("aria-pressed", String(on));
    document.getElementById("edu-ds").hidden = !on;
    showToast(on ? "Educational mode ON — press N to step." : "Educational mode OFF.", "info");
  }

  /* ================================================================== */
  /* PANELS                                                             */
  /* ================================================================== */

  #renderEducational(step, meta) {
    if (!this.settings.educational || !step) return;
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set("edu-current", `(${step.current.row}, ${step.current.col})`);
    set("edu-neighbors", step.neighbors.map((n) => `(${n.row},${n.col})`).join("  ") || "none");
    set("edu-structure", `${step.structureType}\n[${step.structure.slice(0, 30).join(", ")}]`);
    set("edu-explain", `Step ${meta.index + 1}/${meta.total} · ${step.note}`);
  }

  #renderComplexity() {
    const { info } = getAlgorithm(this.settings.algorithm);
    const el = document.getElementById("complexity-content");
    const list = (arr) => arr.map((x) => `<li>${x}</li>`).join("");
    el.innerHTML = `
      <h4>${info.name}</h4>
      <p>Data structure: <span class="badge">${info.dataStructure}</span></p>
      <h4>Time Complexity</h4>
      <p>Best <span class="badge">${info.time.best}</span> ·
         Avg <span class="badge">${info.time.average}</span> ·
         Worst <span class="badge">${info.time.worst}</span></p>
      <h4>Space Complexity</h4>
      <p><span class="badge">${info.space}</span></p>
      <h4>Guarantees Shortest Path</h4>
      <p>${info.guarantees ? "✅ Yes" : "❌ No"} · ${info.weighted ? "Weighted" : "Unweighted"}</p>
      <h4>Advantages</h4><ul>${list(info.advantages)}</ul>
      <h4>Disadvantages</h4><ul>${list(info.disadvantages)}</ul>
      <h4>Applications</h4><ul>${list(info.applications)}</ul>
      <h4>Pseudocode</h4><pre>${info.pseudocode}</pre>
    `;
  }

  #setStat(id, value) { const el = document.getElementById(id); if (el) el.textContent = value; }

  #updateStats() {
    const { info } = getAlgorithm(this.settings.algorithm);
    this.#setStat("stat-algo", info.name);
    this.#setStat("stat-walls", this.grid.countWalls());
    this.#setStat("stat-weights", this.grid.countWeights());
    this.#setStat("stat-grid", `${this.grid.rows} × ${this.grid.cols}`);
    this.#setStat("stat-speed", SPEED_LABELS[this.settings.speed]);
  }

  /* ================================================================== */
  /* THEME + SYNC                                                       */
  /* ================================================================== */

  #applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
  }

  #syncControlsToSettings() {
    const s = this.settings;
    const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
    setVal("algorithm-select", s.algorithm);
    setVal("speed-select", s.speed);
    setVal("theme-select", s.theme);
    setVal("size-range", s.gridSize);
    if (s.soundOn) this.#toggleSound();
  }
}

/* Boot the app once the DOM is ready. */
window.addEventListener("DOMContentLoaded", () => { window.__pfv = new App(); });