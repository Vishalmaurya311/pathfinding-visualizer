import { coordKey } from "./utils.js";

/**
 * Cell — a single node in the grid graph.
 * Holds pure state + a reference to its DOM element.
 * All rendering is done by toggling CSS classes (fast, GPU-friendly).
 */
export const CellType = Object.freeze({
  EMPTY: "empty",
  WALL: "wall",
  START: "start",
  END: "end",
  WEIGHT: "weight",
  CHECKPOINT: "checkpoint",
});

export class Cell {
  constructor(row, col) {
    this.row = row;
    this.col = col;
    this.key = coordKey(row, col);

    // Semantic type
    this.type = CellType.EMPTY;
    this.weight = 1; // movement cost; weight nodes use WEIGHT_COST

    // Algorithm bookkeeping (reset each run)
    this.distance = Infinity;
    this.gCost = Infinity;
    this.hCost = Infinity;
    this.fCost = Infinity;
    this.previous = null;
    this.visited = false;

    // DOM
    this.el = null;
  }

  /** Movement cost onto this cell. Weight tiles cost more. */
  get cost() {
    return this.type === CellType.WEIGHT ? this.weight : 1;
  }

  get isWall()       { return this.type === CellType.WALL; }
  get isStart()      { return this.type === CellType.START; }
  get isEnd()        { return this.type === CellType.END; }
  get isWeight()     { return this.type === CellType.WEIGHT; }
  get isCheckpoint() { return this.type === CellType.CHECKPOINT; }

  /** Build the DOM element once. */
  createElement() {
    const el = document.createElement("div");
    el.className = "cell";
    el.setAttribute("role", "gridcell");
    el.dataset.row = this.row;
    el.dataset.col = this.col;
    el.setAttribute("aria-label", `Cell ${this.row}, ${this.col}`);
    this.el = el;
    this.render();
    return el;
  }

  /** Reflect the semantic type onto the element's classes. */
  render() {
    if (!this.el) return;
    const el = this.el;
    el.classList.remove(
      "cell--wall", "cell--start", "cell--end",
      "cell--weight", "cell--checkpoint"
    );
    switch (this.type) {
      case CellType.WALL:       el.classList.add("cell--wall"); break;
      case CellType.START:      el.classList.add("cell--start"); break;
      case CellType.END:        el.classList.add("cell--end"); break;
      case CellType.WEIGHT:     el.classList.add("cell--weight"); break;
      case CellType.CHECKPOINT: el.classList.add("cell--checkpoint"); break;
    }
  }

  /** Set a new type and re-render. */
  setType(type, weight = 15) {
    this.type = type;
    if (type === CellType.WEIGHT) this.weight = weight;
    else this.weight = 1;
    this.render();
  }

  /** Visual-only states (do not change semantic type). */
  markVisited(alt = false) {
    if (this.isStart || this.isEnd) return;
    this.el?.classList.add(alt ? "cell--visited-alt" : "cell--visited");
  }
  markCurrent(on = true) {
    this.el?.classList.toggle("cell--current", on);
  }
  markPath() {
    if (this.isStart || this.isEnd) return;
    this.el?.classList.add("cell--path");
  }

  /** Remove all algorithm visual states (keep walls/weights/start/end). */
  clearVisuals() {
    this.el?.classList.remove(
      "cell--visited", "cell--visited-alt", "cell--current", "cell--path"
    );
  }

  /** Reset per-run algorithm bookkeeping. */
  resetPathData() {
    this.distance = Infinity;
    this.gCost = Infinity;
    this.hCost = Infinity;
    this.fCost = Infinity;
    this.previous = null;
    this.visited = false;
  }
}