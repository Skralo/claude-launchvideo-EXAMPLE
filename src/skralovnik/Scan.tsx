// The analysis: a circular scan in thin white lines (Iron Man HUD, minimal) finds the subject,
// locks on its last frame, and the result flashes beside it for four frames: one of Anže's
// elements, as 1-bit, clean, clean, 1-bit. Everything here is white; a soft dark glow keeps the
// lines and the elements legible on the bright shots.
// Also here: the orbital HUD used as the scan itself (Recover), and the word ring that turns
// around Anže, behind him (Build, notebook).
import { Img } from 'remotion';
import sizes from '../../public/skralovnik/elements/sizes.json';
import { Label } from './Label';
import { Ev, H, srcAt, W } from './timeline';
import { clamp, cutPlate, elementFile, PAPER } from './tokens';
import { boxAt } from './track';

const GLOW = 'drop-shadow(0 0 3px rgba(5,6,7,0.65))';
const EL_GLOW = 'drop-shadow(0 0 6px rgba(5,6,7,0.45))';
const TEXT = '0 1px 5px rgba(5,6,7,0.75)';

const radius = (w: number, h: number) => clamp(0.5 * Math.hypot(w, h) + 16, 70, 400);
const pt = (cx: number, cy: number, r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
};
const arc = (cx: number, cy: number, r: number, a0: number, a1: number) => {
  const [x0, y0] = pt(cx, cy, r, a0);
  const [x1, y1] = pt(cx, cy, r, a1);
  return `M${x0} ${y0}A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}`;
};

const ScanLabel: React.FC<{ cx: number; cy: number; r: number; k: number; text: string; deg?: number }> = ({ cx, cy, r, k, text, deg = -38 }) => {
  const [lx, ly] = pt(cx, cy, r + 18, deg);
  return (
    <Label x={clamp(lx, 60, W - 260)} y={clamp(ly - 20, 80, H - 120)} color={PAPER} shadow={TEXT}>
      {`SCAN ${String(k + 1).padStart(2, '0')}\n${text}`}
    </Label>
  );
};

export const Scan: React.FC<{ o: number; ev: Ev }> = ({ o, ev }) => {
  const i = o - ev.o;
  const n = ev.dur;
  const k = ev.shot;
  const [cx, cy, w, h] = boxAt(o);
  const R = radius(w, h);
  const locked = i === n - 1;
  const draw = Math.min(1, (i + 1) / 2);
  const sweep = -90 + (i / Math.max(1, n - 2)) * 330;
  const arcs = locked ? [30, 150, 270] : [20 + i * 26, 150 - i * 19, 262 + i * 33];
  const ticks: string[] = [];
  if (i >= 1) {
    for (let a = 0; a < 360; a += 15) {
      const [x0, y0] = pt(cx, cy, R - 9, a);
      const [x1, y1] = pt(cx, cy, R - 3, a);
      ticks.push(`M${x0} ${y0}L${x1} ${y1}`);
    }
  }
  const pct = Math.round(Math.min(100, ((i + 1) / n) * 100));
  return (
    <div style={{ position: 'absolute', inset: 0, filter: GLOW }}>
      <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }}>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={PAPER} strokeWidth={locked ? 3 : 1.4} pathLength={1} strokeDasharray={`${draw} 1`} transform={`rotate(-90 ${cx} ${cy})`} />
        {arcs.map((a, j) => (
          <path key={j} d={arc(cx, cy, R + 11, a, a + (locked ? 60 : 38))} fill="none" stroke={PAPER} strokeWidth={locked ? 3 : 2} />
        ))}
        <path d={ticks.join('')} stroke={PAPER} strokeWidth={1} />
        {!locked && i >= 1 && <path d={`M${cx} ${cy}L${pt(cx, cy, R - 12, sweep).join(' ')}`} stroke={PAPER} strokeWidth={1} opacity={0.8} />}
        <path d={`M${cx} ${cy - 8}V${cy + 8}M${cx - 8} ${cy}H${cx + 8}`} stroke={PAPER} strokeWidth={1.4} />
      </svg>
      <ScanLabel cx={cx} cy={cy} r={R} k={k} text={locked ? `LOCKED ${ev.p?.label ?? ''}` : `${pct}%`} />
    </div>
  );
};

type Size = Record<string, [number, number]>;
const SIZES = sizes as unknown as Size;

/** The orbital HUD (Anže's element) as the scan: it turns and settles around the subject, locks.
 *  Its concentric eye sits off the image centre (ORBIT_EYE), so the image is placed to put that
 *  eye on the focus point (p.fx, p.fy as fractions of the lock box from its centre). */
const ORBIT_EYE = [-0.16, 0.079]; // eye offset from the image centre, in image width / height
export const OrbitScan: React.FC<{ o: number; ev: Ev }> = ({ o, ev }) => {
  const i = o - ev.o;
  const n = ev.dur;
  const [cx, cy, w, h] = boxAt(o);
  const tx = cx + w * Number(ev.p?.fx ?? 0);
  const ty = cy + h * Number(ev.p?.fy ?? 0);
  const R = radius(w, h);
  const locked = i === n - 1;
  const [sw, sh] = SIZES.orbit;
  const d = clamp(R * 2.3, 460, 820);
  const scale = [0.82, 0.9, 0.95, 0.98, 1, 1][Math.min(i, 5)];
  const rot = -48 + i * 8;
  const ow = (d * sw) / sh;
  const a = (rot * Math.PI) / 180;
  const vx = ORBIT_EYE[0] * ow * scale;
  const vy = ORBIT_EYE[1] * d * scale;
  const ex = tx - (vx * Math.cos(a) - vy * Math.sin(a));
  const ey = ty - (vx * Math.sin(a) + vy * Math.cos(a));
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <Img
        src={elementFile(i === 0 ? 'orbit-bit' : 'orbit')}
        style={{
          position: 'absolute',
          left: ex - ow / 2,
          top: ey - d / 2,
          width: ow,
          height: d,
          transform: `rotate(${rot}deg) scale(${scale})`,
          filter: locked ? 'drop-shadow(0 0 5px rgba(5,6,7,0.7)) brightness(1.15)' : GLOW,
        }}
      />
      <ScanLabel cx={tx} cy={ty} r={d * 0.4} deg={18} k={ev.shot} text={locked ? `LOCKED ${ev.p?.label ?? ''}` : `${Math.round(((i + 1) / n) * 100)}%`} />
    </div>
  );
};

/** The word ring turns around Anže, behind him: ring first, then his cut-out over it. */
export const Ring: React.FC<{ o: number; ev: Ev }> = ({ o, ev }) => {
  const i = o - ev.o;
  const [cx, cy, , h] = boxAt(o);
  const d = 720;
  const ringCy = cy + h * 0.3;
  const bit = i === 0 || i === ev.dur - 1;
  return (
    <>
      <Img
        src={elementFile(bit ? 'words-bit' : 'words')}
        style={{ position: 'absolute', left: cx - d / 2, top: ringCy - d / 2, width: d, height: d, transform: `rotate(${i * 3.5}deg)`, filter: EL_GLOW, imageRendering: bit ? 'pixelated' : undefined }}
      />
      <Img src={cutPlate(srcAt(o))} style={{ position: 'absolute', left: 0, top: 0, width: W, height: H }} />
    </>
  );
};

const HEIGHT: Record<string, number> = { brain: 270, eagle: 310, tiger: 300, figures: 420, sword: 470, helmet: 330, logo: 250 };

export const Element: React.FC<{ o: number; ev: Ev }> = ({ o, ev }) => {
  const i = o - ev.o;
  const k = ev.shot;
  const name = String(ev.p?.el);
  const [cx, cy, w, h] = boxAt(o);
  const R = radius(w, h);
  const [sw, sh] = SIZES[name];
  const eh = HEIGHT[name] ?? 280;
  const ew = (eh * sw) / sh;
  const side = ev.p?.side !== undefined ? Number(ev.p.side) : cx < W / 2 ? 1 : -1;
  const ex = clamp(side > 0 ? cx + R + 40 : cx - R - 40 - ew, 60, W - 60 - ew);
  const ey = clamp(cy - eh / 2, 90, H - 110 - eh);
  const bit = i === 0 || i === 3;
  const file = bit ? `${name}-bit` : name;
  // leader line from the scan circle to the element
  const ecx = ex + ew / 2;
  const ecy = ey + eh / 2;
  const deg = (Math.atan2(ecy - cy, ecx - cx) * 180) / Math.PI;
  const [x0, y0] = pt(cx, cy, R + 4, deg);
  const x1 = side > 0 ? ex - 10 : ex + ew + 10;
  const c = 14;
  const corners = `M${ex - 8} ${ey - 8 + c}V${ey - 8}H${ex - 8 + c}M${ex + ew + 8 - c} ${ey - 8}H${ex + ew + 8}V${ey - 8 + c}M${ex + ew + 8} ${ey + eh + 8 - c}V${ey + eh + 8}H${ex + ew + 8 - c}M${ex - 8 + c} ${ey + eh + 8}H${ex - 8}V${ey + eh + 8 - c}`;
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div style={{ position: 'absolute', inset: 0, filter: GLOW }}>
        <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }}>
          <circle cx={cx} cy={cy} r={R} fill="none" stroke={PAPER} strokeWidth={1} opacity={0.45} />
          <path d={`M${x0} ${y0}L${x1} ${ecy}`} stroke={PAPER} strokeWidth={1.2} />
          <path d={corners} fill="none" stroke={PAPER} strokeWidth={1.4} />
        </svg>
      </div>
      <Img src={elementFile(file)} style={{ position: 'absolute', left: ex, top: ey, width: ew, height: eh, filter: EL_GLOW, imageRendering: bit ? 'pixelated' : undefined }} />
      {i >= 1 && (
        <Label x={ex - 8} y={ey + eh + 16} color={PAPER} shadow={TEXT}>
          {`${ev.p?.label}\nRESULT ${String(k + 1).padStart(2, '0')}`}
        </Label>
      )}
    </div>
  );
};
