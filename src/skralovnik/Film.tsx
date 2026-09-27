// The SKRALOVNIK film: the day as a system scanned by a chrome instrument.
// Base looks (Plate) replace the frame; overlays draw on top in a fixed order; the HUD is last.
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Wipe } from './Chrome';
import { Fonts } from './Fonts';
import { Hud } from './Hud';
import { Lock } from './Lock';
import { Outro } from './Outro';
import { Plate, SvgDefs } from './Plate';
import { Band, Block, Boot, Contour, Globe, Smear, Strip } from './Textures';
import { eventsAt, FOOT_END, isBase, lookAt, OverLook } from './timeline';
import { INK } from './tokens';

const ORDER: OverLook[] = ['boot', 'band', 'bandV', 'strip', 'smear', 'contour', 'globe', 'block', 'lock', 'wipe'];

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
            case 'band':
              return <Band key={e.id} o={o} ev={e} />;
            case 'bandV':
              return <Band key={e.id} o={o} ev={e} vertical />;
            case 'strip':
              return <Strip key={e.id} o={o} ev={e} />;
            case 'smear':
              return <Smear key={e.id} o={o} ev={e} />;
            case 'contour':
              return <Contour key={e.id} o={o} ev={e} />;
            case 'globe':
              return <Globe key={e.id} o={o} ev={e} />;
            case 'block':
              return <Block key={e.id} />;
            case 'lock':
              return <Lock key={e.id} o={o} ev={e} />;
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
