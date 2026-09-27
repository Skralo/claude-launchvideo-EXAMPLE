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
//   micro      a 1-2 frame interruption inside a shot
//   transition the hit on a cut
//   lock       the brackets lock onto the subject
//   texture    something textural travels (scan band, smear, strip, contour, chrome travel)
//   resolve    the logo locks
export type Fn = 'micro' | 'transition' | 'lock' | 'texture' | 'resolve';

// Base looks replace the whole frame; the rest are drawn over it.
export type BaseLook = 'neg' | 'dit' | 'col' | 'punch' | 'type' | 'typeInv' | 'sys' | 'chrome' | 'slice' | 'black';
export type OverLook = 'boot' | 'wipe' | 'band' | 'bandV' | 'strip' | 'smear' | 'contour' | 'globe' | 'lock' | 'block' | 'recap' | 'collapse' | 'converge' | 'lockup' | 'wordmark';
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

const BASE: ReadonlySet<string> = new Set(['neg', 'dit', 'col', 'punch', 'type', 'typeInv', 'sys', 'chrome', 'slice', 'black']);
export const isBase = (l: Look): l is BaseLook => BASE.has(l);

const s = shotStart;
const lockAt = (k: number, r = 7) => s(k) + r;

export const EVENTS: Ev[] = [
  // Boot ------------------------------------------------------------------------------
  { id: 'boot', o: 0, dur: 4, fn: 'texture', look: 'boot', shot: -1, note: 'hairline frame draws in from the corners, brand line types on' },
  { id: 'boot-sys', o: 4, dur: 1, fn: 'micro', look: 'sys', shot: -1, note: 'system frame: the first tile of PRESENT', p: { variant: 'tile', src: 0 } },
  { id: 'boot-dit', o: 5, dur: 1, fn: 'micro', look: 'dit', shot: -1, note: '1-bit frame of PRESENT', p: { src: 0 } },

  // 1 Present -------------------------------------------------------------------------
  { id: 'p-in', o: s(0), dur: 1, fn: 'transition', look: 'neg', shot: 0, note: 'cut in on the x-ray negative' },
  { id: 'p-lock', o: lockAt(0), dur: 20, fn: 'lock', look: 'lock', shot: 0, note: 'brackets lock onto the face', p: { ring: 1 } },
  { id: 'p-punch', o: s(0) + 11, dur: 1, fn: 'micro', look: 'punch', shot: 0, note: 'punch-in on the eyes', p: { zoom: 2.4, dy: -0.18 } },
  { id: 'p-band', o: s(0) + 16, dur: 5, fn: 'texture', look: 'band', shot: 0, note: '1-bit scan band sweeps down' },
  { id: 'p-type', o: s(0) + 25, dur: 1, fn: 'micro', look: 'type', shot: 0, note: 'PRESENT, too big for the frame' },

  // 2 Build (typing) ------------------------------------------------------------------
  { id: 'b1-in', o: s(1), dur: 2, fn: 'transition', look: 'slice', shot: 1, note: 'sliced glitch entry' },
  { id: 'b1-lock', o: lockAt(1), dur: 18, fn: 'lock', look: 'lock', shot: 1, note: 'brackets lock onto the ring' },
  { id: 'b1-macro', o: s(1) + 11, dur: 1, fn: 'micro', look: 'punch', shot: 1, note: 'macro on the meander ring', p: { zoom: 3.4 } },
  { id: 'b1-strip', o: s(1) + 15, dur: 5, fn: 'texture', look: 'strip', shot: 1, note: 'film strip of the last frames rolls up the right edge' },
  { id: 'b1-col', o: s(1) + 24, dur: 1, fn: 'micro', look: 'col', shot: 1, note: 'one frame of real colour' },

  // 3 Train ---------------------------------------------------------------------------
  { id: 't-in', o: s(2) - 2, dur: 4, hit: s(2), fn: 'transition', look: 'wipe', shot: 2, note: 'chrome sparkle swells through the lens and wipes to TRAIN' },
  { id: 't-lock', o: lockAt(2, 8), dur: 19, fn: 'lock', look: 'lock', shot: 2, note: 'brackets lock onto the head on the bar' },
  { id: 't-type', o: s(2) + 12, dur: 1, fn: 'micro', look: 'typeInv', shot: 2, note: 'TRAIN in ink on paper' },
  { id: 't-band', o: s(2) + 17, dur: 5, fn: 'texture', look: 'bandV', shot: 2, note: '1-bit scan band sweeps left to right' },
  { id: 't-dit', o: s(2) + 26, dur: 1, fn: 'micro', look: 'dit', shot: 2, note: 'one 1-bit frame' },

  // 4 Build (notebook) ----------------------------------------------------------------
  { id: 'b2-in', o: s(3), dur: 2, fn: 'transition', look: ['dit', 'block'], shot: 3, note: 'arrives as 1-bit, a paper block knocks it into place' },
  { id: 'b2-lock', o: lockAt(3), dur: 21, fn: 'lock', look: 'lock', shot: 3, note: 'brackets lock onto the face over the notebook', p: { ring: 1 } },
  { id: 'b2-sys', o: s(3) + 11, dur: 2, fn: 'micro', look: 'sys', shot: 3, note: 'system frame: both BUILD shots side by side', p: { variant: 'pair' } },
  { id: 'b2-contour', o: s(3) + 16, dur: 6, fn: 'texture', look: 'contour', shot: 3, note: 'the silhouette traces itself in hairline' },
  { id: 'b2-neg', o: s(3) + 27, dur: 1, fn: 'micro', look: 'neg', shot: 3, note: 'x-ray negative' },

  // 5 Run -----------------------------------------------------------------------------
  { id: 'r-in', o: s(4), dur: 2, fn: 'transition', look: ['sys', 'slice'], shot: 4, note: 'system strip, then a sliced entry', p: { variant: 'strip' } },
  { id: 'r-lock', o: lockAt(4, 6), dur: 21, fn: 'lock', look: 'lock', shot: 4, note: 'brackets lock onto the runner\'s head', p: { ring: 1 } },
  { id: 'r-chrome', o: s(4) + 11, dur: 1, fn: 'micro', look: 'chrome', shot: 4, note: 'full-frame chrome sparkle' },
  { id: 'r-smear', o: s(4) + 15, dur: 6, fn: 'texture', look: 'smear', shot: 4, note: 'the stride smears into horizontal streaks' },
  { id: 'r-type', o: s(4) + 25, dur: 1, fn: 'micro', look: 'type', shot: 4, note: 'RUN, too big for the frame' },

  // 6 Team ----------------------------------------------------------------------------
  { id: 'tm-in', o: s(5), dur: 2, fn: 'transition', look: ['neg', 'col'], shot: 5, note: 'negative, colour, then silver' },
  { id: 'tm-lock', o: lockAt(5), dur: 18, fn: 'lock', look: 'lock', shot: 5, note: 'brackets lock onto both of them' },
  { id: 'tm-punch', o: s(5) + 11, dur: 1, fn: 'micro', look: 'punch', shot: 5, note: 'punch-in on the table', p: { zoom: 2.2 } },
  { id: 'tm-globe', o: s(5) + 14, dur: 7, fn: 'texture', look: 'globe', shot: 5, note: 'a wireframe globe turns inside the pendant lamp' },
  { id: 'tm-sys', o: s(5) + 24, dur: 1, fn: 'micro', look: 'sys', shot: 5, note: 'system frame: the team tile', p: { variant: 'tile' } },

  // 7 Recover -------------------------------------------------------------------------
  { id: 'rc-in', o: s(6), dur: 1, fn: 'transition', look: 'black', shot: 6, note: 'one frame of black, only the instruments' },
  { id: 'rc-lock', o: lockAt(6, 8), dur: 22, fn: 'lock', look: 'lock', shot: 6, note: 'brackets lock onto the silhouette' },
  { id: 'rc-col', o: s(6) + 12, dur: 1, fn: 'micro', look: 'col', shot: 6, note: 'the sauna in full colour' },
  { id: 'rc-band', o: s(6) + 16, dur: 6, fn: 'texture', look: 'band', shot: 6, note: 'heat scan band rises', p: { up: 1 } },
  { id: 'rc-neg', o: s(6) + 28, dur: 1, fn: 'micro', look: 'neg', shot: 6, note: 'x-ray negative of the heat' },

  // 8 Repeat --------------------------------------------------------------------------
  { id: 'rp-in', o: s(7) - 2, dur: 4, hit: s(7), fn: 'transition', look: 'wipe', shot: 7, note: 'chrome sparkle wipes to REPEAT' },
  { id: 'rp-lock', o: lockAt(7, 8), dur: 16, fn: 'lock', look: 'lock', shot: 7, note: 'brackets lock onto the lift as the camera pulls back', p: { ring: 1 } },
  { id: 'rp-type', o: s(7) + 12, dur: 1, fn: 'micro', look: 'typeInv', shot: 7, note: 'REPEAT in ink on paper' },
  { id: 'rp-strip', o: s(7) + 15, dur: 5, fn: 'texture', look: 'strip', shot: 7, note: 'film strip rolls up the right edge' },
  { id: 'rp-slice', o: s(7) + 24, dur: 1, fn: 'micro', look: 'slice', shot: 7, note: 'sliced glitch' },

  // Outro: the day again, then the mark ----------------------------------------------
  ...Array.from({ length: 8 }, (_, k): Ev => ({
    id: `recap-${k + 1}`, o: FOOT_END + k, dur: 1, fn: 'micro', look: 'recap', shot: 8,
    note: `contact sheet: ${CHAPTERS[k].toUpperCase()} drops into the grid`, p: { k },
  })),
  { id: 'collapse', o: FOOT_END + 8, dur: 5, fn: 'texture', look: 'collapse', shot: 8, note: 'the grid folds into one point' },
  { id: 'converge', o: FOOT_END + 13, dur: 15, hit: FOOT_END + 14, fn: 'texture', look: 'converge', shot: 8, note: 'four chrome sparkles fly in from the corners' },
  { id: 'lockup', o: FOOT_END + 28, dur: 1, fn: 'resolve', look: 'lockup', shot: 8, note: 'the sparkles lock into the SKRALOVNIK symbol' },
  { id: 'wordmark', o: FOOT_END + 32, dur: 7, fn: 'texture', look: 'wordmark', shot: 8, note: 'the wordmark resolves from 1-bit noise' },
];

/** Frame index inside a multi-frame look array. */
export const lookAt = (e: Ev, o: number): Look => (Array.isArray(e.look) ? e.look[Math.min(o - e.o, e.look.length - 1)] : e.look);

export const eventsAt = (o: number) => EVENTS.filter((e) => o >= e.o - (e.look === 'lock' ? 3 : 0) && o < e.o + e.dur);

export const baseAt = (o: number): { look: BaseLook | 'bw'; ev?: Ev } => {
  for (const e of eventsAt(o)) {
    const l = lookAt(e, o);
    if (isBase(l)) return { look: l, ev: e };
  }
  return { look: 'bw' };
};

export const lockEventOf = (k: number) => EVENTS.find((e) => e.shot === k && e.fn === 'lock');

/** Where the outro's logo sits (1920x1080 px). logo.svg is 266x116 in its own units. */
export const LOGO = { width: 1040, cx: 960, cy: 540 };
