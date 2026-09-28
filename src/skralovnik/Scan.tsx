// The analysis: a circular scan in thin lines (Iron Man HUD, minimal) finds the subject, locks on
// its last frame, and the result flashes beside it for four frames: one of Anže's elements, as
// 1-bit, clean, clean, 1-bit. Lines and elements take the shot's tone: paper on the dark shots,
// ink on the bright ones, so they always read and stay black and white.
import { Img } from 'remotion';
import sizes from '../../public/skralovnik/elements/sizes.json';
import { Label } from './Label';
import { Ev, H, TONE, W } from './timeline';
import { clamp, elementFile, INK, PAPER } from './tokens';
import { boxAt } from './track';

const toneOf = (k: number) => {
  const paper = TONE[k] === 'paper';
  return {
    paper,
    c: paper ? PAPER : INK,
    glow: paper ? 'drop-shadow(0 0 3px rgba(5,6,7,0.65))' : 'drop-shadow(0 0 3px rgba(244,241,234,0.7))',
    text: paper ? '0 1px 5px rgba(5,6,7,0.75)' : '0 0 5px rgba(244,241,234,0.9)',
  };
};

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

export const Scan: React.FC<{ o: number; ev: Ev }> = ({ o, ev }) => {
  const i = o - ev.o;
  const n = ev.dur;
  const k = ev.shot;
  const t = toneOf(k);
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
  const [lx, ly] = pt(cx, cy, R + 18, -38);
  return (
    <div style={{ position: 'absolute', inset: 0, filter: t.glow }}>
      <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }}>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={t.c} strokeWidth={locked ? 3 : 1.4} pathLength={1} strokeDasharray={`${draw} 1`} transform={`rotate(-90 ${cx} ${cy})`} />
        {arcs.map((a, j) => (
          <path key={j} d={arc(cx, cy, R + 11, a, a + (locked ? 60 : 38))} fill="none" stroke={t.c} strokeWidth={locked ? 3 : 2} />
        ))}
        <path d={ticks.join('')} stroke={t.c} strokeWidth={1} />
        {!locked && i >= 1 && <path d={`M${cx} ${cy}L${pt(cx, cy, R - 12, sweep).join(' ')}`} stroke={t.c} strokeWidth={1} opacity={0.8} />}
        <path d={`M${cx} ${cy - 8}V${cy + 8}M${cx - 8} ${cy}H${cx + 8}`} stroke={t.c} strokeWidth={1.4} />
      </svg>
      <Label x={clamp(lx, 60, W - 260)} y={clamp(ly - 20, 80, H - 120)} color={t.c} shadow={t.text}>
        {`SCAN ${String(k + 1).padStart(2, '0')}\n${locked ? `LOCKED ${ev.p?.label ?? ''}` : `${pct}%`}`}
      </Label>
    </div>
  );
};

type Size = Record<string, [number, number]>;
const SIZES = sizes as unknown as Size;
const HEIGHT: Record<string, number> = { brain: 270, eagle: 310, cheetah: 250, figures: 330, eye: 540 };

export const Element: React.FC<{ o: number; ev: Ev }> = ({ o, ev }) => {
  const i = o - ev.o;
  const k = ev.shot;
  const t = toneOf(k);
  const name = String(ev.p?.el);
  const [cx, cy, w, h] = boxAt(o);
  const R = radius(w, h);
  const [sw, sh] = SIZES[name];
  const eh = HEIGHT[name] ?? 250;
  const ew = (eh * sw) / sh;
  const above = name === 'eye';
  const side = ev.p?.side !== undefined ? Number(ev.p.side) : cx < W / 2 ? 1 : -1;
  const ex = clamp(above ? cx - ew / 2 : side > 0 ? cx + R + 40 : cx - R - 40 - ew, 60, W - 60 - ew);
  const ey = clamp(above ? cy - R - eh + 30 : cy - eh / 2, 90, H - 110 - eh);
  // the eye's cut-out is dark on light as drawn; every other one is light on dark
  const lightAsDrawn = name !== 'eye';
  const clean = t.paper === lightAsDrawn ? '' : '-ink';
  const file = i === 0 || i === 3 ? `${name}${t.paper ? '-bit' : '-bit-ink'}` : `${name}${clean}`;
  // leader line from the scan circle to the element
  const ecx = ex + ew / 2;
  const ecy = ey + eh / 2;
  const deg = (Math.atan2(ecy - cy, ecx - cx) * 180) / Math.PI;
  const [x0, y0] = pt(cx, cy, R + 4, deg);
  const x1 = above ? ecx : side > 0 ? ex - 10 : ex + ew + 10;
  const y1 = above ? ey + eh + 8 : ecy;
  const c = 14;
  const corners = `M${ex - 8} ${ey - 8 + c}V${ey - 8}H${ex - 8 + c}M${ex + ew + 8 - c} ${ey - 8}H${ex + ew + 8}V${ey - 8 + c}M${ex + ew + 8} ${ey + eh + 8 - c}V${ey + eh + 8}H${ex + ew + 8 - c}M${ex - 8 + c} ${ey + eh + 8}H${ex - 8}V${ey + eh + 8 - c}`;
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div style={{ position: 'absolute', inset: 0, filter: t.glow }}>
        <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }}>
          <circle cx={cx} cy={cy} r={R} fill="none" stroke={t.c} strokeWidth={1} opacity={0.45} />
          <path d={`M${x0} ${y0}L${x1} ${y1}`} stroke={t.c} strokeWidth={1.2} />
          <path d={corners} fill="none" stroke={t.c} strokeWidth={1.4} />
        </svg>
      </div>
      <Img src={elementFile(file)} style={{ position: 'absolute', left: ex, top: ey, width: ew, height: eh, imageRendering: i === 0 || i === 3 ? 'pixelated' : undefined }} />
      {i >= 1 && (
        <Label x={ex - 8} y={ey + eh + 16} color={t.c} shadow={t.text}>
          {`${ev.p?.label}\nRESULT ${String(k + 1).padStart(2, '0')}`}
        </Label>
      )}
    </div>
  );
};
