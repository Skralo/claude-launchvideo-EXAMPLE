// SKRALOVNIK film: single source of truth for timing.
// 30 fps (the footage's own rate), 1920x1080. The picture reads EVENTS frame by frame and
// scripts/skralovnik/export-cues.ts hands the same list to the sound design, so every sound sits
// on the frame of the visual event it belongs to.

export const FPS = 30;
export const W = 1920;
export const H = 1080;

/** Cut frames of the source (measured; identical to the website's CHAPTERS). */
export const CUTS = [0, 30, 59, 90, 122, 153, 182, 215, 242];
export const CHAPTERS = ['Present', 'Build', 'Train', 'Build', 'Run', 'Team', 'Recover', 'Repeat'];

/** Boot frames before the footage starts. */
export const PRE = 6;
export const FOOT_END = PRE + CUTS[8]; // 248
export const TOTAL = 303; // 10.1 s

export const shotStart = (k: number) => PRE + CUTS[k];
export const shotEnd = (k: number) => PRE + CUTS[k + 1]; // exclusive
export const shotAt = (o: number) => {
  for (let k = 0; k < 8; k++) if (o < shotEnd(k)) return o < shotStart(k) ? -1 : k;
  return 8;
};
/** Source frame on screen at output frame o (clamped into the footage). */
export const srcAt = (o: number) => Math.max(0, Math.min(CUTS[8] - 1, o - PRE));

// ---------------------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------------------
// fn is the event's job, which is what the sound design maps:
//   micro      a 1-4 frame interruption inside a shot (a flash, a result, the chapter word)
//   transition the hit on a cut
//   lock       a scan locks onto the subject
//   texture    something textural travels (film strip, contour trace, chrome travel)
//   resolve    the logo locks
export type Fn = 'micro' | 'transition' | 'lock' | 'texture' | 'resolve';

// v2 (feedback on v1): the footage stays as it is, in its own colour and speed, and is clean for
// most of every shot. The edit arrives in bursts over it. Only four looks may take the whole
// frame for a frame or two: negative, 1-bit, the chapter word over the footage, and the chrome
// sparkle on a cut. Everything else is an overlay.
// v3 (feedback on v2): every scan, circle and line is white, every element mostly white; new
// elements from Anže (tiger, sword, helmet, orbital HUD, word ring, the logo).
export type BaseLook = 'neg' | 'dit' | 'type';
export type OverLook = 'boot' | 'wipe' | 'strips' | 'strip' | 'contour' | 'scan' | 'orbit' | 'element' | 'ring' | 'recap' | 'collapse' | 'converge' | 'lockup' | 'wordmark' | 'flat';
export type Look = BaseLook | OverLook;

export type Ev = {
  id: string;
  /** first frame on screen */
  o: number;
  dur: number;
  /** frame the sound belongs to (default o) */
  hit?: number;
  fn: Fn;
  /** one look for the whole event, or one per frame */
  look: Look | Look[];
  /** shot index 0..7, -1 boot, 8 outro */
  shot: number;
  note: string;
  p?: Record<string, number | string>;
};

const BASE: ReadonlySet<string> = new Set(['neg', 'dit', 'type']);
export const isBase = (l: Look): l is BaseLook => BASE.has(l);

const s = shotStart;
/** A scan around the subject; it locks (the sound) on its last frame, then its result flashes. */
const scan = (id: string, k: number, at: number, dur: number, note: string, result: string): Ev[] => [
  { id: `${id}-scan`, o: s(k) + at, dur, hit: s(k) + at + dur - 1, fn: 'lock', look: 'scan', shot: k, note, p: { label: result } },
];
const element = (id: string, k: number, at: number, el: string, label: string, note: string, side?: number): Ev => ({
  id: `${id}-el`, o: s(k) + at, dur: 4, fn: 'micro', look: 'element', shot: k, note, p: side === undefined ? { el, label } : { el, label, side },
});

export const EVENTS: Ev[] = [
  // Boot ------------------------------------------------------------------------------
  { id: 'boot', o: 0, dur: 5, fn: 'texture', look: 'boot', shot: -1, note: 'hairlines draw in from the corners around a glint' },
  { id: 'boot-dit', o: 5, dur: 1, fn: 'micro', look: 'dit', shot: -1, note: '1-bit frame of PRESENT', p: { src: 0 } },

  // 1 Present: the mind ----------------------------------------------------------------
  { id: 'p-in', o: s(0), dur: 2, fn: 'transition', look: 'strips', shot: 0, note: 'thin glitch strips knock the first shot in' },
  ...scan('p', 0, 3, 6, 'circular scan of the face', '[MIND]'),
  element('p', 0, 9, 'brain', '[MIND]', 'result: the brain flashes beside the scan'),
  { id: 'p-type', o: s(0) + 23, dur: 1, fn: 'micro', look: 'type', shot: 0, note: 'PRESENT over the footage, too big for the frame' },

  // 2 Build (typing) --------------------------------------------------------------------
  { id: 'b1-in', o: s(1), dur: 1, fn: 'transition', look: 'neg', shot: 1, note: 'cut in on the negative' },
  ...scan('b1', 1, 4, 6, 'small scan of the meander ring', '[FOCUS]'),
  { id: 'b1-strip', o: s(1) + 14, dur: 4, fn: 'texture', look: 'strip', shot: 1, note: 'film strip of the last frames rolls up the right edge' },

  // 3 Train: strength --------------------------------------------------------------------
  { id: 't-in', o: s(2) - 2, dur: 4, hit: s(2), fn: 'transition', look: 'wipe', shot: 2, note: 'chrome sparkle swells through the lens and wipes to TRAIN' },
  ...scan('t', 2, 4, 6, 'scan of the head on the bar', '[STRENGTH]'),
  element('t', 2, 10, 'eagle', '[STRENGTH]', 'result: the eagle flashes beside the scan'),

  // 4 Build (notebook) --------------------------------------------------------------------
  { id: 'b2-in', o: s(3), dur: 1, fn: 'transition', look: 'dit', shot: 3, note: 'cut in on a 1-bit frame' },
  ...scan('b2', 3, 4, 6, 'scan of the face over the notebook', '[PLAN]'),
  element('b2', 3, 10, 'logo', '[PLAN]', 'result: the SKRALOVNIK logo, white and big'),
  { id: 'b2-ring', o: s(3) + 10, dur: 8, fn: 'texture', look: 'ring', shot: 3, note: 'the word ring turns around him, behind him' },
  { id: 'b2-contour', o: s(3) + 19, dur: 4, fn: 'texture', look: 'contour', shot: 3, note: 'the silhouette traces itself in hairline' },

  // 5 Run: speed ---------------------------------------------------------------------------
  { id: 'r-in', o: s(4), dur: 2, fn: 'transition', look: 'strips', shot: 4, note: 'thin glitch strips' },
  ...scan('r', 4, 3, 6, "scan of the runner's head", '[SPEED]'),
  element('r', 4, 9, 'tiger', '[SPEED]', 'result: the tiger leaps ahead of the runner', 1),
  { id: 'r-type', o: s(4) + 24, dur: 1, fn: 'micro', look: 'type', shot: 4, note: 'RUN over the footage, too big for the frame' },

  // 6 Team -------------------------------------------------------------------------------
  { id: 'tm-in', o: s(5), dur: 1, fn: 'transition', look: 'neg', shot: 5, note: 'cut in on the negative' },
  ...scan('tm', 5, 3, 6, 'scan of the two of them', '[TEAM]'),
  element('tm', 5, 9, 'figures', '[TEAM]', 'result: three figures flash beside the scan'),

  // 7 Recover: insight -------------------------------------------------------------------
  { id: 'rc-in', o: s(6), dur: 1, fn: 'transition', look: 'dit', shot: 6, note: 'cut in on a 1-bit frame' },
  { id: 'rc-orbit', o: s(6) + 5, dur: 6, hit: s(6) + 10, fn: 'lock', look: 'orbit', shot: 6, note: 'the orbital HUD is the scan: its eye locks on the head', p: { label: '[INSIGHT]', fx: 0.4, fy: -0.5 } },
  element('rc', 6, 12, 'sword', '[SHARPEN]', 'result, a beat later: the sword'),
  { id: 'rc-neg', o: s(6) + 26, dur: 1, fn: 'micro', look: 'neg', shot: 6, note: 'negative of the heat' },

  // 8 Repeat: rise -------------------------------------------------------------------------
  { id: 'rp-in', o: s(7) - 2, dur: 4, hit: s(7), fn: 'transition', look: 'wipe', shot: 7, note: 'chrome sparkle wipes to REPEAT' },
  ...scan('rp', 7, 4, 5, 'scan of the lift as the camera pulls back', '[RISE]'),
  element('rp', 7, 9, 'helmet', '[DISCIPLINE]', 'result: the Spartan helmet'),

  // Outro: the day again, then the mark ----------------------------------------------
  ...Array.from({ length: 8 }, (_, k): Ev => ({
    id: `recap-${k + 1}`, o: FOOT_END + k, dur: 1, fn: 'micro', look: 'recap', shot: 8,
    note: `contact sheet: ${CHAPTERS[k].toUpperCase()} drops into the grid`, p: { k },
  })),
  { id: 'collapse', o: FOOT_END + 8, dur: 5, fn: 'texture', look: 'collapse', shot: 8, note: 'the grid folds into one point' },
  { id: 'converge', o: FOOT_END + 13, dur: 15, hit: FOOT_END + 14, fn: 'texture', look: 'converge', shot: 8, note: 'four chrome sparkles fly in from the corners' },
  { id: 'lockup', o: FOOT_END + 28, dur: 1, fn: 'resolve', look: 'lockup', shot: 8, note: 'the sparkles lock into the SKRALOVNIK symbol' },
  { id: 'wordmark', o: FOOT_END + 32, dur: 7, fn: 'texture', look: 'wordmark', shot: 8, note: 'the wordmark resolves from 1-bit noise' },
  { id: 'flat', o: FOOT_END + 40, dur: 4, fn: 'texture', look: 'flat', shot: 8, note: 'the chrome symbol settles into the flat logo from the website' },
];

/** Frame index inside a multi-frame look array. */
export const lookAt = (e: Ev, o: number): Look => (Array.isArray(e.look) ? e.look[Math.min(o - e.o, e.look.length - 1)] : e.look);

export const eventsAt = (o: number) => EVENTS.filter((e) => o >= e.o && o < e.o + e.dur);

export const baseAt = (o: number): { look: BaseLook | 'org'; ev?: Ev } => {
  for (const e of eventsAt(o)) {
    const l = lookAt(e, o);
    if (isBase(l)) return { look: l, ev: e };
  }
  return { look: 'org' };
};

/** Where the outro's logo sits (1920x1080 px). logo.svg is 266x116 in its own units. */
export const LOGO = { width: 1040, cx: 960, cy: 540 };
