import { SPEED_DELAYS } from "./utils.js";

/**
 * Playback lifecycle states for the animator.
 */
export const PlayState = Object.freeze({
  IDLE: "idle",
  PLAYING: "playing",
  PAUSED: "paused",
  DONE: "done",
});

/**
 * Animator — replays an algorithm trace over the grid using a
 * requestAnimationFrame time-accumulator loop. This decouples animation
 * speed from frame rate (smooth on any monitor) and cleanly supports
 * pause / resume / stop / replay / step / frame-by-frame.
 *
 * The trace shape (from Module 3):
 *   { visitedOrder, path, steps, found, stats }
 *
 * Callbacks let app.js update stats, the educational panel, and sounds
 * without this module knowing about the DOM outside the grid cells.
 */
export class Animator {
  constructor({ onStep, onVisit, onPath, onComplete, onSound, playSpeed } = {}) {
    this.state = PlayState.IDLE;

    // Playback data
    this.trace = null;
    this.visitedIndex = 0;
    this.pathIndex = 0;
    this.phase = "visit"; // 'visit' -> 'path' -> 'done'

    // Timing
    this.delay = SPEED_DELAYS.medium; // ms per unit step
    this.accumulator = 0;
    this.lastTime = 0;
    this.rafId = null;

    // Modes
    this.stepMode = false;    // advance only when nextStep() called
    this.instant = false;     // no animation, paint everything at once

    // Callbacks
    this.onStep = onStep || (() => {});         // (step, meta) educational
    this.onVisit = onVisit || (() => {});       // (count) stats
    this.onPath = onPath || (() => {});         // (count) stats
    this.onComplete = onComplete || (() => {}); // (found)
    this.onSound = onSound || (() => {});       // (name)
    this.getPlaySpeed = playSpeed || (() => "medium");
  }

  /* ------------------------------------------------------------------ */
  /* PUBLIC CONTROL                                                     */
  /* ------------------------------------------------------------------ */

  /** Load a trace and begin playback. */
  play(trace, { speed = "medium", stepMode = false } = {}) {
    this.stop(); // clean any prior run
    this.trace = trace;
    this.visitedIndex = 0;
    this.pathIndex = 0;
    this.phase = "visit";
    this.accumulator = 0;
    this.lastTime = 0;
    this.stepMode = stepMode;

    this.setSpeed(speed);

    if (this.instant) {
      this.#renderInstant();
      return;
    }

    this.state = this.stepMode ? PlayState.PAUSED : PlayState.PLAYING;
    if (!this.stepMode) this.#startLoop();
  }

  pause() {
    if (this.state !== PlayState.PLAYING) return;
    this.state = PlayState.PAUSED;
    this.#stopLoop();
  }

  resume() {
    if (this.state !== PlayState.PAUSED) return;
    this.state = PlayState.PLAYING;
    this.stepMode = false;
    this.lastTime = 0; // avoid a big delta jump after pausing
    this.#startLoop();
  }

  /** Fully stop and reset playback counters (does not clear the grid). */
  stop() {
    this.#stopLoop();
    this.state = PlayState.IDLE;
    this.accumulator = 0;
    this.lastTime = 0;
  }

  /** Set per-step delay from a speed preset key. */
  setSpeed(speedKey) {
    this.instant = speedKey === "instant";
    this.delay = SPEED_DELAYS[speedKey] ?? SPEED_DELAYS.medium;
  }

  /** Advance exactly one atomic step (step mode / frame-by-frame). */
  nextStep() {
    if (!this.trace) return;
    if (this.phase === "done") return;
    this.stepMode = true;
    this.state = PlayState.PAUSED;
    this.#advanceOne();
  }

  get isRunning() {
    return this.state === PlayState.PLAYING || this.state === PlayState.PAUSED;
  }

  /* ------------------------------------------------------------------ */
  /* RAF LOOP                                                           */
  /* ------------------------------------------------------------------ */

  #startLoop() {
    this.#stopLoop();
    const tick = (time) => {
      if (this.state !== PlayState.PLAYING) return;
      if (this.lastTime === 0) this.lastTime = time;
      const dt = time - this.lastTime;
      this.lastTime = time;
      this.accumulator += dt;

      // Emit as many steps as fit into the elapsed time (keeps pace steady).
      // delay === 0 (shouldn't happen unless instant) → cap batch to avoid freeze.
      const step = this.delay > 0 ? this.delay : 4;
      let guard = 0;
      while (this.accumulator >= step && this.state === PlayState.PLAYING) {
        this.accumulator -= step;
        this.#advanceOne();
        if (this.phase === "done") break;
        if (++guard > 2000) break; // safety valve
      }

      if (this.phase !== "done" && this.state === PlayState.PLAYING) {
        this.rafId = requestAnimationFrame(tick);
      }
    };
    this.rafId = requestAnimationFrame(tick);
  }

  #stopLoop() {
    if (this.rafId != null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /* ------------------------------------------------------------------ */
  /* STEP ADVANCEMENT                                                   */
  /* ------------------------------------------------------------------ */

  /** Perform a single atomic advance across whatever phase we're in. */
  #advanceOne() {
    if (this.phase === "visit") return this.#advanceVisit();
    if (this.phase === "path")  return this.#advancePath();
  }

  #advanceVisit() {
    const { visitedOrder, steps } = this.trace;

    if (this.visitedIndex >= visitedOrder.length) {
      // Finished exploring → move to path phase
      this.phase = this.trace.found && this.trace.path.length ? "path" : "done";
      if (this.phase === "done") this.#finish();
      return;
    }

    const cell = visitedOrder[this.visitedIndex];

    // Clear previous "current" highlight
    if (this._prevCurrent) this._prevCurrent.markCurrent(false);

    cell.markVisited();
    cell.markCurrent(true);
    this._prevCurrent = cell;

    this.onVisit(this.visitedIndex + 1);
    this.onSound("visit");

    // Feed educational panel if a matching step snapshot exists
    if (steps && steps[this.visitedIndex]) {
      this.onStep(steps[this.visitedIndex], {
        phase: "visit",
        index: this.visitedIndex,
        total: visitedOrder.length,
      });
    }

    this.visitedIndex++;
  }

  #advancePath() {
    const { path } = this.trace;

    if (this.pathIndex >= path.length) {
      this.#finish();
      return;
    }

    // Clear lingering "current" highlight when path drawing starts
    if (this._prevCurrent) { this._prevCurrent.markCurrent(false); this._prevCurrent = null; }

    const cell = path[this.pathIndex];
    cell.markPath();
    this.onPath(this.pathIndex + 1);
    this.onSound("path");

    this.pathIndex++;
  }

  #finish() {
    if (this._prevCurrent) { this._prevCurrent.markCurrent(false); this._prevCurrent = null; }
    this.phase = "done";
    this.state = PlayState.DONE;
    this.#stopLoop();
    this.onSound(this.trace.found ? "goal" : "error");
    this.onComplete(this.trace.found);
  }

  /* ------------------------------------------------------------------ */
  /* INSTANT RENDER (speed = instant)                                   */
  /* ------------------------------------------------------------------ */

  #renderInstant() {
    const { visitedOrder, path, found } = this.trace;
    for (const cell of visitedOrder) cell.markVisited();
    this.onVisit(visitedOrder.length);

    if (found) {
      for (const cell of path) cell.markPath();
      this.onPath(path.length);
    }
    // Educational: jump to the final snapshot if available
    const steps = this.trace.steps;
    if (steps && steps.length) {
      this.onStep(steps[steps.length - 1], {
        phase: "done", index: steps.length - 1, total: steps.length,
      });
    }
    this.phase = "done";
    this.state = PlayState.DONE;
    this.onSound(found ? "goal" : "error");
    this.onComplete(found);
  }
}

/* ==================================================================== */
/* SOUND ENGINE — lightweight Web Audio synth (no asset files needed).  */
/* ==================================================================== */

/**
 * SoundEngine — generates short tones procedurally via the Web Audio API.
 * Avoids shipping audio files and keeps the bundle tiny. Toggleable.
 */
export class SoundEngine {
  constructor() {
    this.enabled = false;
    this.ctx = null;
    // Frequency (Hz) + waveform per event type
    this.presets = {
      visit:  { freq: 440, type: "sine",     dur: 0.04, gain: 0.04 },
      wall:   { freq: 180, type: "square",   dur: 0.05, gain: 0.05 },
      path:   { freq: 660, type: "triangle", dur: 0.06, gain: 0.06 },
      goal:   { freq: 880, type: "sine",     dur: 0.25, gain: 0.10 },
      error:  { freq: 140, type: "sawtooth", dur: 0.30, gain: 0.08 },
      maze:   { freq: 300, type: "square",   dur: 0.03, gain: 0.03 },
      click:  { freq: 520, type: "sine",     dur: 0.03, gain: 0.05 },
    };
    this._visitDrift = 0; // slight pitch rise as exploration continues
  }

  toggle(on) {
    this.enabled = on;
    if (on && !this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    // Browsers require a user gesture to resume audio contexts
    if (on && this.ctx?.state === "suspended") this.ctx.resume();
    return this.enabled;
  }

  play(name) {
    if (!this.enabled || !this.ctx) return;
    const preset = this.presets[name];
    if (!preset) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    let freq = preset.freq;
    if (name === "visit") {
      // Gentle upward drift makes exploration feel musical
      freq += (this._visitDrift % 24) * 6;
      this._visitDrift++;
    }

    osc.type = preset.type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(preset.gain, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + preset.dur);

    osc.connect(gain).connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + preset.dur);
  }

  resetDrift() { this._visitDrift = 0; }
}

/* ==================================================================== */
/* TOAST — tiny transient notification helper.                          */
/* ==================================================================== */

let _toastTimer = null;
export function showToast(message, variant = "info", ms = 2600) {
  let el = document.querySelector(".toast");
  if (el) el.remove();

  el = document.createElement("div");
  el.className = `toast toast--${variant}`;
  el.setAttribute("role", "status");
  el.textContent = message;
  document.body.appendChild(el);

  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => {
    el.style.opacity = "0";
    el.style.transition = "opacity 250ms ease";
    setTimeout(() => el.remove(), 260);
  }, ms);
}