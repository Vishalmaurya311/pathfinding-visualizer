import { Cell, CellType } from "./cell.js";
import { clamp, coordKey, randInt, announce } from "./utils.js";

// /** Cost applied to weight tiles (Dijkstra/A*/Bellman-Ford). */
export const WEIGHT_COST = 15;

/**
 * Grid — owns the matrix of Cells, DOM rendering, and all
 * mouse/touch interaction (draw walls, drag start/end, weights).
 * Emits nothing directly; exposes callbacks the app can subscribe to.
 */
export class Grid {
  /**
   * @param {HTMLElement} container - the .grid element
   * @param {object} [opts]
   */
  constructor(container, opts = {}) {
    this.container = container;
    this.rows = 0;
    this.cols = 0;
    this.cells = [];            // 2D array of Cell
    this.cellMap = new Map();   // key -> Cell (fast lookup)

    this.start = null;          // Cell
    this.end = null;            // Cell

    // Interaction state
    this.isMouseDown = false;
    this.dragTarget = null;     // 'start' | 'end' | null
    this.drawMode = null;       // 'add' | 'remove' — decided on first press
    this.brush = "wall";        // 'wall' | 'weight'
    this.locked = false;        // disable editing during animation

    // Callbacks (assigned by app.js)
    this.onEdit = opts.onEdit || (() => {});   // fired when board changes
    this.onSound = opts.onSound || (() => {});  // (soundName) => void

    this.#bindEvents();
  }

  /* ------------------------------------------------------------------ */
  /* BUILD / RESIZE                                                     */
  /* ------------------------------------------------------------------ */

  /** Create a fresh rows×cols grid and render to the DOM. */
  build(rows, cols) {
    this.rows = rows;
    this.cols = cols;
    this.cells = [];
    this.cellMap.clear();

    const frag = document.createDocumentFragment();
    this.container.style.gridTemplateColumns = `repeat(${cols}, var(--cell-size))`;
    this.container.setAttribute("aria-rowcount", rows);
    this.container.setAttribute("aria-colcount", cols);

    for (let r = 0; r < rows; r++) {
      const rowArr = [];
      for (let c = 0; c < cols; c++) {
        const cell = new Cell(r, c);
        const el = cell.createElement();
        frag.appendChild(el);
        rowArr.push(cell);
        this.cellMap.set(cell.key, cell);
      }
      this.cells.push(rowArr);
    }

    this.container.innerHTML = "";
    this.container.appendChild(frag);

    this.#placeDefaultEndpoints();
  }

  /** Position start (~25%) and end (~75%) on the middle row. */
  #placeDefaultEndpoints() {
    const midRow = Math.floor(this.rows / 2);
    const startCol = Math.floor(this.cols * 0.2);
    const endCol = Math.floor(this.cols * 0.8);

    this.start = this.getCell(midRow, startCol);
    this.end = this.getCell(midRow, endCol);
    this.start.setType(CellType.START);
    this.end.setType(CellType.END);
  }

  /* ------------------------------------------------------------------ */
  /* ACCESS                                                             */
  /* ------------------------------------------------------------------ */

  getCell(row, col) {
    if (row < 0 || col < 0 || row >= this.rows || col >= this.cols) return null;
    return this.cells[row][col];
  }
  getCellByKey(key) { return this.cellMap.get(key) ?? null; }

  /** 4-directional neighbors (used by all algorithms). */
  getNeighbors(cell, { diagonal = false } = {}) {
    const deltas = diagonal
      ? [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]]
      : [[-1,0],[1,0],[0,-1],[0,1]];
    const out = [];
    for (const [dr, dc] of deltas) {
      const n = this.getCell(cell.row + dr, cell.col + dc);
      if (n) out.push(n);
    }
    return out;
  }

  forEach(fn) {
    for (let r = 0; r < this.rows; r++)
      for (let c = 0; c < this.cols; c++) fn(this.cells[r][c]);
  }

  /* ------------------------------------------------------------------ */
  /* MUTATION HELPERS                                                   */
  /* ------------------------------------------------------------------ */

  setStart(cell) {
    if (!cell || cell.isEnd || cell.isWall) return;
    if (this.start) this.start.setType(CellType.EMPTY);
    this.start = cell;
    cell.setType(CellType.START);
  }
  setEnd(cell) {
    if (!cell || cell.isStart || cell.isWall) return;
    if (this.end) this.end.setType(CellType.EMPTY);
    this.end = cell;
    cell.setType(CellType.END);
  }

  /** Clear only algorithm visuals (visited/path/current). */
  clearPath() {
    this.forEach((cell) => { cell.clearVisuals(); cell.resetPathData(); });
  }

  /** Remove all walls and weights (keep start/end). */
  clearWalls() {
    this.forEach((cell) => {
      if (cell.isWall || cell.isWeight) cell.setType(CellType.EMPTY);
    });
    this.onEdit();
  }

  /** Full board reset: clears everything, re-seeds endpoints. */
  reset() {
    this.forEach((cell) => {
      cell.clearVisuals();
      cell.resetPathData();
      if (!cell.isStart && !cell.isEnd) cell.setType(CellType.EMPTY);
    });
    this.forEach((cell) => cell.setType(CellType.EMPTY));
    this.#placeDefaultEndpoints();
    this.onEdit();
  }

  /* ------------------------------------------------------------------ */
  /* STATS HELPERS                                                      */
  /* ------------------------------------------------------------------ */

  countWalls() {
    let n = 0; this.forEach((c) => { if (c.isWall) n++; }); return n;
  }
  countWeights() {
    let n = 0; this.forEach((c) => { if (c.isWeight) n++; }); return n;
  }

  /* ------------------------------------------------------------------ */
  /* RANDOM PLACEMENT                                                   */
  /* ------------------------------------------------------------------ */

  randomStart() {
    const cell = this.#randomEmptyCell();
    if (cell) { this.setStart(cell); this.onEdit(); }
  }
  randomEnd() {
    const cell = this.#randomEmptyCell();
    if (cell) { this.setEnd(cell); this.onEdit(); }
  }
  randomWeights(density = 0.08) {
    this.forEach((cell) => {
      if (cell.type === CellType.EMPTY && Math.random() < density)
        cell.setType(CellType.WEIGHT, WEIGHT_COST);
    });
    this.onEdit();
  }
  #randomEmptyCell() {
    for (let i = 0; i < 500; i++) {
      const cell = this.getCell(randInt(0, this.rows - 1), randInt(0, this.cols - 1));
      if (cell && cell.type === CellType.EMPTY) return cell;
    }
    return null;
  }

  /* ------------------------------------------------------------------ */
  /* INTERACTION (event delegation)                                     */
  /* ------------------------------------------------------------------ */

  setBrush(brush) { this.brush = brush; }
  lock()   { this.locked = true; }
  unlock() { this.locked = false; }

  #bindEvents() {
    const c = this.container;
    // Mouse
    c.addEventListener("mousedown", (e) => this.#onPressStart(e));
    c.addEventListener("mouseover", (e) => this.#onPressMove(e));
    window.addEventListener("mouseup", () => this.#onPressEnd());

    // Touch
    c.addEventListener("touchstart", (e) => this.#onTouchStart(e), { passive: false });
    c.addEventListener("touchmove",  (e) => this.#onTouchMove(e),  { passive: false });
    window.addEventListener("touchend", () => this.#onPressEnd());

    // Prevent native image drag on cells
    c.addEventListener("dragstart", (e) => e.preventDefault());
  }

  #cellFromEvent(target) {
    const el = target.closest?.(".cell");
    if (!el) return null;
    return this.getCell(+el.dataset.row, +el.dataset.col);
  }
  #cellFromPoint(x, y) {
    const el = document.elementFromPoint(x, y);
    return el ? this.#cellFromEvent(el) : null;
  }

  #onPressStart(e) {
    if (this.locked) return;
    const cell = this.#cellFromEvent(e.target);
    if (!cell) return;
    this.isMouseDown = true;

    if (cell.isStart)      { this.dragTarget = "start"; return; }
    if (cell.isEnd)        { this.dragTarget = "end";   return; }
    if (cell.isCheckpoint) { this.dragTarget = "checkpoint"; this._dragCell = cell; return; }

    // Decide draw mode based on the first cell hit
    this.#applyBrush(cell, /*first*/ true);
  }

  #onPressMove(e) {
    if (!this.isMouseDown || this.locked) return;
    const cell = this.#cellFromEvent(e.target);
    if (!cell) return;
    this.#continueInteraction(cell);
  }

  #continueInteraction(cell) {
    if (this.dragTarget === "start") {
      if (!cell.isEnd && !cell.isWall) this.setStart(cell);
      return;
    }
    if (this.dragTarget === "end") {
      if (!cell.isStart && !cell.isWall) this.setEnd(cell);
      return;
    }
    this.#applyBrush(cell, /*first*/ false);
  }

  /** Toggle wall/weight, honoring the initial draw mode. */
  #applyBrush(cell, first) {
    if (cell.isStart || cell.isEnd) return;

    if (first) {
      // First press decides: if a wall/weight is here → erase mode; else → add
      const occupied = cell.isWall || cell.isWeight;
      this.drawMode = occupied ? "remove" : "add";
    }

    if (this.drawMode === "add") {
      if (this.brush === "weight") {
        if (!cell.isWeight) { cell.setType(CellType.WEIGHT, WEIGHT_COST); this.onSound("wall"); }
      } else {
        if (!cell.isWall) { cell.setType(CellType.WALL); this.onSound("wall"); }
      }
    } else {
      if (cell.isWall || cell.isWeight) cell.setType(CellType.EMPTY);
    }
    this.onEdit();
  }

  #onPressEnd() {
    if (!this.isMouseDown) return;
    this.isMouseDown = false;
    this.dragTarget = null;
    this.drawMode = null;
    this._dragCell = null;
  }

  // ---- Touch bridges to the same logic ----
  #onTouchStart(e) {
    if (this.locked) return;
    e.preventDefault();
    const t = e.touches[0];
    const cell = this.#cellFromPoint(t.clientX, t.clientY);
    if (!cell) return;
    this.isMouseDown = true;
    if (cell.isStart) { this.dragTarget = "start"; return; }
    if (cell.isEnd)   { this.dragTarget = "end"; return; }
    this.#applyBrush(cell, true);
  }
  #onTouchMove(e) {
    if (!this.isMouseDown || this.locked) return;
    e.preventDefault();
    const t = e.touches[0];
    const cell = this.#cellFromPoint(t.clientX, t.clientY);
    if (cell) this.#continueInteraction(cell);
  }

  /* ------------------------------------------------------------------ */
  /* RESPONSIVE CELL SIZE                                               */
  /* ------------------------------------------------------------------ */

  /** Auto-fit cell size to available width. */
  fitCellSize(availableWidth) {
    const size = clamp(Math.floor(availableWidth / this.cols) - 1, 12, 32);
    document.documentElement.style.setProperty("--cell-size", `${size}px`);
  }
}