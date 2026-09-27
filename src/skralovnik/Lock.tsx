// Object lock: corner brackets fly in from the frame edge in three stepped frames, overshoot on
// the lock frame, follow the subject (track.json), then blink out before the next cut.
import { FlatSparkle } from './Sparkle';
import { baseAt, CHAPTERS, Ev, H, W } from './timeline';
import { clamp, lerp, PAPER, PIXEL } from './tokens';
import { boxAt } from './track';

const SHOWN_ON = new Set(['bw', 'col', 'neg', 'dit', 'slice']);
const ACQUIRE: Record<number, number> = { [-3]: 0, [-2]: 0.5, [-1]: 0.84 };

export const Lock: React.FC<{ o: number; ev: Ev }> = ({ o, ev }) => {
  const rel = o - ev.o;
  if (!SHOWN_ON.has(baseAt(o).look)) return null;
  if (rel === ev.dur - 2) return null; // release blink: on, off, on, gone
  const [tx, ty, tw, th] = boxAt(o);
  const t = rel < 0 ? ACQUIRE[rel] : 1;
  const cx = lerp(960, tx, t);
  const cy = lerp(540, ty, t);
  const pop = rel === 0 ? 1.08 : 1;
  const w = lerp(1780, tw, t) * pop;
  const h = lerp(940, th, t) * pop;
  const L = clamp(Math.min(w, h) * 0.22, 16, 54);
  const x0 = cx - w / 2;
  const x1 = cx + w / 2;
  const y0 = cy - h / 2;
  const y1 = cy + h / 2;
  const d = `M${x0} ${y0 + L}V${y0}H${x0 + L}M${x1 - L} ${y0}H${x1}V${y0 + L}M${x1} ${y1 - L}V${y1}H${x1 - L}M${x0 + L} ${y1}H${x0}V${y1 - L}`;
  const k = ev.shot;
  const locked = rel >= 0;
  const r = Math.min(430, 0.5 * Math.hypot(w, h) + 24);
  const ticks: string[] = [];
  if (ev.p?.ring && locked) {
    const spin = rel * 1.4;
    for (let a = 0; a < 360; a += 6) {
      const long = a % 30 === 0;
      const rad = ((a + spin) * Math.PI) / 180;
      const r0 = r + (long ? 0 : 4);
      const r1 = r + (long ? 16 : 9);
      ticks.push(`M${cx + Math.cos(rad) * r0} ${cy + Math.sin(rad) * r0}L${cx + Math.cos(rad) * r1} ${cy + Math.sin(rad) * r1}`);
    }
  }
  const lx = clamp(x0, 72, W - 72 - 330);
  const above = y0 - 56 > 96;
  const ly = above ? y0 - 50 : Math.min(y1 + 14, H - 150);
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }}>
        <path d={d} fill="none" stroke={PAPER} strokeWidth={rel === 0 ? 3.5 : 2} strokeLinecap="square" />
        {locked && <path d={`M${cx} ${cy - 9}V${cy + 9}M${cx - 9} ${cy}H${cx + 9}`} stroke={PAPER} strokeWidth={1.5} />}
        {ticks.length > 0 && (
          <>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(244,241,234,0.55)" strokeWidth={1} />
            <path d={ticks.join('')} stroke="rgba(244,241,234,0.75)" strokeWidth={1.2} />
          </>
        )}
      </svg>
      {locked && (
        <>
          <FlatSparkle x={lx + 9} y={ly + 9} size={rel === 0 ? 30 : 18} color={PAPER} />
          <div
            style={{
              position: 'absolute',
              left: lx + 26,
              top: ly,
              fontFamily: PIXEL,
              fontSize: 16,
              lineHeight: '20px',
              letterSpacing: 1,
              color: PAPER,
              whiteSpace: 'pre',
              textShadow: '0 0 6px rgba(0,0,0,0.6)',
            }}
          >
            {`[LOCK ${String(k + 1).padStart(2, '0')}] ${CHAPTERS[k].toUpperCase()}\nX ${(tx / W).toFixed(3)}  Y ${(ty / H).toFixed(3)}`}
          </div>
        </>
      )}
    </div>
  );
};
