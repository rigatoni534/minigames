// Map definitions.
//
// Coordinates are authored in metres on a 2D grid (x right, y up) and every
// map is normalised at load time so its path length matches the advertised
// length, keeping tower ranges and enemy speeds meaningful across maps.

export const PATH_WIDTH = 3.4;

// City — 200 m, 9 turns. A folded street grid with lawns, houses and a park.
const CITY_PATH = [
  [-32, 30],
  [32, 30],
  [32, 10],
  [-22, 10],
  [-22, -10],
  [22, -10],
  [22, -28],
  [-8, -28],
  [-8, -34],
  [2, -34],
  [2, -40],
];

// Desert Road — 80 m, dead straight.
const DESERT_PATH = [
  [-40, 0],
  [40, 0],
];

// Eternal — 500 m, 50 turns. Three folded serpentine columns.
function buildEternalPath() {
  const pts = [];
  const rowWidth = 10;
  const gap = 12;
  const connector = 5;
  const columns = [9, 9, 8];

  let x = 0;
  let y = 0;
  let dir = 1;

  pts.push([x, y]);
  for (let c = 0; c < columns.length; c++) {
    const rows = columns[c];
    for (let r = 0; r < rows; r++) {
      x += rowWidth * dir;
      pts.push([x, y]);
      if (r < rows - 1) {
        y += gap;
        pts.push([x, y]);
        dir = -dir;
      }
    }
    if (c < columns.length - 1) {
      x += connector;
      pts.push([x, y]);
      y = 0;
      pts.push([x, y]);
      x += connector;
      pts.push([x, y]);
    }
  }
  return pts;
}

export const MAPS = [
  {
    id: 'city',
    name: 'City',
    blurb: 'Tree-lined streets and front lawns. Warm windows, long sightlines.',
    spec: '200 m · 9 turns',
    length: 200,
    turns: 9,
    path: CITY_PATH,
    startCash: 700,
    lives: 20,
    palette: {
      bg: 0x0a0f0b,
      ground: 0x1a3322,
      groundAlt: 0x22402b,
      path: 0x3c3a38,
      pathEdge: 0xe0cfae,
      accent: '#ff8a3d',
      decor: 0x2f2a24,
      decorEdge: 0x453b2e,
      start: 0x5ee07a,
      end: 0xff5f4d,
    },
  },
  {
    id: 'desert',
    name: 'Desert Road',
    blurb: 'Eighty metres of red highway at golden hour. Nowhere to hide.',
    spec: '80 m · straight',
    length: 80,
    turns: 0,
    path: DESERT_PATH,
    startCash: 760,
    lives: 20,
    palette: {
      bg: 0x1a0d0a,
      ground: 0x51281a,
      groundAlt: 0x6a3420,
      path: 0x6d4a33,
      pathEdge: 0xf0b070,
      accent: '#ffb054',
      decor: 0x5c3620,
      decorEdge: 0x7d4a2c,
      start: 0x5ee07a,
      end: 0xff5f4d,
    },
  },
  {
    id: 'eternal',
    name: 'Eternal',
    blurb: 'Half a kilometre of lantern-lit garden path. Fifty turns of spite.',
    spec: '500 m · 50 turns',
    length: 500,
    turns: 50,
    path: buildEternalPath(),
    startCash: 850,
    lives: 20,
    palette: {
      bg: 0x0c0714,
      ground: 0x231536,
      groundAlt: 0x2e1b45,
      path: 0x4a3560,
      pathEdge: 0xffc9a8,
      accent: '#ff8fb8',
      decor: 0x2c1a44,
      decorEdge: 0x402860,
      start: 0x5ee07a,
      end: 0xff5f4d,
    },
  },
];

export function getMap(id) {
  return MAPS.find((m) => m.id === id) || MAPS[0];
}

/** Counts 90 degree direction changes in a polyline. */
export function countTurns(points) {
  let turns = 0;
  let lastDir = null;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i][0] - points[i - 1][0];
    const dy = points[i][1] - points[i - 1][1];
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) continue;
    const dir = [Math.round(dx / len), Math.round(dy / len)];
    if (lastDir && (dir[0] !== lastDir[0] || dir[1] !== lastDir[1])) turns++;
    lastDir = dir;
  }
  return turns;
}

/** Uniformly scales a path about its centre so its length matches `target`. */
function normalisePath(points, target) {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  }
  const k = target / total;
  if (Math.abs(k - 1) < 1e-9) return points.map((p) => [...p]);

  let cx = 0;
  let cy = 0;
  for (const p of points) {
    cx += p[0];
    cy += p[1];
  }
  cx /= points.length;
  cy /= points.length;

  return points.map((p) => [cx + (p[0] - cx) * k, cy + (p[1] - cy) * k]);
}

/** Builds the runtime map: measured path, cumulative distances and bounds. */
export function prepareMap(map) {
  const pts = normalisePath(map.path, map.length);
  const segs = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1];
    const [bx, by] = pts[i];
    const len = Math.hypot(bx - ax, by - ay);
    segs.push({ ax, ay, bx, by, len, start: total, angle: Math.atan2(by - ay, bx - ax) });
    total += len;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p[0]);
    minY = Math.min(minY, p[1]);
    maxX = Math.max(maxX, p[0]);
    maxY = Math.max(maxY, p[1]);
  }

  const pad = 16;
  const bounds = {
    minX: minX - pad,
    minY: minY - pad,
    maxX: maxX + pad,
    maxY: maxY + pad,
  };
  bounds.w = bounds.maxX - bounds.minX;
  bounds.h = bounds.maxY - bounds.minY;
  bounds.cx = (bounds.minX + bounds.maxX) / 2;
  bounds.cy = (bounds.minY + bounds.maxY) / 2;

  return {
    ...map,
    points: pts,
    segs,
    length: total,
    turns: countTurns(pts),
    bounds,
    start: pts[0],
    end: pts[pts.length - 1],
  };
}

/** Distance from a point to the path polyline. */
export function distanceToPath(segs, x, y) {
  let best = Infinity;
  for (const s of segs) {
    const vx = s.bx - s.ax;
    const vy = s.by - s.ay;
    const wx = x - s.ax;
    const wy = y - s.ay;
    const l2 = vx * vx + vy * vy;
    let t = l2 > 0 ? (wx * vx + wy * vy) / l2 : 0;
    t = Math.max(0, Math.min(1, t));
    const px = s.ax + vx * t;
    const py = s.ay + vy * t;
    const d = Math.hypot(x - px, y - py);
    if (d < best) best = d;
  }
  return best;
}

/** Position along the path at distance `d`. */
export function pointAt(prepared, d) {
  const clamped = Math.max(0, Math.min(prepared.length, d));
  const segs = prepared.segs;
  let lo = 0;
  let hi = segs.length - 1;
  let idx = hi;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (segs[mid].start <= clamped) {
      idx = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  const s = segs[idx];
  const t = s.len > 0 ? (clamped - s.start) / s.len : 0;
  return {
    x: s.ax + (s.bx - s.ax) * t,
    y: s.ay + (s.by - s.ay) * t,
    angle: s.angle,
  };
}
