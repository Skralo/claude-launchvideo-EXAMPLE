// Chrome: the brand sparkle as a real 3D object (Three.js). The outline is symbol.svg's own path,
// inflated with a round profile so the arms carry long specular lines, and reflected in a
// procedural studio (black sky, white softboxes, a hard horizon, a teal floor glow from the
// symbol's colour). An orthographic camera keeps 1 unit = 1 px, so sparkles are placed in
// screen pixels.
import { ThreeCanvas } from '@remotion/three';
import * as THREE from 'three';
import { Ev, H, W } from './timeline';
import { INK } from './tokens';
import { boxAt } from './track';

const SEG: number[][][] = [
  [[0, -10], [0.6, -2.2], [2.2, -0.6], [10, 0]],
  [[10, 0], [2.2, 0.6], [0.6, 2.2], [0, 10]],
  [[0, 10], [-0.6, 2.2], [-2.2, 0.6], [-10, 0]],
  [[-10, 0], [-2.2, -0.6], [-0.6, -2.2], [0, -10]],
];

const bez = (p: number[][], t: number): [number, number] => {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return [a * p[0][0] + b * p[1][0] + c * p[2][0] + d * p[3][0], a * p[0][1] + b * p[1][1] + c * p[2][1] + d * p[3][1]];
};

function sparkleGeometry(height = 2.5, rings = 44, perSide = 80) {
  const ol: [number, number][] = [];
  for (const s of SEG) for (let i = 0; i < perSide; i++) ol.push(bez(s, (1 - Math.cos((Math.PI * i) / perSide)) / 2));
  const M = ol.length;
  const pos: number[] = [];
  const idx: number[] = [];
  for (const side of [1, -1]) {
    const base = pos.length / 3;
    for (let r = 0; r < rings; r++) {
      const s = 1 - r / rings; // 1 at the outline
      const z = side * height * Math.sqrt(Math.max(0, 1 - s * s));
      for (let j = 0; j < M; j++) pos.push(ol[j][0] * s, ol[j][1] * s, z);
    }
    const centre = pos.length / 3;
    pos.push(0, 0, side * height);
    for (let r = 0; r < rings - 1; r++) {
      for (let j = 0; j < M; j++) {
        const a = base + r * M + j;
        const b = base + r * M + ((j + 1) % M);
        const c = base + (r + 1) * M + j;
        const d = base + (r + 1) * M + ((j + 1) % M);
        if (side === 1) idx.push(a, b, d, a, d, c);
        else idx.push(a, d, b, a, c, d);
      }
    }
    const last = base + (rings - 1) * M;
    for (let j = 0; j < M; j++) {
      const a = last + j;
      const b = last + ((j + 1) % M);
      if (side === 1) idx.push(a, b, centre);
      else idx.push(a, centre, b);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function studio() {
  const c = document.createElement('canvas');
  c.width = 2048;
  c.height = 1024;
  const g = c.getContext('2d')!;
  const sky = g.createLinearGradient(0, 0, 0, 1024);
  sky.addColorStop(0.0, '#08090a');
  sky.addColorStop(0.3, '#262b2e');
  sky.addColorStop(0.46, '#8e989d');
  sky.addColorStop(0.492, '#ffffff');
  sky.addColorStop(0.505, '#15181a');
  sky.addColorStop(0.72, '#0a151a');
  sky.addColorStop(1.0, '#020304');
  g.fillStyle = sky;
  g.fillRect(0, 0, 2048, 1024);
  g.fillStyle = '#ffffff';
  g.fillRect(360, 160, 360, 210);
  g.fillRect(1236, 80, 70, 400);
  g.fillRect(1420, 110, 34, 360);
  g.fillStyle = '#e3eaed';
  g.fillRect(1740, 250, 240, 96);
  g.fillStyle = '#c9d2d6';
  g.fillRect(30, 290, 130, 64);
  g.fillStyle = '#737e84';
  g.fillRect(0, 588, 2048, 7);
  const teal = g.createRadialGradient(1010, 770, 10, 1010, 770, 280);
  teal.addColorStop(0, 'rgba(46,128,148,0.95)');
  teal.addColorStop(1, 'rgba(0,32,45,0)');
  g.fillStyle = teal;
  g.fillRect(700, 480, 640, 544);
  const t = new THREE.CanvasTexture(c);
  t.mapping = THREE.EquirectangularReflectionMapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

let cache: { geo: THREE.BufferGeometry; mat: THREE.MeshStandardMaterial } | null = null;
const chrome = () => {
  if (!cache) {
    cache = {
      geo: sparkleGeometry(),
      mat: new THREE.MeshStandardMaterial({ color: '#eef3f5', metalness: 1, roughness: 0.13, envMap: studio(), envMapIntensity: 1.15 }),
    };
  }
  return cache;
};

export type Spark = { x: number; y: number; size: number; rx?: number; ry?: number; rz?: number; sx?: number; sy?: number };

/** Sparkles in screen pixels; size is tip to tip. glow adds the reference's soft bloom. */
export const ChromeStage: React.FC<{ items: Spark[]; glow?: number }> = ({ items, glow = 1 }) => {
  const { geo, mat } = chrome();
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        filter:
          glow > 0
            ? `drop-shadow(0 0 ${10 * glow}px rgba(244,241,234,${0.42 * glow})) drop-shadow(0 0 ${42 * glow}px rgba(150,200,215,${0.26 * glow}))`
            : undefined,
      }}
    >
      <ThreeCanvas width={W} height={H} orthographic camera={{ position: [0, 0, 3000], near: 1, far: 9000, zoom: 1 }} flat gl={{ antialias: true, alpha: true }}>
        {items.map((s, i) => (
          <mesh
            key={i}
            geometry={geo}
            material={mat}
            position={[s.x - W / 2, H / 2 - s.y, 0]}
            rotation={[s.rx ?? 0, s.ry ?? 0, s.rz ?? 0]}
            scale={[(s.size / 20) * (s.sx ?? 1), (s.size / 20) * (s.sy ?? 1), s.size / 20]}
          />
        ))}
      </ThreeCanvas>
    </div>
  );
};

/** Transition: a sparkle leaves the outgoing subject, swells through the lens, lands on the next. */
export const Wipe: React.FC<{ o: number; ev: Ev }> = ({ o, ev }) => {
  const i = o - ev.o;
  const hit = ev.hit ?? ev.o;
  const [ax, ay] = boxAt(hit - 1);
  const [bx, by] = boxAt(hit);
  const steps: Spark[] = [
    { x: ax, y: ay, size: 380, rz: 0.25, rx: 0.35, ry: -0.25 },
    { x: (ax + 960) / 2, y: (ay + 540) / 2, size: 2300, rz: 0.55, rx: 0.18, ry: -0.12 },
    { x: 960, y: 540, size: 8400, rz: Math.PI / 4, rx: 0.06, ry: 0.05 },
    { x: bx, y: by, size: 250, rz: 1.25, rx: -0.35, ry: 0.45 },
  ];
  return <ChromeStage items={[steps[Math.min(i, 3)]]} glow={i === 2 ? 0 : 1} />;
};

/** Micro-cut: one full frame of chrome on black. */
export const ChromeFrame: React.FC<{ o: number }> = () => (
  <div style={{ position: 'absolute', inset: 0, background: INK }}>
    <ChromeStage items={[{ x: 960, y: 540, size: 860, rx: 0.3, ry: -0.38, rz: 0.22 }]} glow={1.4} />
  </div>
);
