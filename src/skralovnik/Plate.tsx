import { Img } from 'remotion';
import { Dither, full, Still } from './Bits';
import { baseAt, CHAPTERS, FOOT_END, H, PRE, shotAt, shotStart, srcAt, W } from './timeline';
import { INK, PAPER, plate, rnd, SERIF } from './tokens';

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
      <Img key={id} src={plate('org', src)} style={{ ...full, top, left: dx + (i - 1) * spread, filter: `url(#${id})`, mixBlendMode: 'screen' }} />
    ))}
  </div>
);

/** A few thin strips of the frame knocked sideways, some split RGB, over the untouched footage. */
export const Strips: React.FC<{ o: number }> = ({ o }) => {
  const src = srcAt(o);
  const k = shotAt(o);
  const first = k >= 0 && k < 8 ? shotStart(k) - PRE : 0;
  const out: React.ReactNode[] = [];
  for (let i = 0; i < 7; i++) {
    const y = Math.round(rnd(o, i, 1) * (H - 60));
    const h = Math.round(8 + rnd(o, i, 2) * 46);
    const dx = Math.round((rnd(o, i, 3) - 0.5) * 2 * (rnd(o, i, 4) < 0.5 ? 180 : 40));
    const back = rnd(o, i, 5) < 0.3 ? Math.max(first, src - 3) : src;
    out.push(
      <div key={i} style={{ position: 'absolute', left: 0, top: y, width: W, height: h, overflow: 'hidden' }}>
        {rnd(o, i, 6) < 0.45 ? (
          <Split src={back} dx={dx} spread={8 + Math.round(rnd(o, i, 7) * 12)} top={-y} />
        ) : (
          <Img src={plate('org', back)} style={{ ...full, top: -y, left: dx }} />
        )}
      </div>,
    );
  }
  return <>{out}</>;
};

const WORD_SIZE: Record<string, number> = { PRESENT: 760, BUILD: 820, TRAIN: 800, RUN: 1060, TEAM: 900, RECOVER: 700, REPEAT: 740 };
const WORD_X: Record<string, number> = { PRESENT: 900, TRAIN: 1010, RUN: 1000, REPEAT: 880 };

/** The chapter word, too big for the frame, over the (still moving) footage. */
export const TypeFlash: React.FC<{ o: number }> = ({ o }) => {
  const word = CHAPTERS[shotAt(o)].toUpperCase();
  return (
    <div style={{ ...full, overflow: 'hidden' }}>
      <Still src={srcAt(o)} style={{ filter: 'brightness(0.55)' }} />
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
          color: PAPER,
        }}
      >
        {word}
      </div>
    </div>
  );
};

/** The whole-frame layer for output frame o: the footage, or one of the four full-frame flashes. */
export const Plate: React.FC<{ o: number }> = ({ o }) => {
  const { look, ev } = baseAt(o);
  const src = ev?.p?.src !== undefined ? Number(ev.p.src) : srcAt(o);
  if ((o < PRE || o >= FOOT_END) && look === 'org') return <div style={{ ...full, background: INK }} />;
  switch (look) {
    case 'org':
      return <Still src={src} />;
    case 'neg':
      return <Still src={src} style={{ filter: 'invert(1)' }} />;
    case 'dit':
      return (
        <div style={{ ...full, background: INK }}>
          <Dither src={src} />
        </div>
      );
    case 'type':
      return <TypeFlash o={o} />;
  }
};
