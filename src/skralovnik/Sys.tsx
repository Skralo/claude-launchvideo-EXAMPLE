// System frames: the IG reference's language. Black canvas, hairline layout, the footage shrunk to
// 1-bit tiles, pixel labels, target squares, a placeholder box and one solid paper block.
import { Dither, full } from './Bits';
import { CHAPTERS, CUTS, Ev, shotAt, srcAt } from './timeline';
import { HAIR, HAIR_FAINT, INK, PAPER, PIXEL } from './tokens';
import { boxOfSrc } from './track';

export const Label: React.FC<{ x: number; y: number; children: React.ReactNode; color?: string; size?: number; align?: 'left' | 'right' }> = ({
  x,
  y,
  children,
  color = HAIR,
  size = 16,
  align = 'left',
}) => (
  <div
    style={{
      position: 'absolute',
      left: align === 'left' ? x : undefined,
      right: align === 'right' ? 1920 - x : undefined,
      top: y,
      fontFamily: PIXEL,
      fontSize: size,
      lineHeight: 1,
      letterSpacing: 1,
      color,
      whiteSpace: 'pre',
    }}
  >
    {children}
  </div>
);

/** Frame with a centre cross: the IG reference's target square. */
export const Target: React.FC<{ x: number; y: number; s: number; color?: string }> = ({ x, y, s, color = HAIR }) => (
  <svg style={{ position: 'absolute', left: x, top: y, overflow: 'visible' }} width={s} height={s} shapeRendering="crispEdges">
    <rect x={0.5} y={0.5} width={s - 1} height={s - 1} fill="none" stroke={color} />
    <rect x={8.5} y={8.5} width={s - 17} height={s - 17} fill="none" stroke={color} />
    <path d={`M${s / 2} ${s / 2 - 7}V${s / 2 + 7}M${s / 2 - 7} ${s / 2}H${s / 2 + 7}`} stroke={color} />
  </svg>
);

export const XBox: React.FC<{ x: number; y: number; s: number; color?: string }> = ({ x, y, s, color = HAIR }) => (
  <svg style={{ position: 'absolute', left: x, top: y }} width={s} height={s}>
    <rect x={0.5} y={0.5} width={s - 1} height={s - 1} fill="none" stroke={color} />
    <path d={`M0 0L${s} ${s}M${s} 0L0 ${s}`} stroke={color} strokeWidth={1} />
  </svg>
);

/** A 1-bit tile inside a hairline frame. */
export const Tile: React.FC<{ src: number; x: number; y: number; kind?: 'd4' | 'd8' }> = ({ src, x, y, kind = 'd4' }) => {
  const w = kind === 'd4' ? 480 : 240;
  const h = kind === 'd4' ? 270 : 135;
  return (
    <>
      <Dither src={src} kind={kind} x={x} y={y} scale={1} />
      <div style={{ position: 'absolute', left: x - 9, top: y - 9, width: w + 18, height: h + 18, border: `1px solid ${HAIR}` }} />
    </>
  );
};

const Lines: React.FC<{ d: string; faint?: boolean }> = ({ d, faint }) => (
  <svg style={{ position: 'absolute', left: 0, top: 0 }} width={1920} height={1080} shapeRendering="crispEdges">
    <path d={d} fill="none" stroke={faint ? HAIR_FAINT : HAIR} strokeWidth={1} />
  </svg>
);

const f4 = (n: number) => String(n).padStart(4, '0');

export const Sys: React.FC<{ o: number; ev: Ev }> = ({ o, ev }) => {
  const variant = String(ev.p?.variant ?? 'tile');
  const k = Math.max(0, shotAt(o) >= 8 ? 7 : shotAt(o));
  const src = ev.p?.src !== undefined ? Number(ev.p.src) : srcAt(o);
  const word = CHAPTERS[k].toUpperCase();
  const [bx, by] = boxOfSrc(src);

  if (variant === 'pair') {
    // both BUILD shots: the ring (shot 2) and the notebook (shot 4)
    const ring = 44;
    const [rx, ry] = boxOfSrc(ring);
    return (
      <div style={{ ...full, background: INK }}>
        <Lines d="M140.5 0V190.5H760.5M1780.5 1080V880.5H1180.5M960.5 430V470" />
        <Tile src={ring} x={250} y={300} />
        <Tile src={src} x={1190} y={300} />
        <Target x={250 + rx / 4 - 34} y={300 + ry / 4 - 34} s={68} />
        <Target x={1190 + bx / 4 - 34} y={300 + by / 4 - 34} s={68} />
        <Lines d="M740.5 435.5H1170.5" />
        <Label x={250} y={600}>BUILD 01  F {f4(ring)}</Label>
        <Label x={1190} y={600}>BUILD 02  F {f4(src)}</Label>
        <Label x={905} y={410}>{'-->'}</Label>
        <Label x={140} y={130} color={HAIR_FAINT}>{'SAME WORD\nTWICE'}</Label>
        <Label x={1190} y={760}>{`LOCK 02  RING   X ${(rx / 1920).toFixed(3)}\nLOCK 04  FACE   X ${(bx / 1920).toFixed(3)}`}</Label>
        <div style={{ position: 'absolute', left: 1760, top: 200, width: 44, height: 220, background: PAPER }} />
      </div>
    );
  }

  if (variant === 'strip') {
    // RUN arriving as a strip of its own future frames
    const frames = [0, 6, 12, 18].map((d) => CUTS[4] + d);
    return (
      <div style={{ ...full, background: INK }}>
        <Lines d="M0 140.5H700.5V1080M1300.5 0V520.5H1920" />
        {frames.map((f, i) => (
          <div key={f}>
            <Tile src={f} kind="d8" x={840} y={120 + i * 215} />
            <Label x={1110} y={120 + i * 215}>{`F ${f4(f)}`}</Label>
          </div>
        ))}
        <Label x={1110} y={206} color={PAPER}>[{word}]</Label>
        <Label x={420} y={620} color={HAIR_FAINT}>{'04 --> 05'}</Label>
        <Target x={1480} y={640} s={120} />
        <div style={{ position: 'absolute', left: 1500, top: 180, width: 300, height: 56, background: PAPER }} />
      </div>
    );
  }

  // tile: one frame found in the dark
  return (
    <div style={{ ...full, background: INK }}>
      <Lines d="M140.5 0V640.5H760.5M1180.5 1080V380.5H1920" />
      <Tile src={src} x={300} y={250} />
      <Target x={300 + bx / 4 - 40} y={250 + by / 4 - 40} s={80} />
      <Label x={300} y={200} color={HAIR_FAINT}>SUBJECT</Label>
      <Label x={820} y={372} color={PAPER}>[{word}]</Label>
      <Label x={820} y={400} color={HAIR_FAINT}>{`F ${f4(src)}  ${String(k + 1).padStart(2, '0')}/08`}</Label>
      <Target x={1330} y={600} s={150} />
      <XBox x={1540} y={130} s={130} />
      <div style={{ position: 'absolute', left: 1720, top: 600, width: 60, height: 280, background: PAPER }} />
      <Label x={1330} y={800} color={HAIR_FAINT}>{`LOCK ${String(k + 1).padStart(2, '0')}\nX ${(bx / 1920).toFixed(3)}\nY ${(by / 1080).toFixed(3)}`}</Label>
    </div>
  );
};
