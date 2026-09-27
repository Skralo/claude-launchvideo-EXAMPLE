// The brand's sparkle (symbol.svg), unit radius 10, as a flat SVG shape.
export const SPARKLE_D = 'M0-10C.6-2.2 2.2-.6 10 0 2.2.6.6 2.2 0 10-.6 2.2-2.2.6-10 0-2.2-.6-.6-2.2 0-10Z';

export const FlatSparkle: React.FC<{ x: number; y: number; size: number; color: string; rot?: number; opacity?: number }> = ({
  x,
  y,
  size,
  color,
  rot = 0,
  opacity = 1,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="-10 -10 20 20"
    style={{ position: 'absolute', left: x - size / 2, top: y - size / 2, overflow: 'visible', opacity }}
  >
    <path d={SPARKLE_D} fill={color} transform={`rotate(${rot})`} />
  </svg>
);
