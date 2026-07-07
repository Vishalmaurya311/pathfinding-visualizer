import { announce } from "./utils.js";

/**
 * Controls — binds all DOM controls, buttons, and keyboard shortcuts
 * to a set of action callbacks provided by app.js. This isolates ALL
 * event wiring from application logic (clean separation of concerns).
 */
export class Controls {
  /** @param {object} actions - callback map (see app.js) */
  constructor(actions) {
    this.actions = actions;
    this.$ = (id) => document.getElementById(id);
    this.#bindSelects();
    this.#bindButtons();
    this.#bindKeyboard();
  }

  #bindSelects() {
    this.$("algorithm-select").addEventListener("change", (e) =>
      this.actions.selectAlgorithm(e.target.value));
    this.$("maze-select").addEventListener("change", (e) =>
      this.actions.selectMaze(e.target.value));
    this.$("speed-select").addEventListener("change", (e) =>
      this.actions.selectSpeed(e.target.value));
    this.$("theme-select").addEventListener("change", (e) =>
      this.actions.selectTheme(e.target.value));
    this.$("size-range").addEventListener("input", (e) =>
      this.actions.resizeGrid(+e.target.value));
  }

  #bindButtons() {
    const map = {
      "btn-start": "start",
      "btn-pause": "pause",
      "btn-resume": "resume",
      "btn-stop": "stop",
      "btn-replay": "replay",
      "btn-clear-path": "clearPath",
      "btn-clear-walls": "clearWalls",
      "btn-reset": "reset",
      "btn-random-weights": "randomWeights",
      "btn-random-start": "randomStart",
      "btn-random-end": "randomEnd",
      "sound-toggle": "toggleSound",
      "btn-educational": "toggleEducational",
      "btn-compare": "toggleCompare",
    };
    for (const [id, action] of Object.entries(map)) {
      const el = this.$(id);
      if (el && this.actions[action]) {
        el.addEventListener("click", () => this.actions[action]());
      }
    }
  }

  #bindKeyboard() {
    document.addEventListener("keydown", (e) => {
      // Ignore when typing in a form field
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;

      const A = this.actions;
      switch (e.key) {
        case " ":        e.preventDefault(); A.start(); break;
        case "r": case "R": A.reset(); break;
        case "c": case "C": A.clearPath(); break;
        case "m": case "M": A.generateMaze(); break;
        case "p": case "P": A.pause(); break;
        case "Delete":   A.clearWalls(); break;
        case "ArrowUp":    e.preventDefault(); A.moveStart(-1, 0); break;
        case "ArrowDown":  e.preventDefault(); A.moveStart(1, 0); break;
        case "ArrowLeft":  e.preventDefault(); A.moveStart(0, -1); break;
        case "ArrowRight": e.preventDefault(); A.moveStart(0, 1); break;
        case "z": case "Z": if (e.ctrlKey || e.metaKey) { e.preventDefault(); A.undo(); } break;
        case "y": case "Y": if (e.ctrlKey || e.metaKey) { e.preventDefault(); A.redo(); } break;
        case "n": case "N": A.nextStep(); break; // step mode
      }
    });
    announce("Keyboard shortcuts enabled.");
  }

  /** Enable/disable action buttons during animation. */
  setRunning(isRunning) {
    const toggle = (id, disabled) => { const el = this.$(id); if (el) el.disabled = disabled; };
    ["btn-start", "btn-clear-walls", "btn-reset", "btn-random-start",
     "btn-random-end", "btn-random-weights"].forEach((id) => toggle(id, isRunning));
  }
}