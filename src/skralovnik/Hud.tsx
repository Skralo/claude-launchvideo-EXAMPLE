// Frame furniture that stays: registration crosses, the brand line, the chapter (in the website's
// caption style) and the website's hairline progress along the bottom edge. v2 keeps half of v1's
// furniture; the timecode, frame counter, second brand line and barcode are gone.
import { CHAPTERS, FOOT_END, PRE, shotAt, shotStart, TOTAL } from './timeline';
import { PAPER, PIXEL, SERIF } from './tokens';

const SHADOW = '0 1px 6px rgba(5,6,7,0.7)';
const DIM = 'rgba(244,241,234,0.6)';

const Cross: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <svg style={{ position: 'absolute', left: x - 9, top: y - 9, filter: 'drop-shadow(0 0 2px rgba(5,6,7,0.6))' }} width={18} height={18} shapeRendering="crispEdges">
    <path d="M9.5 0V18M0 9.5H18" stroke={PAPER} strokeWidth={1} />
  </svg>
);

const Px: React.FC<{ x: number; y: number; c: string; children: React.ReactNode }> = ({ x, y, c, children }) => (
  <div style={{ position: 'absolute', left: x, top: y, fontFamily: PIXEL, fontSize: 16, lineHeight: '20px', letterSpacing: 1, color: c, whiteSpace: 'pre', textShadow: SHADOW }}>
    {children}
  </div>
);

export const Hud: React.FC<{ o: number }> = ({ o }) => {
  const k = shotAt(o);
  const inBoot = o < PRE;
  const outro = o >= FOOT_END;
  const brand = 'SKRALOVNIK';
  const typed = inBoot ? brand.slice(0, [3, 6, 8, 10, 10, 10][o]) : brand;

  // chapter word types on after each cut, two letters per frame, with a block cursor
  let chapter: React.ReactNode = null;
  if (k >= 0 && k < 8) {
    const word = CHAPTERS[k].toUpperCase();
    const n = Math.min(word.length, (o - shotStart(k)) * 2 + 2);
    chapter = (
      <>
        <Px x={72} y={978} c={DIM}>{`${String(k + 1).padStart(2, '0')} / 08`}</Px>
        <div style={{ position: 'absolute', left: 72, top: 1008, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 30, height: 1, background: PAPER, boxShadow: '0 1px 4px rgba(5,6,7,0.6)' }} />
          <div style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 25, lineHeight: 1, letterSpacing: '0.32em', color: PAPER, textShadow: '0 1px 8px rgba(5,6,7,0.75)' }}>
            {word.slice(0, n)}
            {n < word.length && <span style={{ display: 'inline-block', width: 12, height: 18, background: PAPER, marginLeft: 4 }} />}
          </div>
        </div>
      </>
    );
  }

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {!inBoot && !outro && (
        // a light scrim, only where the type sits, so it reads on bright shots
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(5,6,7,0.22) 0%, rgba(5,6,7,0) 10%, rgba(5,6,7,0) 84%, rgba(5,6,7,0.26) 100%)' }} />
      )}
      <Cross x={48} y={48} />
      <Cross x={1872} y={48} />
      <Cross x={48} y={1032} />
      <Cross x={1872} y={1032} />
      {!outro && <Px x={72} y={40} c={PAPER}>{typed}</Px>}
      {chapter}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, background: 'rgba(244,241,234,0.14)' }}>
        <div style={{ width: `${((o + 1) / TOTAL) * 100}%`, height: '100%', background: 'rgba(244,241,234,0.6)' }} />
      </div>
    </div>
  );
};
