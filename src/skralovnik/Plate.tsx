import { Img } from 'remotion';
import { Dither, full, Still } from './Bits';
import { baseAt, CHAPTERS, FOOT_END, H, PRE, shotAt, shotStart, srcAt, W } from './timeline';
import { INK, PAPER, PIXEL, plate, punchPlate, rnd, SERIF } from './tokens';
import { Sys } from './Sys';
import { ChromeFrame } from './Chrome';

/** Channel isolators for the RGB split (screen-blended copies rebuild the image when aligned). */
export const SvgDefs: React.FC = () => (
  <svg width={0} height={0} style={{ position: 'absolute' }}>
    <defs>
      <filter id="chR" colorInterpolationFilters="sRGB">
        <feColorMatrix type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" />
      </filter>
      <filter id="chG" colorInterpolationFilters="sRGB">
        <feColorMatrix type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" />
      </filter>
      <filter id="chB" colorInterpolationFilters="sRGB">
        <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" />
      </filter>
    </defs>
  </svg>
);

const Split: React.FC<{ src: number; dx: number; spread: number; top: number }> = ({ src, dx, spread, top }) => (
  <div style={{ position: 'absolute', inset: 0, background: '#000', isolation: 'isolate' }}>
    {(['chR', 'chG', 'chB'] as const).map((id, i) => (
      <Img
        key={id}
        src={plate('bw', src)}
        style={{ ...full, top, left: dx + (i - 1) * spread, filter: `url(#${id})`, mixBlendMode: 'screen' }}
      />
    ))}
  </div>
);

/** Horizontal slices knocked sideways; a few pull from a few frames back, a few split RGB. */
export const Slices: React.FC<{ o: number; src: number }> = ({ o, src }) => {
  const k = shotAt(o);
  const first = k >= 0 && k < 8 ? shotStart(k) - PRE : 0;
  const out: React.ReactNode[] = [];
  let y = 0;
  let i = 0;
  while (y < H) {
    const h = Math.round(24 + rnd(o, i, 1) * 150);
    const big = rnd(o, i, 3) < 0.4;
    const dx = Math.round((rnd(o, i, 2) - 0.5) * 2 * (big ? 230 : 36));
    const back = rnd(o, i, 4) < 0.3 ? Math.max(first, src - 3) : src;
    const rgb = rnd(o, i, 5) < 0.3;
    out.push(
      <div key={i} style={{ position: 'absolute', left: 0, top: y, width: W, height: h, overflow: 'hidden' }}>
        {rgb ? (
          <Split src={back} dx={dx} spread={10 + Math.round(rnd(o, i, 6) * 14)} top={-y} />
        ) : (
          <Img src={plate('bw', back)} style={{ ...full, top: -y, left: dx }} />
        )}
      </div>,
    );
    y += h;
    i++;
  }
  return <div style={{ ...full, overflow: 'hidden', background: INK }}>{out}</div>;
};

const WORD_SIZE: Record<string, number> = { PRESENT: 760, BUILD: 820, TRAIN: 800, RUN: 1060, TEAM: 900, RECOVER: 700, REPEAT: 740 };
const WORD_X: Record<string, number> = { PRESENT: 900, TRAIN: 1010, RUN: 1000, REPEAT: 880 };

/** The chapter word, too big for the frame. inv: ink on paper with a 1-bit tile pinned on. */
export const TypeFlash: React.FC<{ o: number; inv?: boolean }> = ({ o, inv }) => {
  const k = shotAt(o);
  const word = CHAPTERS[k].toUpperCase();
  const src = srcAt(o);
  return (
    <div style={{ ...full, background: inv ? PAPER : INK, overflow: 'hidden' }}>
      {!inv && <Still src={src} style={{ filter: 'brightness(0.3) contrast(1.1)' }} />}
      <div
        style={{
          position: 'absolute',
          left: WORD_X[word] ?? 960,
          top: 540,
          transform: 'translate(-50%, -52%)',
          fontFamily: SERIF,
          fontWeight: 600,
          fontSize: WORD_SIZE[word] ?? 800,
          lineHeight: 1,
          letterSpacing: '-0.015em',
          whiteSpace: 'nowrap',
          color: inv ? INK : PAPER,
        }}
      >
        {word}
      </div>
      {inv && (
        <>
          <Dither src={src} kind="d8" x={1560} y={836} style={{ mixBlendMode: 'multiply' }} />
          <div style={{ position: 'absolute', left: 1550, top: 826, width: 260, height: 155, border: `1px solid ${INK}` }} />
          <div style={{ position: 'absolute', left: 1550, top: 796, fontFamily: PIXEL, fontSize: 16, color: INK }}>
            [{String(k + 1).padStart(2, '0')}] {word}
          </div>
        </>
      )}
    </div>
  );
};

/** The whole-frame layer for output frame o. */
export const Plate: React.FC<{ o: number }> = ({ o }) => {
  const { look, ev } = baseAt(o);
  const src = ev?.p?.src !== undefined ? Number(ev.p.src) : srcAt(o);
  const inBoot = o < PRE;
  const inOutro = o >= FOOT_END;
  if ((inBoot || inOutro) && (look === 'bw' || look === 'black')) return <div style={{ ...full, background: INK }} />;
  switch (look) {
    case 'bw':
      return <Still src={src} />;
    case 'col':
      return <Still kind="col" src={src} />;
    case 'neg':
      return <Still src={src} style={{ filter: 'invert(1) contrast(1.25) brightness(1.05)' }} />;
    case 'dit':
      return (
        <div style={{ ...full, background: INK }}>
          <Dither src={src} />
        </div>
      );
    case 'punch':
      return <Img src={punchPlate(ev!.id)} style={full} />;
    case 'slice':
      return <Slices o={o} src={src} />;
    case 'black':
      return <div style={{ ...full, background: INK }} />;
    case 'type':
      return <TypeFlash o={o} />;
    case 'typeInv':
      return <TypeFlash o={o} inv />;
    case 'sys':
      return <Sys o={o} ev={ev!} />;
    case 'chrome':
      return <ChromeFrame o={o} />;
  }
};
