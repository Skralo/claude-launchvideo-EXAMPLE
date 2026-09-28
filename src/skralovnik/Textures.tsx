// Texture movement: things that travel across a shot. Every one is stepped (one position per
// frame, no in-betweens), which is what makes it read as a machine and not as a transition.
import { Dither } from './Bits';
import { Label } from './Label';
import { FlatSparkle } from './Sparkle';
import { CUTS, Ev, H, shotAt, srcAt, W } from './timeline';
import { HAIR, INK, PAPER } from './tokens';
import { contourAt } from './track';

/** A film strip of the shot's last frames rolling up a black panel on the right. */
export const Strip: React.FC<{ o: number; ev: Ev }> = ({ o, ev }) => {
  const i = o - ev.o;
  const src = srcAt(o);
  const first = CUTS[shotAt(o)];
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

/** The subject's silhouette tracing itself (segmentation contour from track.json). */
export const Contour: React.FC<{ o: number; ev: Ev }> = ({ o, ev }) => {
  const i = o - ev.o;
  const t = Math.min(1, (i + 1) / (ev.dur - 1));
  const c = PAPER;
  const cs = contourAt(o);
  const pts = cs.reduce((n, p) => n + p.length / 2, 0);
  const first = cs[0];
  return (
    <div style={{ position: 'absolute', inset: 0, filter: 'drop-shadow(0 0 3px rgba(5,6,7,0.65))' }}>
      <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }}>
        {cs.map((p, j) => {
          const d = p.reduce((s, v, q) => s + (q % 2 === 0 ? `${q === 0 ? 'M' : 'L'}${v} ` : `${v} `), '') + 'Z';
          const marks: React.ReactNode[] = [];
          const every = Math.max(1, Math.floor(p.length / 2 / 14));
          for (let q = 0; q < p.length / 2; q += every) {
            if (q / (p.length / 2) > t) break;
            marks.push(<rect key={q} x={p[2 * q] - 3.5} y={p[2 * q + 1] - 3.5} width={7} height={7} fill="none" stroke={c} strokeWidth={1.2} />);
          }
          return (
            <g key={j}>
              <path d={d} fill="none" stroke={c} strokeWidth={2} pathLength={1} strokeDasharray={`${t} 1`} strokeLinejoin="round" />
              {marks}
            </g>
          );
        })}
      </svg>
      {first && <Label x={Math.min(1560, first[0] + 26)} y={Math.max(110, first[1] - 40)} color={c} shadow="0 1px 5px rgba(5,6,7,0.75)">{`[CONTOUR] ${pts} PTS`}</Label>}
    </div>
  );
};

/** Boot: hairlines draw in from the corners around a single glint. */
export const Boot: React.FC<{ o: number }> = ({ o }) => {
  const t = [0.25, 0.55, 0.85, 1, 1][o] ?? 1;
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
