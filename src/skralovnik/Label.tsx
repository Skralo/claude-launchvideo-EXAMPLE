// Pixel-type label: the IG reference's small uppercase captions.
import { HAIR, PIXEL } from './tokens';

export const Label: React.FC<{
  x: number;
  y: number;
  children: React.ReactNode;
  color?: string;
  size?: number;
  align?: 'left' | 'right';
  shadow?: string;
}> = ({ x, y, children, color = HAIR, size = 16, align = 'left', shadow }) => (
  <div
    style={{
      position: 'absolute',
      left: align === 'left' ? x : undefined,
      right: align === 'right' ? 1920 - x : undefined,
      top: y,
      fontFamily: PIXEL,
      fontSize: size,
      lineHeight: '20px',
      letterSpacing: 1,
      color,
      whiteSpace: 'pre',
      textShadow: shadow,
    }}
  >
    {children}
  </div>
);
