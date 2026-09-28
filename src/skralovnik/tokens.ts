import { staticFile } from 'remotion';

// Brand: the website's near-black canvas and paper type, the symbol's teal.
export const INK = '#050607';
export const PAPER = '#f4f1ea';
export const TEAL = '#00202d';
export const HAIR = 'rgba(244, 241, 234, 0.82)';
export const HAIR_FAINT = 'rgba(244, 241, 234, 0.28)';

export const SERIF = '"Cormorant Garamond", serif';
export const PIXEL = '"Silkscreen", monospace';

const pad = (n: number) => String(n).padStart(4, '0');
export const plate = (kind: 'org' | 'd4' | 'd8', src: number) =>
  staticFile(`skralovnik/plate/${kind}/${pad(src)}.${kind === 'org' ? 'jpg' : 'png'}`);
export const elementFile = (file: string) => staticFile(`skralovnik/elements/${file}.png`);

/** Deterministic hash noise in [0, 1). */
export const rnd = (a: number, b = 0, c = 0) => {
  let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return ((h >>> 0) % 100000) / 100000;
};

export const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const timecode = (o: number, fps = 30) => {
  const s = Math.floor(o / fps);
  const f = o % fps;
  return `00:00:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
};
