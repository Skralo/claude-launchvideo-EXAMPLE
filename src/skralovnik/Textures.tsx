// Texture movement: things that travel across a shot. Every one is stepped (one position per
// frame, no in-betweens), which is what makes it read as a machine and not as a transition.
import { Img } from 'remotion';
import { Dither, full } from './Bits';
import { FlatSparkle } from './Sparkle';
import { Label } from './Sys';
import { CUTS, Ev, H, shotAt, srcAt, W } from './timeline';
import { HAIR, INK, PAPER, plate } from './tokens';
import { boxAt, contourAt } from './track';

/** A band of 1-bit image sweeping across the frame. */
export const Band: React.FC<{ o: number; ev: Ev; vertical?: boolean }> = ({ o, ev, vertical }) => {
  const i = o - ev.o;
  const n = ev.dur;
  const size = vertical ? 300 : 200;
  const span = (vertical ? W : H) + size;
  let pos = -size + (span * (i + 0.5)) / n;
  if (ev.p?.up) pos = (vertical ? W : H) - pos - size;
  pos = Math.round(pos);
  const src = srcAt(o);
  const clip: React.CSSProperties = vertical
    ? { position: 'absolute', left: pos, top: 0, width: size, height: H, overflow: 'hidden' }
    : { position: 'absolute', left: 0, top: pos, width: W, height: size, overflow: 'hidden' };
  return (
    <>
      <div style={clip}>
        <div style={{ position: 'absolute', left: vertical ? -pos : 0, top: vertical ? 0 : -pos, width: W, height: H, background: INK }}>
          <Dither src={src} />
        </div>
      </div>
      {vertical ? (
        <>
          <div style={{ position: 'absolute', left: pos, top: 0, width: 1, height: H, background: HAIR }} />
          <div style={{ position: 'absolute', left: pos + size, top: 0, width: 1, height: H, background: HAIR }} />
          <Label x={pos + size + 10} y={150}>{`SCAN ${i + 1}/${n}`}</Label>
        </>
      ) : (
        <>
          <div style={{ position: 'absolute', left: 0, top: pos, width: W, height: 1, background: HAIR }} />
          <div style={{ position: 'absolute', left: 0, top: pos + size, width: W, height: 1, background: HAIR }} />
          <Label x={1848} y={pos + size + 10} align="right">{`SCAN ${i + 1}/${n}`}</Label>
        </>
      )}
    </>
  );
};

/** A film strip of the shot's last frames rolling up a black panel on the right. */
export const Strip: React.FC<{ o: number; ev: Ev }> = ({ o, ev }) => {
  const i = o - ev.o;
  const src = srcAt(o);
  const k = shotAt(o);
  const first = CUTS[k];
  const pitch = 135 + 26;
  const shift = Math.round((i / ev.dur) * pitch * 2);
  const frames = [-15, -12, -9, -6, -3, 0, 3].map((d) => Math.max(first, src + d));
  return (
    <>
      <div style={{ position: 'absolute', left: 1560, top: 0, width: 360, height: H, background: INK }} />
      <div style={{ position: 'absolute', left: 1560, top: 0, width: 1, height: H, background: HAIR }} />
      <div style={{ position: 'absolute', left: 1560, top: 0, width: 360, height: H, overflow: 'hidden' }}>
        {frames.map((f, j) => {
          const y = 60 + j * pitch - shift;
          return (
            <div key={j}>
              <Dither src={f} kind="d8" x={40} y={y} scale={1} />
              <div style={{ position: 'absolute', left: 32, top: y - 8, width: 256, height: 151, border: `1px solid ${HAIR}` }} />
              <Label x={40} y={y + 143}>{`F ${String(f).padStart(4, '0')}`}</Label>
            </div>
          );
        })}
      </div>
    </>
  );
};

/** The stride pulled into horizontal streaks behind the runner. */
export const Smear: React.FC<{ o: number; ev: Ev }> = ({ o, ev }) => {
  const i = o - ev.o;
  const [cx, cy, w, h] = boxAt(o);
  const x0 = Math.round(cx - w * 0.15);
  const y0 = Math.round(cy + h * 0.35);
  const y1 = Math.round(Math.min(1060, cy + h * 3.6));
  const k = [2, 5, 10, 18, 28, 40][i] ?? 40;
  const src = srcAt(o);
  return (
    <>
      <div style={{ position: 'absolute', left: 0, top: y0, width: x0, height: y1 - y0, overflow: 'hidden' }}>
        <Img
          src={plate('bw', src)}
          style={{ ...full, top: -y0, transformOrigin: `${x0}px 0px`, transform: `scaleX(${k})` }}
        />
      </div>
      <div style={{ position: 'absolute', left: 0, top: y0, width: x0, height: 1, background: HAIR }} />
      <div style={{ position: 'absolute', left: 0, top: y1, width: x0, height: 1, background: HAIR }} />
      <Label x={96} y={y0 - 28}>{`STRETCH x${k}`}</Label>
    </>
  );
};

/** The subject's silhouette tracing itself (segmentation contour from track.json). */
export const Contour: React.FC<{ o: number; ev: Ev }> = ({ o, ev }) => {
  const i = o - ev.o;
  const t = Math.min(1, (i + 1) / (ev.dur - 1));
  const cs = contourAt(o);
  const pts = cs.reduce((n, c) => n + c.length / 2, 0);
  const first = cs[0];
  return (
    <>
      <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }}>
        {cs.map((c, j) => {
          const d = c.reduce((s, v, q) => s + (q % 2 === 0 ? `${q === 0 ? 'M' : 'L'}${v} ` : `${v} `), '') + 'Z';
          const marks: React.ReactNode[] = [];
          const every = Math.max(1, Math.floor(c.length / 2 / 14));
          for (let q = 0; q < c.length / 2; q += every) {
            if (q / (c.length / 2) > t) break;
            marks.push(<rect key={q} x={c[2 * q] - 3.5} y={c[2 * q + 1] - 3.5} width={7} height={7} fill="none" stroke={PAPER} strokeWidth={1.2} />);
          }
          return (
            <g key={j}>
              <path d={d} fill="none" stroke={PAPER} strokeWidth={2.2} pathLength={1} strokeDasharray={`${t} 1`} strokeLinejoin="round" />
              {marks}
            </g>
          );
        })}
      </svg>
      {first && <Label x={Math.min(1560, first[0] + 26)} y={Math.max(110, first[1] - 40)}>{`[CONTOUR] ${pts} PTS`}</Label>}
    </>
  );
};

/** A wireframe globe turning inside the pendant lamp (the lamp is a ribbed sphere already). */
export const Globe: React.FC<{ o: number; ev: Ev }> = ({ o, ev }) => {
  const i = o - ev.o;
  const cx = 1208;
  const cy = 492;
  const rx = 162;
  const ry = 154;
  const phase = i * 0.21;
  const meridians = Math.min(8, 2 + i * 2);
  const paths: string[] = [];
  for (let m = 0; m < meridians; m++) {
    const a = phase + (m * Math.PI) / 8;
    const w = Math.abs(Math.cos(a)) * rx;
    paths.push(`M${cx} ${cy - ry}A${w} ${ry} 0 0 ${Math.cos(a) > 0 ? 1 : 0} ${cx} ${cy + ry}`);
  }
  const lats = i >= 1 ? [-60, -30, 0, 30, 60] : [0];
  for (const lat of lats) {
    const y = cy - ry * Math.sin((lat * Math.PI) / 180);
    const w = rx * Math.cos((lat * Math.PI) / 180);
    paths.push(`M${cx - w} ${y}A${w} ${w * 0.16} 0 0 0 ${cx + w} ${y}`);
  }
  return (
    <>
      <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }}>
        <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke={PAPER} strokeWidth={2} />
        <path d={paths.join('')} fill="none" stroke={PAPER} strokeWidth={1.4} />
        <path d={`M${cx - rx - 70} ${cy}H${cx - rx - 14}M${cx + rx + 14} ${cy}H${cx + rx + 70}M${cx} ${cy + ry + 14}V${cy + ry + 60}`} stroke={PAPER} strokeWidth={1} />
      </svg>
      <FlatSparkle x={cx} y={cy - ry - 36} size={20} color={PAPER} />
      <Label x={cx + rx + 26} y={cy - 30}>{`[TEAM] 02\nGLOBE ${((phase * 57.3) % 360).toFixed(0).padStart(3, '0')}°`}</Label>
    </>
  );
};

/** The IG reference's solid paper block, knocking a shot into place. */
export const Block: React.FC = () => (
  <>
    <div style={{ position: 'absolute', left: 1330, top: 150, width: 380, height: 700, background: PAPER }} />
    <div style={{ position: 'absolute', left: 1300, top: 120, width: 440, height: 760, border: `1px solid ${HAIR}` }} />
  </>
);

/** Boot: hairlines draw in from the corners around a single glint. */
export const Boot: React.FC<{ o: number }> = ({ o }) => {
  const t = [0.3, 0.62, 1, 1][o] ?? 1;
  return (
    <>
      <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }} shapeRendering="crispEdges">
        <path
          d={`M140.5 0V${Math.round(640 * t)}.5M140.5 640.5H${Math.round(140 + 620 * Math.max(0, t * 2 - 1))}.5M1780.5 1080V${Math.round(1080 - 700 * t)}.5M1780.5 380.5H${Math.round(1780 - 600 * Math.max(0, t * 2 - 1))}.5`}
          stroke={HAIR}
          fill="none"
        />
      </svg>
      {o >= 2 && <FlatSparkle x={960} y={540} size={o === 2 ? 64 : 22} color={PAPER} />}
      {o >= 3 && <Label x={990} y={532}>[BOOT]</Label>}
    </>
  );
};
