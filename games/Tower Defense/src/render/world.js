import * as THREE from 'three';
import { Art, ORDER, mergeStatic, hash01 } from './art.js';
import { PATH_WIDTH, distanceToPath, pointAt } from '../data/maps.js';

// ---------------------------------------------------------------------------
// Map art. Every map is composed deliberately: lawns, streets and gardens
// first, then buildings and hand-placed set pieces, then trees and props.
// ---------------------------------------------------------------------------

function segs(map) {
  return map.segs.map((s) => ({
    ...s,
    mx: (s.ax + s.bx) / 2,
    my: (s.ay + s.by) / 2,
    nx: -Math.sin(s.angle),
    ny: Math.cos(s.angle),
  }));
}

function corridor(a, map, width, color, order, opacity = 1) {
  a.setOrder(order);
  for (const s of segs(map)) a.rect(s.mx, s.my, s.len + width, width, color, { o: opacity });
  for (const p of map.points) a.rect(p[0], p[1], width, width, color, { o: opacity });
}

function dashes(a, map, offset, width, dash, gap, color, order, opacity = 1, inset = 0) {
  a.setOrder(order);
  for (const s of segs(map)) {
    for (let d = dash + inset; d < s.len - inset; d += dash + gap) {
      const t = (d + dash / 2) / s.len;
      if (t > 1) break;
      const x = s.ax + (s.bx - s.ax) * t + s.nx * offset;
      const y = s.ay + (s.by - s.ay) * t + s.ny * offset;
      a.rect(x, y, dash, width, color, { r: s.angle, o: opacity });
    }
  }
}

function solidLine(a, map, offset, width, color, order, opacity = 1, inset = 0) {
  a.setOrder(order);
  for (const s of segs(map)) {
    if (s.len <= inset * 2 + 0.5) continue;
    const t0 = inset / s.len;
    const t1 = 1 - t0;
    const x0 = s.ax + (s.bx - s.ax) * t0 + s.nx * offset;
    const y0 = s.ay + (s.by - s.ay) * t0 + s.ny * offset;
    const x1 = s.ax + (s.bx - s.ax) * t1 + s.nx * offset;
    const y1 = s.ay + (s.by - s.ay) * t1 + s.ny * offset;
    a.line(x0, y0, x1, y1, width, color, { o: opacity });
  }
}

function inBounds(map, x, y, pad = 0) {
  const b = map.bounds;
  return x > b.minX + pad && x < b.maxX - pad && y > b.minY + pad && y < b.maxY - pad;
}

function pathDist(map, x, y) {
  return distanceToPath(map.segs, x, y);
}

function findSpot(map, w, h, preferX, preferY, minDist = 10, tries = 300) {
  for (let i = 0; i < tries; i++) {
    const ang = i * 2.399963;
    const rad = 3 + i * 0.9;
    const x = preferX + Math.cos(ang) * rad;
    const y = preferY + Math.sin(ang) * rad;
    if (!inBounds(map, x, y, 4)) continue;
    let ok = true;
    for (let ox = -1; ox <= 1 && ok; ox++) {
      for (let oy = -1; oy <= 1 && ok; oy++) {
        if (pathDist(map, x + (ox * w) / 2.2, y + (oy * h) / 2.2) < minDist) ok = false;
      }
    }
    if (ok) return { x, y };
  }
  return null;
}

function block(blocks, x, y, w, h, rot = 0) {
  const c = Math.abs(Math.cos(rot));
  const s = Math.abs(Math.sin(rot));
  const bw = w * c + h * s;
  const bh = w * s + h * c;
  blocks.push({ x: x - bw / 2, y: y - bh / 2, w: bw, h: bh });
}

function hits(blocks, x, y, r) {
  for (const d of blocks) {
    if (x + r > d.x && x - r < d.x + d.w && y + r > d.y && y - r < d.y + d.h) return true;
  }
  return false;
}

// ------------------------------------------------------------------ foliage

const GREEN_TREE = { dark: 0x256029, mid: 0x357a35, light: 0x4f9c48, top: 0x7cc46a };
const AUTUMN_TREE = { dark: 0x8a3a22, mid: 0xd9642a, light: 0xff9c42, top: 0xffc247 };
const BLOSSOM_TREE = { dark: 0x8a3a62, mid: 0xd9688f, light: 0xff9ecb, top: 0xffd0e0 };

function tree(a, x, y, s, pal = GREEN_TREE, seed = 0) {
  a.setOrder(ORDER.propShadow);
  a.ellipse(x + 0.85 * s, y - 0.9 * s, 1.7 * s, 1.35 * s, 0x000000, { o: 0.3, r: 0.4 });
  a.setOrder(ORDER.prop);
  a.circle(x, y, 1.36 * s, pal.dark);
  a.setOrder(ORDER.prop + 1);
  for (let i = 0; i < 5; i++) {
    const ang = i * 1.2566 + seed;
    const r = (0.7 + hash01(seed * 37 + i * 5) * 0.16) * s;
    a.circle(x + Math.cos(ang) * 0.36 * s, y + Math.sin(ang) * 0.36 * s, r, pal.mid);
  }
  a.setOrder(ORDER.prop + 2);
  a.circle(x - 0.16 * s, y + 0.2 * s, 0.88 * s, pal.light);
  a.setOrder(ORDER.prop + 3);
  a.circle(x - 0.3 * s, y + 0.36 * s, 0.5 * s, pal.top);
  a.setOrder(ORDER.prop + 4);
  for (let i = 0; i < 3; i++) {
    const ang = 1 + i * 2.1 + seed;
    a.circle(x + Math.cos(ang) * 0.88 * s, y + Math.sin(ang) * 0.88 * s, 0.14 * s, 0xfff3e0, { o: 0.32 });
  }
}

function bush(a, x, y, s, color = 0x2a6a33) {
  a.setOrder(ORDER.propShadow);
  a.ellipse(x + 0.24 * s, y - 0.26 * s, 0.8 * s, 0.56 * s, 0x000000, { o: 0.28 });
  a.setOrder(ORDER.prop);
  a.circle(x, y, 0.6 * s, 0x1d4a26);
  a.setOrder(ORDER.prop + 1);
  a.circle(x - 0.06 * s, y + 0.08 * s, 0.44 * s, color);
  a.setOrder(ORDER.prop + 2);
  a.circle(x - 0.14 * s, y + 0.16 * s, 0.22 * s, 0x7fc46a, { o: 0.8 });
}

function flowers(a, x, y, n = 6, spread = 1.2) {
  a.setOrder(ORDER.prop + 2);
  for (let i = 0; i < n; i++) {
    const col = [0xff6b8a, 0xffc247, 0xfff3e0, 0xff8a3d][i % 4];
    a.circle(x + (hash01(i * 3.7 + x) - 0.5) * spread, y + (hash01(i * 5.1 + y) - 0.5) * spread * 0.8, 0.11, col, { o: 0.95 });
  }
}

function lamp(a, x, y, angle) {
  a.setOrder(ORDER.propShadow);
  a.ellipse(x + 0.3, y - 0.3, 0.5, 0.4, 0x000000, { o: 0.3 });
  a.setOrder(ORDER.prop);
  a.circle(x, y, 0.16, 0x3a3632);
  a.rect(x, y, 0.12, 1.0, 0x4a453f, { r: angle });
  a.setOrder(ORDER.prop + 1);
  const hx = x + Math.cos(angle) * 0.62;
  const hy = y + Math.sin(angle) * 0.62;
  a.circle(hx, hy, 0.24, 0x3a3632);
  a.circle(hx, hy, 0.17, 0xffe0a0, { bright: 1.6 });
  a.setOrder(ORDER.glowLow);
  a.glow(hx, hy, 2.6, 0xffcf7a, 0.16);
}

// ---------------------------------------------------------------- City bits

const ROOFS = [0xff8a3d, 0xff5f4d, 0xffb054, 0x3fb8a8, 0xe0603a];

function nearestPath(map, x, y) {
  let best = { x: 0, y: 0, d: Infinity };
  for (const s of map.segs) {
    const vx = s.bx - s.ax;
    const vy = s.by - s.ay;
    const l2 = vx * vx + vy * vy;
    let t = l2 ? ((x - s.ax) * vx + (y - s.ay) * vy) / l2 : 0;
    t = Math.max(0, Math.min(1, t));
    const px = s.ax + vx * t;
    const py = s.ay + vy * t;
    const d = Math.hypot(x - px, y - py);
    if (d < best.d) best = { x: px, y: py, d };
  }
  return best;
}

function house(a, map, blocks, x, y, w, h, seed) {
  const roof = ROOFS[((seed % ROOFS.length) + ROOFS.length) % ROOFS.length];
  const np = nearestPath(map, x, y);
  const faceX = Math.abs(np.x - x) >= Math.abs(np.y - y);
  const fx = faceX ? (np.x > x ? 1 : -1) : 0;
  const fy = faceX ? 0 : np.y > y ? 1 : -1;

  // garden
  a.setOrder(ORDER.prop - 2);
  a.rect(x, y, w + 2.4, h + 2.6, 0x4b8450);
  a.setOrder(ORDER.prop - 1);
  a.rect(x, y, w + 1.9, h + 2.1, 0x568f57);

  // driveway out to the street
  if (np.d < 11) {
    a.setOrder(ORDER.prop - 1);
    a.line(x, y, np.x, np.y, 1.9, 0xc7b998);
    a.line(x, y, np.x, np.y, 1.1, 0xd8c9a8, { o: 0.75 });
  }

  // fence, open on the street side
  a.setOrder(ORDER.prop - 1);
  const fw = w + 2.0;
  const fh = h + 2.2;
  a.rect(x, y + fh / 2, fw, 0.13, 0xfff3e0, { o: 0.75 });
  a.rect(x, y - fh / 2, fw, 0.13, 0xfff3e0, { o: 0.75 });
  a.rect(x - fw / 2, y, 0.13, fh, 0xfff3e0, { o: 0.75 });
  a.rect(x + fw / 2, y, 0.13, fh, 0xfff3e0, { o: 0.75 });
  a.setOrder(ORDER.prop);
  for (let i = 0; i < 4; i++) {
    a.rect(x - fw / 2 + (i + 0.5) * (fw / 4), y + fh / 2, 0.2, 0.2, 0xd9c9a8);
    a.rect(x - fw / 2 + (i + 0.5) * (fw / 4), y - fh / 2, 0.2, 0.2, 0xd9c9a8);
  }

  // walls and a full gabled roof
  a.setOrder(ORDER.propShadow);
  a.rect(x + 0.5, y - 0.5, w + 0.6, h + 0.6, 0x000000, { o: 0.24 });
  a.setOrder(ORDER.prop);
  a.rect(x, y, w, h, 0xfff3e0);
  a.setOrder(ORDER.prop + 1);
  a.rect(x, y, w, h, roof);
  a.setOrder(ORDER.prop + 2);
  a.rect(x - w * 0.25, y, w * 0.5, h * 0.98, roof, { bright: 1.14 });
  a.rect(x + w * 0.25, y, w * 0.5, h * 0.98, roof, { bright: 0.8 });
  a.setOrder(ORDER.prop + 3);
  a.line(x, y - h * 0.5, x, y + h * 0.5, 0.09, 0xfff3e0, { o: 0.5 });
  a.rect(x + w * 0.24, y + h * 0.22, 0.42, 0.42, 0xd9563e);
  a.rect(x + w * 0.24, y + h * 0.22, 0.24, 0.24, 0x3a2a22);

  // porch and door on the street side
  a.setOrder(ORDER.prop + 4);
  if (faceX) {
    a.rect(x + fx * (w / 2 + 0.38), y, 0.95, 1.7, 0xefe0c0);
    a.rect(x + fx * (w / 2 + 0.72), y, 0.5, 0.95, 0x8a5a2a);
    a.circle(x + fx * (w / 2 + 0.72), y + 1.15, 0.22, 0xffd489, { bright: 1.4 });
  } else {
    a.rect(x, y + fy * (h / 2 + 0.38), 1.7, 0.95, 0xefe0c0);
    a.rect(x, y + fy * (h / 2 + 0.72), 0.95, 0.5, 0x8a5a2a);
    a.circle(x + 1.15, y + fy * (h / 2 + 0.72), 0.22, 0xffd489, { bright: 1.4 });
  }

  // lit attic window
  a.setOrder(ORDER.prop + 5);
  a.rect(x - w * 0.22, y + h * 0.14, 0.42, 0.36, 0xffd489, { bright: 1.3 });
  a.rect(x - w * 0.22, y + h * 0.14, 0.5, 0.44, 0xfff3e0, { o: 0.16, add: true });

  flowers(a, x, y - h / 2 - 0.95, 5, w * 0.85);
  block(blocks, x, y, w + 2.6, h + 2.8);
}


function fountain(a, x, y) {
  a.setOrder(ORDER.propShadow);
  a.circle(x + 0.3, y - 0.3, 2.2, 0x000000, { o: 0.22 });
  a.setOrder(ORDER.prop);
  a.circle(x, y, 2.15, 0xe0d0b0);
  a.setOrder(ORDER.prop + 1);
  a.circle(x, y, 1.95, 0xfff3e0);
  a.setOrder(ORDER.prop + 2);
  a.circle(x, y, 1.72, 0x2f8fb0);
  a.setOrder(ORDER.prop + 3);
  a.circle(x, y, 1.5, 0x54bcd4);
  a.circle(x - 0.55, y + 0.45, 0.36, 0xbfeef8, { o: 0.55 });
  a.setOrder(ORDER.prop + 4);
  a.circle(x, y, 0.4, 0xe0d0b0);
  a.circle(x, y, 0.28, 0xfff3e0);
  a.circle(x, y, 0.12, 0xbfeef8);
  a.setOrder(ORDER.glowLow);
  a.glow(x, y, 2.2, 0x8fe0ff, 0.1);
}

function playground(a, x, y) {
  a.setOrder(ORDER.prop);
  a.ellipse(x, y, 3.4, 2.6, 0xc9a06a, { o: 0.9 });
  a.setOrder(ORDER.prop + 1);
  a.rect(x - 1.2, y + 0.5, 0.4, 1.5, 0xff8a3d, { r: 0.4 });
  a.setOrder(ORDER.prop + 2);
  a.rect(x - 2.1, y - 0.4, 1.6, 0.5, 0xffb054, { r: 0.32 });
  a.rect(x + 0.9, y + 0.4, 1.9, 0.12, 0xffc247);
  a.rect(x + 0.4, y + 0.4, 0.1, 1.0, 0xb0a48e);
  a.rect(x + 1.5, y + 0.4, 0.1, 1.0, 0xb0a48e);
  a.setOrder(ORDER.prop + 3);
  a.rect(x + 0.6, y - 0.2, 0.5, 0.12, 0xff5f4d);
  a.rect(x + 1.35, y - 0.2, 0.5, 0.12, 0x5ec8e0);
  flowers(a, x, y - 1.7, 8, 3.0);
}

function backyard(a, blocks, x, y, kind) {
  a.setOrder(ORDER.propShadow);
  a.rect(x + 0.4, y - 0.4, 5.6, 4.4, 0x000000, { o: 0.16 });
  if (kind === 0) {
    a.setOrder(ORDER.prop);
    a.rect(x, y, 5.6, 4.4, 0xe4d4b4);
    a.setOrder(ORDER.prop + 1);
    a.rect(x, y, 5.0, 3.8, 0x3fb0d8);
    a.setOrder(ORDER.prop + 2);
    a.rect(x, y, 4.4, 3.2, 0x63cdea);
    a.rect(x - 1.0, y + 0.4, 1.2, 0.5, 0xfff3e0, { o: 0.85 });
    a.circle(x + 1.3, y - 0.6, 0.42, 0xff8a3d, { o: 0.95 });
    for (let i = 0; i < 3; i++) a.rect(x - 1.4 + i * 1.4, y + 1.4, 1.2, 0.08, 0xd8f4ff, { o: 0.5 });
  } else if (kind === 1) {
    a.setOrder(ORDER.prop);
    a.rect(x, y, 5.2, 4.2, 0x6a4c30);
    a.setOrder(ORDER.prop + 1);
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 4; c++) {
        a.circle(x - 1.9 + c * 1.25, y - 1.3 + r * 1.25, 0.42, 0x4f9c3a);
        a.circle(x - 1.9 + c * 1.25, y - 1.3 + r * 1.25, 0.18, 0x86cf6a);
      }
    }
    a.setOrder(ORDER.prop + 2);
    for (let i = 0; i < 3; i++) a.circle(x - 1.5 + i * 1.6, y + 1.75, 0.24, 0xff8a3d);
  } else if (kind === 2) {
    a.setOrder(ORDER.prop);
    a.rect(x, y, 3.2, 2.8, 0xb08048);
    a.setOrder(ORDER.prop + 1);
    a.rect(x, y + 0.2, 3.7, 2.3, 0x9a4230);
    a.rect(x, y - 1.15, 1.0, 0.55, 0x6a3a1e);
    a.setOrder(ORDER.prop + 2);
    a.line(x - 1.3, y + 0.2, x + 1.3, y + 0.2, 0.06, 0xfff3e0, { o: 0.45 });
    for (let i = 0; i < 3; i++) a.circle(x + 2.2, y - 0.6 + i * 0.45, 0.22, 0x8a5a2a);
  } else {
    a.setOrder(ORDER.prop);
    a.circle(x, y, 2.2, 0x33363c);
    a.setOrder(ORDER.prop + 1);
    a.circle(x, y, 1.9, 0x3f7fd0);
    a.setOrder(ORDER.prop + 2);
    a.circle(x, y, 1.6, 0x5a9ae8, { o: 0.9 });
    a.circle(x - 0.4, y + 0.4, 0.5, 0xbfdcff, { o: 0.5 });
  }
  block(blocks, x, y, 5.8, 4.6);
}

// ---------------------------------------------------------------- CITY MAP

function city(ctx) {
  const { a, map, blocks } = ctx;
  const b = map.bounds;

  // lawns
  a.setOrder(ORDER.ground);
  a.rect(b.cx, b.cy, b.w * 2, b.h * 2, 0x4a8048);
  a.setOrder(ORDER.patches);
  for (let y = Math.floor(b.minY / 9) * 9; y < b.maxY; y += 9) {
    a.rect(b.cx, y + 4.5, b.w * 1.95, 4.5, 0x579052, { o: 0.5 });
  }
  for (let i = 0; i < 24; i++) {
    const x = b.minX + hash01(i * 3.7) * b.w;
    const y = b.minY + hash01(i * 9.1 + 4) * b.h;
    a.ellipse(x, y, 6 + hash01(i + 1) * 13, 4 + hash01(i + 6) * 7, 0x3d6f42, { o: 0.4, r: hash01(i + 2) * 3 });
  }

  // grass tufts
  a.setOrder(ORDER.decal);
  for (let i = 0; i < 260; i++) {
    const x = b.minX + hash01(i * 1.7 + 3) * b.w;
    const y = b.minY + hash01(i * 4.1 + 7) * b.h;
    a.line(x, y, x + (hash01(i + 9) - 0.5) * 0.4, y + 0.24 + hash01(i + 5) * 0.3, 0.05, 0x568a54, { o: 0.55 });
  }

  // street: a slim road with warm pavements
  corridor(a, map, PATH_WIDTH + 3.0, 0x3f7244, ORDER.pathBase, 0.9);
  corridor(a, map, PATH_WIDTH + 2.2, 0xb2a284, ORDER.pathBase);
  corridor(a, map, PATH_WIDTH + 0.6, 0xddc9a4, ORDER.pathBase);
  corridor(a, map, PATH_WIDTH, 0x4c4c57, ORDER.path);
  corridor(a, map, PATH_WIDTH - 0.3, 0x575762, ORDER.path, 0.9);

  // markings
  dashes(a, map, 0, 0.1, 1.5, 1.8, 0xfff3e0, ORDER.marking, 0.65, 2.2);
  solidLine(a, map, 1.42, 0.08, 0xfff3e0, ORDER.marking, 0.32, 1.9);
  solidLine(a, map, -1.42, 0.08, 0xfff3e0, ORDER.marking, 0.32, 1.9);

  // worn asphalt and kerb shadow
  a.setOrder(ORDER.path + 1);
  for (const s of segs(map)) {
    for (let d = 4; d < s.len - 4; d += 8) {
      const t = d / s.len;
      const x = s.ax + (s.bx - s.ax) * t;
      const y = s.ay + (s.by - s.ay) * t;
      a.ellipse(
        x + (hash01(d) - 0.5) * 1.5,
        y + (hash01(d + 2) - 0.5) * 1.1,
        0.6 + hash01(d + 1) * 1.1,
        0.3 + hash01(d + 3) * 0.4,
        0x3e3e47,
        { o: 0.16, r: s.angle },
      );
    }
  }
  solidLine(a, map, 1.68, 0.16, 0x2a2a30, ORDER.path + 1, 0.5);
  solidLine(a, map, -1.68, 0.16, 0x2a2a30, ORDER.path + 1, 0.5);

  // crosswalks
  a.setOrder(ORDER.marking);
  for (const s of segs(map)) {
    if (s.len < 16) continue;
    const cx = s.ax + (s.bx - s.ax) * 0.5;
    const cy = s.ay + (s.by - s.ay) * 0.5;
    for (let i = 0; i < 6; i++) {
      const o = -1.25 + i * 0.5;
      a.rect(cx + s.nx * o, cy + s.ny * o, 2.6, 0.22, 0xfff3e0, { r: s.angle, o: 0.6 });
    }
  }

  // houses lining the streets
  const step = 9.5;
  let idx = 0;
  for (let gx = b.minX + 6; gx < b.maxX - 6; gx += step) {
    for (let gy = b.minY + 6; gy < b.maxY - 6; gy += step) {
      idx++;
      const seed = Math.floor(gx * 13 + gy * 7);
      if (hash01(seed) > 0.9) continue;
      const w = 4.6 + hash01(seed + 1) * 1.6;
      const h = 4.6 + hash01(seed + 2) * 1.6;
      const x = gx + (hash01(seed + 3) - 0.5) * 3;
      const y = gy + (hash01(seed + 4) - 0.5) * 3;
      let clear = true;
      for (let ox = -1; ox <= 1 && clear; ox++) {
        for (let oy = -1; oy <= 1 && clear; oy++) {
          if (pathDist(map, x + (ox * w) / 2, y + (oy * h) / 2) < 5.9) clear = false;
        }
      }
      if (!clear || hits(blocks, x, y, 4.2)) continue;
      house(a, map, blocks, x, y, w, h, seed + idx);
    }
  }

  // back gardens, pools and sheds filling the middle of each block
  for (let gx = b.minX + 8; gx < b.maxX - 8; gx += 11) {
    for (let gy = b.minY + 8; gy < b.maxY - 8; gy += 11) {
      const seed = Math.floor(gx * 19 + gy * 29);
      if (hash01(seed) > 0.72) continue;
      const x = gx + (hash01(seed + 1) - 0.5) * 4;
      const y = gy + (hash01(seed + 2) - 0.5) * 4;
      if (pathDist(map, x, y) < 7.6) continue;
      if (hits(blocks, x, y, 4.0)) continue;
      backyard(a, blocks, x, y, Math.floor(hash01(seed + 3) * 4));
    }
  }

  // street trees and lamps
  let side = 1;
  for (const s of segs(map)) {
    for (let d = 6; d < s.len - 5; d += 13) {
      side *= -1;
      const t = d / s.len;
      const x = s.ax + (s.bx - s.ax) * t + s.nx * 4.5 * side;
      const y = s.ay + (s.by - s.ay) * t + s.ny * 4.5 * side;
      if (!inBounds(map, x, y, 2)) continue;
      tree(a, x, y, 0.66 + hash01(d) * 0.16, GREEN_TREE, hash01(d + 3) * 6.28);
    }
    for (let d = 12; d < s.len - 5; d += 30) {
      const t = d / s.len;
      const x = s.ax + (s.bx - s.ax) * t + s.nx * 3.3 * (d % 60 < 30 ? 1 : -1);
      const y = s.ay + (s.by - s.ay) * t + s.ny * 3.3 * (d % 60 < 30 ? 1 : -1);
      lamp(a, x, y, s.angle + Math.PI / 2);
    }
  }

  // set piece: the park
  const park = findSpot(map, 15, 15, b.minX + b.w * 0.24, b.minY + b.h * 0.72, 10);
  if (park) {
    a.setOrder(ORDER.prop - 1);
    a.rect(park.x, park.y, 15, 15, 0x3f7c46);
    a.setOrder(ORDER.prop);
    a.rect(park.x, park.y, 14.2, 14.2, 0x4f9250);
    a.setOrder(ORDER.prop + 1);
    a.rect(park.x, park.y, 14.2, 1.6, 0xe0d0b0);
    a.rect(park.x, park.y, 1.6, 14.2, 0xe0d0b0);
    a.setOrder(ORDER.prop + 2);
    for (let i = 0; i < 6; i++) {
      a.rect(park.x - 5.2 + i * 2.1, park.y, 1.4, 1.5, 0xf0e2c4, { o: 0.45 });
      a.rect(park.x, park.y - 5.2 + i * 2.1, 1.5, 1.4, 0xf0e2c4, { o: 0.45 });
    }
    fountain(a, park.x, park.y);
    playground(a, park.x + 4.8, park.y - 4.8);
    for (const [dx, dy, r] of [
      [-3.9, 3.6, 0],
      [3.9, 3.6, 0],
      [-3.9, -3.6, 0],
      [3.7, 2.4, Math.PI / 2],
    ]) {
      a.setOrder(ORDER.prop + 2);
      a.rect(park.x + dx, park.y + dy, 1.9, 0.5, 0x8a5a2a, { r });
      a.setOrder(ORDER.prop + 3);
      a.rect(park.x + dx, park.y + dy + 0.08, 1.7, 0.26, 0xffb054, { r });
    }
    for (const [dx, dy] of [
      [-5.6, 5.6],
      [5.6, 5.6],
      [-5.6, -5.6],
      [5.6, -5.6],
    ]) {
      tree(a, park.x + dx, park.y + dy, 0.92, hash01(dx + dy) > 0.75 ? AUTUMN_TREE : GREEN_TREE, hash01(dx + dy));
    }
    block(blocks, park.x, park.y, 15, 15);
  }

  // garden clumps in the leftover lawn
  const treeStep = 12;
  for (let gx = b.minX + 4; gx < b.maxX - 4; gx += treeStep) {
    for (let gy = b.minY + 4; gy < b.maxY - 4; gy += treeStep) {
      const seed = Math.floor(gx * 11 + gy * 17);
      if (hash01(seed) > 0.55) continue;
      const x = gx + (hash01(seed + 1) - 0.5) * 6;
      const y = gy + (hash01(seed + 2) - 0.5) * 6;
      const s = 0.8 + hash01(seed + 3) * 0.5;
      if (!inBounds(map, x, y, 2.5)) continue;
      if (pathDist(map, x, y) < 6.4) continue;
      if (hits(blocks, x, y, 1.4 * s)) continue;
      const pal = hash01(seed + 9) > 0.76 ? AUTUMN_TREE : GREEN_TREE;
      tree(a, x, y, s, pal, hash01(seed + 4) * 6.28);
      block(blocks, x, y, 1.8 * s, 1.8 * s);
      if (hash01(seed + 8) > 0.45) bush(a, x + 1.3 * s, y - 1.1 * s, 0.75);
    }
  }

  // parked cars
  for (let si = 0; si < map.segs.length; si++) {
    const s = segs(map)[si];
    if (s.len < 12) continue;
    for (const frac of [0.3, 0.7]) {
      if (hash01(si * 5 + frac * 10) > 0.7) continue;
      const sign = hash01(si + frac * 3) > 0.5 ? 1 : -1;
      const x = s.ax + (s.bx - s.ax) * frac + s.nx * 2.5 * sign;
      const y = s.ay + (s.by - s.ay) * frac + s.ny * 2.5 * sign;
      const cols = [0xff5f4d, 0x5ec8e0, 0xffc247, 0x9aa3a0, 0xd9688f];
      const col = cols[(si + Math.round(frac * 10)) % cols.length];
      a.setOrder(ORDER.propShadow);
      a.rect(x + 0.3, y - 0.3, 2.0, 0.96, 0x000000, { o: 0.28, r: s.angle });
      a.setOrder(ORDER.prop);
      a.rect(x, y, 2.0, 0.94, col, { r: s.angle });
      a.setOrder(ORDER.prop + 1);
      a.rect(x, y, 1.05, 0.76, 0x2f3238, { r: s.angle });
      a.rect(x + Math.cos(s.angle) * 0.5, y + Math.sin(s.angle) * 0.5, 0.4, 0.68, 0xbfe8ff, { r: s.angle, o: 0.6 });
      block(blocks, x, y, 2.2, 1.1, s.angle);
    }
  }

  gate(a, map, 0x5ee07a, false);
  gate(a, map, 0xff5f4d, true);
}


// ------------------------------------------------------------------- gates

function gate(a, map, color, isEnd) {
  const [x, y] = isEnd ? map.end : map.start;
  a.setOrder(ORDER.marking);
  a.circle(x, y, 3.0, color, { o: 0.1 });
  a.ring(x, y, 2.6, 2.9, color, { o: 0.5, seg: 48 });
  a.setOrder(ORDER.marking + 1);
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
    a.rect(x + Math.cos(ang) * 2.2, y + Math.sin(ang) * 2.2, 0.5, 0.14, color, { r: ang, o: 0.85 });
  }
  a.setOrder(ORDER.glowLow);
  a.glow(x, y, 3.4, color, 0.16);
  if (!isEnd) {
    a.setOrder(ORDER.marking + 2);
    a.rect(x, y - 1.4, 2.6, 0.14, color, { o: 0.5 });
    a.rect(x, y + 1.4, 2.6, 0.14, color, { o: 0.5 });
  } else {
    a.setOrder(ORDER.marking + 2);
    a.rect(x, y, 3.4, 0.16, color, { o: 0.6, r: 0.78 });
    a.rect(x, y, 3.4, 0.16, color, { o: 0.6, r: -0.78 });
  }
}

// ------------------------------------------------------------- DESERT MAP

function desert(ctx) {
  const { a, map, blocks } = ctx;
  const b = map.bounds;

  a.setOrder(ORDER.ground);
  a.rect(b.cx, b.cy, b.w * 2, b.h * 2, 0x6b3620);

  a.setOrder(ORDER.patches);
  for (let i = 0; i < 16; i++) {
    const x = b.minX + hash01(i * 2.3) * b.w;
    const y = b.minY + hash01(i * 7.7 + 2) * b.h;
    const rx = 12 + hash01(i + 3) * 26;
    const ry = 5 + hash01(i + 8) * 9;
    const rot = hash01(i + 5) * Math.PI;
    a.ellipse(x, y, rx, ry, 0x8a4a26, { o: 0.55, r: rot });
    a.ellipse(x + 1.4, y - 1.4, rx * 0.82, ry * 0.7, 0xa85c32, { o: 0.45, r: rot });
  }
  a.setOrder(ORDER.patches + 1);
  for (let i = 0; i < 26; i++) {
    const x = b.minX + hash01(i * 5.1 + 1) * b.w;
    const y = b.minY + hash01(i * 3.3 + 9) * b.h;
    a.line(x, y, x + 2 + hash01(i) * 4, y + 1 - hash01(i + 2) * 2, 0.05, 0x33180e, { o: 0.5 });
  }

  // highway
  corridor(a, map, PATH_WIDTH + 4.6, 0x92502c, ORDER.pathBase, 0.85);
  corridor(a, map, PATH_WIDTH + 3.6, 0xc08a58, ORDER.pathBase, 0.95);
  corridor(a, map, PATH_WIDTH + 3.0, 0x8a6a4e, ORDER.pathBase);
  corridor(a, map, PATH_WIDTH, 0x3d3733, ORDER.path);
  corridor(a, map, PATH_WIDTH - 0.3, 0x46403a, ORDER.path, 0.9);

  solidLine(a, map, 1.5, 0.09, 0xfff3e0, ORDER.marking, 0.5);
  solidLine(a, map, -1.5, 0.09, 0xfff3e0, ORDER.marking, 0.5);
  dashes(a, map, 0, 0.11, 2.0, 2.2, 0xffc247, ORDER.marking, 0.7);

  // dusk light: hot orange at the horizon, cool violet behind
  a.setOrder(ORDER.glowLow);
  a.glow(b.cx + b.w * 0.15, b.maxY - b.h * 0.1, b.w * 0.55, 0xff7a3a, 0.2);
  a.glow(b.cx - b.w * 0.2, b.minY + b.h * 0.15, b.w * 0.5, 0x8a3fa8, 0.12);

  // long raking dune shadows
  a.setOrder(ORDER.patches);
  for (let i = 0; i < 10; i++) {
    const x = b.minX + hash01(i * 6.3 + 3) * b.w;
    const y = b.minY + hash01(i * 4.9 + 7) * b.h;
    a.ellipse(x, y, 20 + hash01(i) * 20, 2.2 + hash01(i + 2) * 2.4, 0x4a2212, { o: 0.35, r: 0.16 + hash01(i + 5) * 0.1 });
  }

  // cacti
  for (let i = 0; i < 24; i++) {
    const d = 4 + hash01(i * 3.1) * (map.length - 8);
    const p = pointAt(map, d);
    const side = i % 2 ? 1 : -1;
    const off = 8 + hash01(i + 3) * 12;
    const x = p.x - Math.sin(p.angle) * off * side;
    const y = p.y + Math.cos(p.angle) * off * side;
    if (!inBounds(map, x, y, 5) || pathDist(map, x, y) < 7) continue;
    a.setOrder(ORDER.propShadow);
    a.ellipse(x + 0.4, y - 0.4, 1.0, 0.8, 0x000000, { o: 0.3 });
    a.setOrder(ORDER.prop);
    a.rect(x, y, 0.44, 2.2, 0x3f8a45);
    a.rect(x - 0.5, y + 0.4, 0.9, 0.3, 0x3f8a45);
    a.rect(x - 0.5, y + 0.75, 0.28, 0.8, 0x3f8a45);
    a.rect(x + 0.5, y - 0.2, 0.9, 0.28, 0x3f8a45);
    a.rect(x + 0.6, y + 0.1, 0.26, 0.7, 0x3f8a45);
    a.setOrder(ORDER.prop + 1);
    a.rect(x, y, 0.16, 2.2, 0x63b25a, { o: 0.8 });
    a.circle(x, y + 1.0, 0.14, 0xff6b8a);
    block(blocks, x, y, 1.6, 2.4);
  }

  // rocks
  for (let i = 0; i < 28; i++) {
    const d = 6 + hash01(i * 7.3) * (map.length - 12);
    const p = pointAt(map, d);
    const side = i % 3 === 0 ? 1 : -1;
    const off = 8 + hash01(i + 5) * 14;
    const x = p.x - Math.sin(p.angle) * off * side;
    const y = p.y + Math.cos(p.angle) * off * side;
    if (!inBounds(map, x, y, 5)) continue;
    const r = 0.8 + hash01(i + 9) * 1.5;
    a.setOrder(ORDER.propShadow);
    a.ellipse(x + 0.3, y - 0.3, r * 1.2, r * 0.9, 0x000000, { o: 0.3 });
    a.setOrder(ORDER.prop);
    a.poly(
      [
        [r, 0.2],
        [r * 0.4, r * 0.9],
        [-r * 0.7, r * 0.6],
        [-r, -0.2],
        [-r * 0.3, -r * 0.8],
        [r * 0.6, -r * 0.7],
      ],
      0x8a4a2c,
      { x, y },
    );
    a.setOrder(ORDER.prop + 1);
    a.poly(
      [
        [r * 0.5, 0.1],
        [r * 0.2, r * 0.5],
        [-r * 0.4, r * 0.3],
        [-r * 0.2, -r * 0.4],
      ],
      0xc07a4a,
      { x: x - 0.15, y: y + 0.15 },
    );
    block(blocks, x, y, r * 2.2, r * 2.0);
  }

  // telephone poles and wires
  let prev = null;
  for (let d = 6; d < map.length; d += 32) {
    const p = pointAt(map, d);
    const x = p.x - Math.sin(p.angle) * 9;
    const y = p.y + Math.cos(p.angle) * 9;
    a.setOrder(ORDER.propShadow);
    a.ellipse(x + 0.3, y - 0.3, 0.6, 0.5, 0x000000, { o: 0.3 });
    a.setOrder(ORDER.prop);
    a.circle(x, y, 0.22, 0x5c3620);
    a.rect(x, y, 2.2, 0.16, 0x6a4428, { r: p.angle + Math.PI / 2 });
    a.setOrder(ORDER.prop + 1);
    a.circle(x - 0.9, y, 0.07, 0xfff3e0, { o: 0.6 });
    a.circle(x + 0.9, y, 0.07, 0xfff3e0, { o: 0.6 });
    if (prev) {
      a.setOrder(ORDER.prop);
      a.line(prev.x, prev.y, (prev.x + x) / 2, (prev.y + y) / 2 + 0.8, 0.05, 0x3a2214, { o: 0.7 });
      a.line((prev.x + x) / 2, (prev.y + y) / 2 + 0.8, x, y, 0.05, 0x3a2214, { o: 0.7 });
    }
    prev = { x, y };
    block(blocks, x, y, 2.4, 0.6, p.angle + Math.PI / 2);
  }

  // set piece: the diner
  const diner = findSpot(map, 18, 12, b.cx + b.w * 0.2, b.cy + b.h * 0.2, 12);
  if (diner) {
    a.setOrder(ORDER.propShadow);
    a.rect(diner.x + 0.6, diner.y - 0.6, 16, 10, 0x000000, { o: 0.35 });
    a.setOrder(ORDER.prop);
    a.rect(diner.x, diner.y, 15, 9.5, 0x3d3a34, { o: 0.9 });
    a.setOrder(ORDER.prop + 1);
    a.rect(diner.x, diner.y, 14, 8.5, 0xe8d9b8);
    a.rect(diner.x, diner.y - 1.0, 14, 1.4, 0xff5f4d);
    a.rect(diner.x, diner.y + 3.0, 14, 0.8, 0xfff3e0);
    a.setOrder(ORDER.prop + 2);
    for (let i = 0; i < 5; i++) {
      a.rect(diner.x - 5 + i * 2.5, diner.y - 1.0, 1.6, 0.8, 0xfff3e0, { o: 0.85 });
      a.circle(diner.x - 5 + i * 2.5, diner.y + 1.4, 0.34, 0x9ec8ff, { o: 0.5 });
    }
    // neon sign
    a.setOrder(ORDER.prop + 3);
    a.rect(diner.x - 7.4, diner.y + 1.2, 0.3, 4.4, 0x5c4a32);
    a.rect(diner.x - 7.4, diner.y + 3.0, 3.4, 1.6, 0x241a14);
    a.rect(diner.x - 7.4, diner.y + 3.0, 3.0, 1.1, 0xff4d5e, { bright: 1.3 });
    a.setOrder(ORDER.glowLow);
    a.glow(diner.x - 7.4, diner.y + 3.0, 3.4, 0xff4d5e, 0.28);
    // pumps
    a.setOrder(ORDER.prop + 2);
    for (const dx of [4.6, 6.2]) {
      a.rect(diner.x + dx, diner.y - 3.4, 0.8, 1.3, 0xff8a3d);
      a.rect(diner.x + dx, diner.y - 3.4, 0.5, 0.5, 0xfff3e0, { o: 0.85 });
    }
    block(blocks, diner.x, diner.y, 17, 11);
  }

  // set piece: giant skull
  const skull = findSpot(map, 9, 9, b.cx - b.w * 0.26, b.cy - b.h * 0.18, 11);
  if (skull) {
    a.setOrder(ORDER.propShadow);
    a.ellipse(skull.x + 0.4, skull.y - 0.4, 4.4, 3.6, 0x000000, { o: 0.32 });
    a.setOrder(ORDER.prop);
    a.ellipse(skull.x, skull.y, 4.2, 3.4, 0xd9c39a);
    a.setOrder(ORDER.prop + 1);
    a.ellipse(skull.x - 0.2, skull.y + 0.4, 3.2, 2.5, 0xfff3e0, { o: 0.65 });
    a.setOrder(ORDER.prop + 2);
    a.circle(skull.x - 1.2, skull.y + 0.6, 0.6, 0x4a2416);
    a.circle(skull.x + 1.3, skull.y + 0.6, 0.6, 0x4a2416);
    a.rect(skull.x, skull.y - 1.5, 0.6, 1.0, 0x4a2416, { r: 0.15 });
    for (let i = 0; i < 4; i++) a.rect(skull.x - 1.2 + i * 0.8, skull.y - 2.0, 0.22, 0.5, 0xd9c39a);
    block(blocks, skull.x, skull.y, 9, 8);
  }

  // windmill
  const mill = findSpot(map, 8, 8, b.cx - b.w * 0.3, b.cy + b.h * 0.24, 10);
  if (mill) {
    a.setOrder(ORDER.prop);
    a.rect(mill.x, mill.y, 0.3, 3.6, 0x8a9490);
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * Math.PI * 2 + 0.4;
      a.rect(mill.x + Math.cos(ang) * 0.9, mill.y + 2.0 + Math.sin(ang) * 0.9, 1.5, 0.28, 0xfff3e0, { r: ang, o: 0.9 });
    }
    a.circle(mill.x, mill.y + 2.0, 0.2, 0xff8a3d);
    block(blocks, mill.x, mill.y, 3, 4);
  }

  // tumbleweeds
  a.setOrder(ORDER.prop);
  for (let i = 0; i < 14; i++) {
    const x = b.minX + 6 + hash01(i * 4.3) * (b.w - 12);
    const y = b.minY + 6 + hash01(i * 8.9 + 2) * (b.h - 12);
    if (pathDist(map, x, y) < 5.5) continue;
    a.circle(x, y, 0.34, 0xa87a4a, { o: 0.75 });
    a.circle(x, y, 0.2, 0x6a4428, { o: 0.5 });
  }

  gate(a, map, 0x5ee07a, false);
  gate(a, map, 0xff5f4d, true);
}

// ------------------------------------------------------------ ETERNAL MAP

function eternal(ctx) {
  const { a, map, blocks } = ctx;
  const b = map.bounds;

  a.setOrder(ORDER.ground);
  a.rect(b.cx, b.cy, b.w * 2, b.h * 2, 0x150c28);

  a.setOrder(ORDER.patches);
  for (let i = 0; i < 18; i++) {
    const x = b.minX + hash01(i * 2.7) * b.w;
    const y = b.minY + hash01(i * 6.3 + 1) * b.h;
    a.ellipse(x, y, 8 + hash01(i + 2) * 18, 5 + hash01(i + 4) * 10, 0x241640, { o: 0.55, r: hash01(i) * 3 });
  }
  // gold flecks
  a.setOrder(ORDER.decal);
  for (let i = 0; i < 220; i++) {
    const x = b.minX + hash01(i * 1.9 + 5) * b.w;
    const y = b.minY + hash01(i * 3.7 + 9) * b.h;
    a.circle(x, y, 0.06 + hash01(i) * 0.06, 0xffc247, { o: 0.15 + hash01(i + 3) * 0.2 });
  }

  // stone path
  corridor(a, map, PATH_WIDTH + 1.9, 0x33204a, ORDER.pathBase);
  corridor(a, map, PATH_WIDTH + 1.5, 0xffc9a8, ORDER.pathBase);
  corridor(a, map, PATH_WIDTH + 0.5, 0x5c4470, ORDER.path);
  corridor(a, map, PATH_WIDTH, 0x6b5280, ORDER.path);
  corridor(a, map, PATH_WIDTH - 0.3, 0x7a6088, ORDER.path, 0.55);

  dashes(a, map, 0, 0.12, 1.2, 2.0, 0xfff3e0, ORDER.marking, 0.5, 2);
  solidLine(a, map, 1.55, 0.1, 0xff9ecb, ORDER.marking, 0.6, 1.6);
  solidLine(a, map, -1.55, 0.1, 0xff9ecb, ORDER.marking, 0.6, 1.6);

  // lanterns along the path
  for (let d = 4; d < map.length; d += 17) {
    const p = pointAt(map, d);
    const side = Math.round(d / 17) % 2 ? 1 : -1;
    const x = p.x - Math.sin(p.angle) * 3.6 * side;
    const y = p.y + Math.cos(p.angle) * 3.6 * side;
    a.setOrder(ORDER.propShadow);
    a.circle(x + 0.2, y - 0.2, 0.4, 0x000000, { o: 0.3 });
    a.setOrder(ORDER.prop);
    a.rect(x, y, 0.1, 0.9, 0x3a2a44);
    a.setOrder(ORDER.prop + 1);
    a.circle(x, y + 0.6, 0.26, 0xffc247);
    a.circle(x, y + 0.6, 0.15, 0xfff3e0, { bright: 1.6 });
    a.setOrder(ORDER.glowLow);
    a.glow(x, y + 0.6, 1.9, 0xffb054, 0.22);
  }

  // blossom groves between the folds
  const step = 11;
  for (let gx = b.minX + 4; gx < b.maxX - 4; gx += step) {
    for (let gy = b.minY + 4; gy < b.maxY - 4; gy += step) {
      const seed = Math.floor(gx * 17 + gy * 23);
      if (hash01(seed) > 0.78) continue;
      const x = gx + (hash01(seed + 1) - 0.5) * 5;
      const y = gy + (hash01(seed + 2) - 0.5) * 5;
      if (!inBounds(map, x, y, 2.6)) continue;
      if (pathDist(map, x, y) < 4.6) continue;
      if (hits(blocks, x, y, 1.5)) continue;
      tree(a, x, y, 1.0 + hash01(seed + 3) * 0.5, BLOSSOM_TREE, hash01(seed + 4) * 6.28);
      block(blocks, x, y, 2.2, 2.2);
      if (hash01(seed + 6) > 0.5) bush(a, x + 1.6, y - 1.2, 0.8, 0x6a3f8a);
    }
  }

  // statues at a few corners
  for (let i = 1; i < map.points.length - 1; i += 11) {
    const p = map.points[i];
    const ang = i * 1.7;
    const x = p[0] + Math.cos(ang) * 7.5;
    const y = p[1] + Math.sin(ang) * 7.5;
    if (!inBounds(map, x, y, 5) || pathDist(map, x, y) < 6 || hits(blocks, x, y, 1.6)) continue;
    a.setOrder(ORDER.propShadow);
    a.ellipse(x + 0.3, y - 0.3, 1.4, 1.0, 0x000000, { o: 0.3 });
    a.setOrder(ORDER.prop);
    a.rect(x, y - 0.2, 1.1, 0.6, 0x6a5078);
    a.setOrder(ORDER.prop + 1);
    a.rect(x, y + 0.5, 0.6, 1.4, 0xfff3e0);
    a.circle(x, y + 1.3, 0.32, 0xfff3e0);
    a.circle(x, y + 1.3, 0.18, 0xd9688f);
    a.setOrder(ORDER.prop + 2);
    a.rect(x - 0.55, y + 0.9, 0.3, 0.5, 0xff9ecb, { o: 0.8 });
    a.rect(x + 0.55, y + 0.9, 0.3, 0.5, 0xff9ecb, { o: 0.8 });
    block(blocks, x, y, 2.2, 2.6);
  }

  // fireflies
  a.setOrder(ORDER.fxGlow);
  for (let i = 0; i < 40; i++) {
    const x = b.minX + 5 + hash01(i * 5.3) * (b.w - 10);
    const y = b.minY + 5 + hash01(i * 9.7 + 3) * (b.h - 10);
    a.circle(x, y, 0.1, 0xffe066, { o: 0.5 + hash01(i) * 0.4 });
  }

  gate(a, map, 0x5ee07a, false);
  gate(a, map, 0xff5f4d, true);
}

// ---------------------------------------------------------------------------

export function buildWorldArt(scene, map) {
  const root = new THREE.Group();
  scene.add(root);
  const a = new Art(root, ORDER.prop, false);
  const blocks = [];
  const ctx = { a, map, blocks, root };

  if (map.id === 'city') city(ctx);
  else if (map.id === 'desert') desert(ctx);
  else eternal(ctx);

  for (const child of root.children) {
    if (child.isMesh && child.material && child.material.map) child.userData.noMerge = true;
  }
  mergeStatic(root);
  return { root, blocks };
}
