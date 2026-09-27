import { Img } from 'remotion';
import { H, W } from './timeline';
import { PAPER, plate } from './tokens';

export const full: React.CSSProperties = { position: 'absolute', left: 0, top: 0, width: W, height: H };

export const Still: React.FC<{ kind?: 'bw' | 'col'; src: number; style?: React.CSSProperties }> = ({ kind = 'bw', src, style }) => (
  <Img src={plate(kind, src)} style={{ ...full, ...style }} />
);

/** A 1-bit frame, paper on ink, scaled by whole pixels so every dither dot stays square. */
export const Dither: React.FC<{
  src: number;
  kind?: 'd4' | 'd8';
  x?: number;
  y?: number;
  scale?: number;
  style?: React.CSSProperties;
}> = ({ src, kind = 'd4', x = 0, y = 0, scale = kind === 'd4' ? 4 : 1, style }) => {
  const w = (kind === 'd4' ? 480 : 240) * scale;
  const h = (kind === 'd4' ? 270 : 135) * scale;
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, isolation: 'isolate', overflow: 'hidden', ...style }}>
      <Img src={plate(kind, src)} style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, imageRendering: 'pixelated' }} />
      <div style={{ position: 'absolute', inset: 0, background: PAPER, mixBlendMode: 'multiply' }} />
    </div>
  );
};

