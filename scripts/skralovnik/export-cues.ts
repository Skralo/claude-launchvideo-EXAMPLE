// Exports every visual event of the SKRALOVNIK film to out/skralovnik/cues.json for the sound
// design. The picture and the sound read the same EVENTS list, so each sound lands on the frame
// of the event it belongs to. Pan follows where the event happens on screen.
// Run: npx tsx scripts/skralovnik/export-cues.ts
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { CHAPTERS, EVENTS, FPS, srcAt, TOTAL, W } from '../../src/skralovnik/timeline';

const track = JSON.parse(readFileSync('public/skralovnik/track.json', 'utf8')) as {
  frames: { box: [number, number, number, number] }[];
};

const panOf = (x: number) => +Math.max(-0.7, Math.min(0.7, ((x - W / 2) / (W / 2)) * 0.7)).toFixed(2);

const cues = EVENTS.map((e) => {
  const hit = e.hit ?? e.o;
  const onSubject = e.look === 'scan' || e.look === 'element';
  const x = onSubject ? track.frames[srcAt(hit)].box[0] : W / 2;
  return {
    id: e.id,
    fn: e.fn,
    frame: hit,
    t: +(hit / FPS).toFixed(4),
    dur: e.dur,
    durS: +(e.dur / FPS).toFixed(4),
    shot: e.shot,
    chapter: e.shot >= 0 && e.shot < 8 ? CHAPTERS[e.shot] : e.shot < 0 ? 'Boot' : 'Outro',
    look: Array.isArray(e.look) ? e.look.join('+') : e.look,
    pan: panOf(x),
    note: e.note,
  };
}).sort((a, b) => a.frame - b.frame);

mkdirSync('out/skralovnik', { recursive: true });
writeFileSync('out/skralovnik/cues.json', JSON.stringify({ fps: FPS, total: TOTAL, cues }, null, 1));
const byFn = cues.reduce<Record<string, number>>((m, c) => ((m[c.fn] = (m[c.fn] ?? 0) + 1), m), {});
console.log('wrote out/skralovnik/cues.json:', cues.length, 'cues', JSON.stringify(byFn));
