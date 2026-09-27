import '@fontsource/silkscreen/400.css';
import '@fontsource/silkscreen/700.css';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/600.css';
import { useEffect, useState } from 'react';
import { continueRender, delayRender } from 'remotion';

/** Holds the frame until the pixel face and the brand serif are decoded. */
export const Fonts: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [handle] = useState(() => delayRender('skralovnik fonts'));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    Promise.all([
      document.fonts.load('400 16px "Silkscreen"'),
      document.fonts.load('700 16px "Silkscreen"'),
      document.fonts.load('500 16px "Cormorant Garamond"'),
      document.fonts.load('600 16px "Cormorant Garamond"'),
    ])
      .then(() => document.fonts.ready)
      .then(() => {
        setReady(true);
        requestAnimationFrame(() => continueRender(handle));
      });
  }, [handle]);
  return ready ? <>{children}</> : null;
};
