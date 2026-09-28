// The SKRALOVNIK film, v3: the day in its own colour, analysed in bursts. The footage stays clean
// for most of every shot; the edit (scans, results, strips, flashes) arrives over it, in white.
// Base looks (Plate) take the frame; overlays draw on top in a fixed order; the HUD is last.
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Wipe } from './Chrome';
import { Fonts } from './Fonts';
import { Hud } from './Hud';
import { Outro } from './Outro';
import { Plate, Strips, SvgDefs } from './Plate';
import { Element, OrbitScan, Ring, Scan } from './Scan';
import { Boot, Contour, Strip } from './Textures';
import { eventsAt, FOOT_END, isBase, lookAt, OverLook } from './timeline';
import { INK } from './tokens';

const ORDER: OverLook[] = ['boot', 'strips', 'strip', 'ring', 'contour', 'scan', 'orbit', 'element', 'wipe'];

export const Film: React.FC = () => {
  const o = useCurrentFrame();
  const overlays = eventsAt(o)
    .map((e) => ({ e, l: lookAt(e, o) }))
    .filter((x): x is { e: typeof x.e; l: OverLook } => !isBase(x.l))
    .sort((a, b) => ORDER.indexOf(a.l) - ORDER.indexOf(b.l));
  return (
    <Fonts>
      <AbsoluteFill style={{ background: INK, overflow: 'hidden' }}>
        <SvgDefs />
        <Plate o={o} />
        {overlays.map(({ e, l }) => {
          switch (l) {
            case 'boot':
              return <Boot key={e.id} o={o} />;
            case 'strips':
              return <Strips key={e.id} o={o} />;
            case 'strip':
              return <Strip key={e.id} o={o} ev={e} />;
            case 'contour':
              return <Contour key={e.id} o={o} ev={e} />;
            case 'scan':
              return <Scan key={e.id} o={o} ev={e} />;
            case 'orbit':
              return <OrbitScan key={e.id} o={o} ev={e} />;
            case 'ring':
              return <Ring key={e.id} o={o} ev={e} />;
            case 'element':
              return <Element key={e.id} o={o} ev={e} />;
            case 'wipe':
              return <Wipe key={e.id} o={o} ev={e} />;
            default:
              return null;
          }
        })}
        {o >= FOOT_END && <Outro o={o} />}
        <Hud o={o} />
      </AbsoluteFill>
    </Fonts>
  );
};
