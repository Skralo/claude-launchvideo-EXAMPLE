// Outro, frames FOOT_END..TOTAL:
//   0-7   the day again: a contact sheet fills one tile per frame (REPEAT)
//   8-12  the grid folds into a point
//   13-27 four chrome sparkles fly in from the corners
//   28    they lock into the SKRALOVNIK symbol (resolve)
//   29-35 the symbol settles into its place in the logo
//   32-38 the wordmark resolves from 1-bit noise
//   40-43 the chrome symbol gives way to the flat one from the website's logo.svg
//   44-   hold on the logo, over the last frame of the day, veiled like the website's hero
import { Img, staticFile } from 'remotion';
import { Dither, Still } from './Bits';
import { ChromeStage, Spark } from './Chrome';
import { FlatSparkle } from './Sparkle';
import { Label } from './Label';
import { CHAPTERS, CUTS, FOOT_END, LOGO } from './timeline';
import { HAIR, HAIR_FAINT, lerp, PAPER, rnd } from './tokens';

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 4);

// logo.svg: viewBox 274 434 266 116; its symbol's white layer spans x 388.5-419.7, y 445.1-478.1.
const K = LOGO.width / 266;
const LOGO_BOX = { x: LOGO.cx - 133 * K, y: LOGO.cy - 58 * K, w: 266 * K, h: 116 * K };
const SYM = { cx: LOGO.cx + (404.1 - 407) * K, cy: LOGO.cy + (461.6 - 492) * K, w: 31.2 * K, h: 33 * K };
// symbol.svg places four sparkles 12 units from the centre, each 25 units tip to tip, 49 units overall
const FORM = { cx: 960, cy: 520, u: 7.4 };
const OFFS: [number, number][] = [[0, -12], [12, 0], [0, 12], [-12, 0]]; // N E S W
const FROM: [number, number][] = [[2140, -260], [2140, 1340], [-220, 1340], [-220, -260]]; // swirl in from the corners

const GRID = { x: 426, y: 360, dx: 276, dy: 205 };
const tileSrc = (k: number) => Math.round((CUTS[k] + CUTS[k + 1]) / 2);

/** Formation state for relative outro frame r: centre, unit (x/y), per-sparkle rotation. */
const formation = (r: number) => {
  if (r <= 28) return { cx: FORM.cx, cy: FORM.cy, ux: FORM.u, uy: FORM.u };
  const t = easeOut(Math.min(1, (r - 28) / 7));
  return {
    cx: lerp(FORM.cx, SYM.cx, t),
    cy: lerp(FORM.cy, SYM.cy, t),
    ux: lerp(FORM.u, SYM.w / 49, t),
    uy: lerp(FORM.u, SYM.h / 49, t),
  };
};

const sparks = (r: number): Spark[] => {
  const f = formation(r);
  const fly = r < 28 ? easeInOut(Math.min(1, Math.max(0, (r - 13) / 14))) : 1;
  const idle = r > 28 ? 0.3 * Math.sin((r - 28) * 0.2) : 0;
  return OFFS.map(([ox, oy], i) => {
    const tx = f.cx + ox * f.ux;
    const ty = f.cy + oy * f.uy;
    const spin = (1 - fly) * (i % 2 ? -1 : 1);
    return {
      x: lerp(FROM[i][0], tx, fly),
      y: lerp(FROM[i][1], ty, fly),
      size: lerp(1100, 25 * f.ux, fly),
      sx: f.uy / f.ux,
      rz: spin * Math.PI * 1.25,
      rx: (1 - fly) * 0.9 + idle * 0.5,
      ry: (1 - fly) * -0.8 + idle,
    };
  });
};

/** 1-bit dissolve: whole 10 px cells switch on in random order. */
const dissolve = (w: number, h: number, p: number, seed: number) => {
  const cell = 10;
  let d = '';
  for (let y = 0; y < h; y += cell) for (let x = 0; x < w; x += cell) if (rnd(x, y, seed) < p) d += `M${x} ${y}h${cell}v${cell}h-${cell}Z`;
  return d || 'M0 0Z';
};

export const Outro: React.FC<{ o: number }> = ({ o }) => {
  const r = o - FOOT_END;
  const flat = Math.min(1, Math.max(0, (r - 40) / 4));

  // contact sheet + fold
  let sheet: React.ReactNode = null;
  if (r < 13) {
    const fold = r >= 8 ? [0.72, 0.46, 0.24, 0.1, 0][r - 8] : 1;
    sheet = (
      <>
        {CHAPTERS.map((ch, k) => {
          if (k > r) return null;
          const col = k % 4;
          const row = Math.floor(k / 4);
          const x = GRID.x + col * GRID.dx;
          const y = GRID.y + row * GRID.dy;
          const cx = lerp(960, x + 120, fold);
          const cy = lerp(540, y + 67, fold);
          if (fold === 0) return null;
          const fresh = k === r && r < 8;
          return (
            <div key={k} style={{ position: 'absolute', left: cx - 120, top: cy - 67, width: 240, height: 135, transform: `scale(${fold})` }}>
              <Dither src={tileSrc(k)} kind="d8" scale={1} style={fresh ? { filter: 'invert(1)' } : undefined} />
              <div style={{ position: 'absolute', left: -8, top: -8, width: 254, height: 149, border: `1px solid ${fresh ? PAPER : HAIR}` }} />
              {fold === 1 && (
                <Label x={0} y={149}>
                  {`${String(k + 1).padStart(2, '0')} ${ch.toUpperCase()}`}
                </Label>
              )}
            </div>
          );
        })}
        {r < 8 && (
          <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0 }} shapeRendering="crispEdges">
            <path d={`M${GRID.x - 40}.5 ${GRID.y - 60}.5H${GRID.x + 3 * GRID.dx + 280}.5M${GRID.x - 40}.5 ${GRID.y + 2 * GRID.dy + 40}.5H${GRID.x + 3 * GRID.dx + 280}.5`} stroke={HAIR_FAINT} />
          </svg>
        )}
        {r < 8 && <Label x={GRID.x - 40} y={GRID.y - 90}>{`[REPEAT]  ${String(r + 1).padStart(2, '0')}/08`}</Label>}
        {r === 12 && <FlatSparkle x={960} y={540} size={34} color={PAPER} />}
      </>
    );
  }

  // lock language around the formation on the resolve frame
  const lockR = r >= 28 && r <= 31;
  const ringR = 170 + (r - 28) * 60;
  const wordP = r < 32 ? 0 : [0.12, 0.28, 0.46, 0.64, 0.8, 0.93, 1][Math.min(6, r - 32)];

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {/* the last frame of the day, held and veiled like the website's hero */}
      <Still src={CUTS[8] - 1} style={{ filter: `brightness(${r < 13 ? 0.28 : 0.4}) saturate(0.85)` }} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 55% 50% at 50% 50%, rgba(5,6,7,0.35) 0%, rgba(5,6,7,0.6) 100%)' }} />
      {sheet}
      {r >= 13 && flat < 1 && (
        <div style={{ position: 'absolute', inset: 0, opacity: 1 - flat }}>
          <ChromeStage items={sparks(r)} glow={r === 28 ? 2.2 : r > 34 ? 1.7 : 1.1} />
        </div>
      )}
      {flat > 0 && (
        <Img src={staticFile('skralovnik/logo-symbol.svg')} style={{ position: 'absolute', left: LOGO_BOX.x, top: LOGO_BOX.y, width: LOGO_BOX.w, height: LOGO_BOX.h, opacity: flat }} />
      )}
      {lockR && (
        <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0 }}>
          <circle cx={FORM.cx} cy={FORM.cy} r={ringR} fill="none" stroke={PAPER} strokeOpacity={1 - (r - 28) / 4} strokeWidth={1.5} />
          {r === 28 &&
            [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy], i) => {
              const x = FORM.cx + sx * 230;
              const y = FORM.cy + sy * 230;
              return <path key={i} d={`M${x} ${y - sy * 44}V${y}H${x - sx * 44}`} fill="none" stroke={PAPER} strokeWidth={3} />;
            })}
        </svg>
      )}
      {r === 28 && <FlatSparkle x={FORM.cx} y={FORM.cy} size={400} color={PAPER} opacity={0.75} />}
      {r === 29 && <FlatSparkle x={FORM.cx} y={FORM.cy} size={180} color={PAPER} opacity={0.6} />}
      {wordP > 0 && (
        <div
          style={{
            position: 'absolute',
            left: LOGO_BOX.x,
            top: LOGO_BOX.y,
            width: LOGO_BOX.w,
            height: LOGO_BOX.h,
            clipPath: wordP < 1 ? `path('${dissolve(Math.ceil(LOGO_BOX.w), Math.ceil(LOGO_BOX.h), wordP, 77)}')` : undefined,
          }}
        >
          <Img src={staticFile('skralovnik/wordmark.svg')} style={{ width: '100%', height: '100%' }} />
        </div>
      )}
      {r >= 30 && r < 36 && <Label x={LOGO.cx + 150} y={SYM.cy - 10} color={HAIR_FAINT}>{'[LOCK 09] SYMBOL'}</Label>}
    </div>
  );
};
