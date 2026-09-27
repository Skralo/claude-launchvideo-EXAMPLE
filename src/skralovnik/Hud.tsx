// Frame furniture: registration crosses, brand line, timecode, the chapter (in the website's
// caption style), a barcode and the website's hairline progress along the bottom edge.
import { baseAt, CHAPTERS, FOOT_END, PRE, shotAt, shotStart, TOTAL } from './timeline';
import { INK, PAPER, PIXEL, rnd, SERIF, timecode } from './tokens';

const Cross: React.FC<{ x: number; y: number; c: string }> = ({ x, y, c }) => (
  <svg style={{ position: 'absolute', left: x - 9, top: y - 9 }} width={18} height={18} shapeRendering="crispEdges">
    <path d="M9.5 0V18M0 9.5H18" stroke={c} strokeWidth={1} />
  </svg>
);

const Barcode: React.FC<{ x: number; y: number; c: string }> = ({ x, y, c }) => {
  const bars: React.ReactNode[] = [];
  let cx = 0;
  for (let i = 0; cx < 118; i++) {
    const w = 1 + Math.floor(rnd(i, 7) * 3);
    if (rnd(i, 9) > 0.35) bars.push(<rect key={i} x={cx} y={0} width={w} height={16} fill={c} />);
    cx += w + 1 + Math.floor(rnd(i, 11) * 2);
  }
  return (
    <svg style={{ position: 'absolute', left: x, top: y }} width={120} height={16} shapeRendering="crispEdges">
      {bars}
    </svg>
  );
};

const Px: React.FC<{ x: number; y: number; c: string; right?: boolean; children: React.ReactNode }> = ({ x, y, c, right, children }) => (
  <div
    style={{
      position: 'absolute',
      left: right ? undefined : x,
      right: right ? 1920 - x : undefined,
      top: y,
      fontFamily: PIXEL,
      fontSize: 16,
      lineHeight: '20px',
      letterSpacing: 1,
      color: c,
      whiteSpace: 'pre',
      textAlign: right ? 'right' : 'left',
      textShadow: c === PAPER ? '0 1px 6px rgba(5,6,7,0.7)' : undefined,
    }}
  >
    {children}
  </div>
);

export const Hud: React.FC<{ o: number }> = ({ o }) => {
  const look = baseAt(o).look;
  const c = look === 'typeInv' ? INK : PAPER;
  const dim = look === 'typeInv' ? 'rgba(5,6,7,0.55)' : 'rgba(244,241,234,0.55)';
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
        <Px x={72} y={978} c={dim}>{`${String(k + 1).padStart(2, '0')} / 08`}</Px>
        <div style={{ position: 'absolute', left: 72, top: 1008, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 30, height: 1, background: c, boxShadow: c === PAPER ? '0 1px 4px rgba(5,6,7,0.6)' : undefined }} />
          <div style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 25, lineHeight: 1, letterSpacing: '0.32em', color: c, textShadow: c === PAPER ? '0 1px 8px rgba(5,6,7,0.75)' : undefined }}>
            {word.slice(0, n)}
            {n < word.length && <span style={{ display: 'inline-block', width: 12, height: 18, background: c, marginLeft: 4 }} />}
          </div>
        </div>
      </>
    );
  }

  const scrim = look !== 'typeInv' && look !== 'black' && look !== 'sys' && !outro && !inBoot;
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {scrim && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(180deg, rgba(5,6,7,0.34) 0%, rgba(5,6,7,0) 13%, rgba(5,6,7,0) 80%, rgba(5,6,7,0.38) 100%)',
          }}
        />
      )}
      <Cross x={48} y={48} c={c} />
      <Cross x={1872} y={48} c={c} />
      <Cross x={48} y={1032} c={c} />
      <Cross x={1872} y={1032} c={c} />
      {!outro && <Px x={72} y={40} c={c}>{typed}</Px>}
      {!outro && o >= 2 && <Px x={72} y={62} c={dim}>{'DAY.LOOP  30 FPS'}</Px>}
      {o >= 2 && (
        <Px x={1848} y={40} c={c} right>
          {`TC ${timecode(o)}`}
        </Px>
      )}
      {o >= 2 && (
        <Px x={1848} y={62} c={dim} right>
          {`F ${String(o).padStart(4, '0')} / ${TOTAL}`}
        </Px>
      )}
      {chapter}
      {!outro && o >= 3 && <Barcode x={1728} y={1004} c={c} />}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, background: 'rgba(244,241,234,0.14)' }}>
        <div style={{ width: `${((o + 1) / TOTAL) * 100}%`, height: '100%', background: 'rgba(244,241,234,0.6)' }} />
      </div>
    </div>
  );
};
