import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Flat vector art toolkit.
//
// Everything is unlit and depth-test free, so the whole game is painted like a
// poster: shapes stack in the order they are drawn. `Art` bumps renderOrder on
// every primitive so painters never have to think about it.
// ---------------------------------------------------------------------------

const geoCache = new Map();
const matCache = new Map();
let glowTexture = null;

export const ORDER = {
  ambient: 0,
  ground: 10,
  patches: 20,
  decal: 30,
  pathBase: 40,
  path: 50,
  marking: 60,
  propShadow: 70,
  prop: 80,
  glowLow: 90,
  cell: 100,
  towerBase: 500,
  enemyShadow: 700,
  enemy: 710,
  fx: 900,
  fxGlow: 930,
  hp: 960,
  ui: 990,
};

function cached(cache, key, make) {
  let v = cache.get(key);
  if (!v) {
    v = make();
    cache.set(key, v);
  }
  return v;
}

export function unitCircle() {
  return cached(geoCache, 'circle', () => new THREE.CircleGeometry(1, 44));
}

export function unitRect() {
  return cached(geoCache, 'rect', () => new THREE.PlaneGeometry(1, 1));
}

export function polyGeo(points) {
  const key = 'p:' + points.map((p) => `${p[0].toFixed(3)},${p[1].toFixed(3)}`).join(';');
  return cached(geoCache, key, () => {
    const shape = new THREE.Shape();
    shape.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) shape.lineTo(points[i][0], points[i][1]);
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  });
}

export function ringGeo(r0, r1, seg = 44) {
  const key = `r:${r0.toFixed(3)}:${r1.toFixed(3)}:${seg}`;
  return cached(geoCache, key, () => new THREE.RingGeometry(r0, r1, seg));
}

export function solid(color, opacity = 1, bright = 1) {
  return cached(matCache, `s:${color}:${opacity}:${bright}`, () => {
    const c = new THREE.Color(color);
    if (bright !== 1) c.multiplyScalar(bright);
    return new THREE.MeshBasicMaterial({
      color: c,
      transparent: true,
      opacity,
      depthTest: false,
      depthWrite: false,
    });
  });
}

export function additive(color, opacity = 1, bright = 1) {
  return cached(matCache, `a:${color}:${opacity}:${bright}`, () => {
    const c = new THREE.Color(color);
    if (bright !== 1) c.multiplyScalar(bright);
    return new THREE.MeshBasicMaterial({
      color: c,
      transparent: true,
      opacity,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  });
}

export function softTexture() {
  if (glowTexture) return glowTexture;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.3, 'rgba(255,255,255,0.5)');
  g.addColorStop(0.62, 'rgba(255,255,255,0.15)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  glowTexture = new THREE.CanvasTexture(canvas);
  glowTexture.colorSpace = THREE.SRGBColorSpace;
  return glowTexture;
}

export function glowMesh(color, radius, opacity = 1) {
  const material = new THREE.MeshBasicMaterial({
    map: softTexture(),
    color: new THREE.Color(color),
    transparent: true,
    opacity,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(unitRect(), material);
  mesh.scale.set(radius * 2, radius * 2, 1);
  return mesh;
}

// ---------------------------------------------------------------------------
// Art — paints shapes into a group, stacking each new shape on top.
// ---------------------------------------------------------------------------

export class Art {
  constructor(group, order = ORDER.prop, auto = true) {
    this.group = group;
    this.start = order;
    this.order = order;
    this.auto = auto;
    this.n = 0;
  }

  next() {
    const o = this.start + (this.auto ? this.n : 0);
    this.n++;
    return o;
  }

  // Pin every following shape to one layer, so world art merges into a
  // handful of draw calls while still painting in a controlled order.
  setOrder(order) {
    this.start = order;
    this.n = 0;
    this.auto = false;
    return this;
  }

  _mat(color, o) {
    if (color && color.isMaterial) return color;
    return o.add ? additive(color, o.o ?? 1, o.bright ?? 1) : solid(color, o.o ?? 1, o.bright ?? 1);
  }

  _add(mesh) {
    mesh.renderOrder = this.next();
    this.group.add(mesh);
    return mesh;
  }

  rect(x, y, w, h, color, o = {}) {
    const m = new THREE.Mesh(unitRect(), this._mat(color, o));
    m.position.set(x, y, 0);
    m.scale.set(w, h, 1);
    if (o.r) m.rotation.z = o.r;
    return this._add(m);
  }

  circle(x, y, r, color, o = {}) {
    const m = new THREE.Mesh(unitCircle(), this._mat(color, o));
    m.position.set(x, y, 0);
    m.scale.setScalar(r);
    if (o.r) m.rotation.z = o.r;
    return this._add(m);
  }

  ellipse(x, y, rx, ry, color, o = {}) {
    const m = new THREE.Mesh(unitCircle(), this._mat(color, o));
    m.position.set(x, y, 0);
    m.scale.set(rx, ry, 1);
    if (o.r) m.rotation.z = o.r;
    return this._add(m);
  }

  ring(x, y, r0, r1, color, o = {}) {
    const m = new THREE.Mesh(ringGeo(r0, r1, o.seg || 44), this._mat(color, o));
    m.position.set(x, y, 0);
    if (o.r) m.rotation.z = o.r;
    return this._add(m);
  }

  poly(points, color, o = {}) {
    const m = new THREE.Mesh(polyGeo(points), this._mat(color, o));
    m.position.set(o.x || 0, o.y || 0, 0);
    if (o.r) m.rotation.z = o.r;
    if (o.s) m.scale.setScalar(o.s);
    return this._add(m);
  }

  line(x1, y1, x2, y2, w, color, o = {}) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len < 1e-5) return null;
    const m = new THREE.Mesh(unitRect(), this._mat(color, o));
    m.position.set((x1 + x2) / 2, (y1 + y2) / 2, 0);
    m.rotation.z = Math.atan2(dy, dx);
    m.scale.set(len, Math.max(0.01, w), 1);
    return this._add(m);
  }

  star(x, y, r, points, color, o = {}) {
    const pts = [];
    for (let i = 0; i < points * 2; i++) {
      const rad = i % 2 ? r * (o.inner ?? 0.45) : r;
      const ang = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2 + (o.r || 0);
      pts.push([Math.cos(ang) * rad, Math.sin(ang) * rad]);
    }
    return this.poly(pts, color, { x, y, o: o.o, add: o.add, bright: o.bright });
  }

  glow(x, y, r, color, opacity = 1) {
    const m = glowMesh(color, r, opacity);
    m.position.set(x, y, 0);
    m.userData.noMerge = true;
    return this._add(m);
  }

  shadow(x, y, rx, ry, opacity = 0.34, rot = 0) {
    return this.ellipse(x, y, rx, ry, 0x000000, { o: opacity, r: rot });
  }
}

// Merges every static mesh in a group by (material, renderOrder).
export function mergeStatic(root) {
  const buckets = new Map();
  const doomed = [];

  root.traverse((o) => {
    if (!o.isMesh || o.userData.noMerge) return;
    const key = `${o.material.uuid}|${o.renderOrder}`;
    let b = buckets.get(key);
    if (!b) {
      b = { material: o.material, order: o.renderOrder, geos: [] };
      buckets.set(key, b);
    }
    o.updateMatrix();
    const geo = o.geometry.clone();
    geo.applyMatrix4(o.matrix);
    b.geos.push(geo);
    doomed.push(o);
  });

  for (const o of doomed) o.parent && o.parent.remove(o);
  root.clear();

  for (const b of buckets.values()) {
    if (!b.geos.length) continue;
    const merged = mergeGeometries(b.geos);
    for (const g of b.geos) g.dispose();
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, b.material);
    mesh.renderOrder = b.order;
    root.add(mesh);
  }
  return root;
}

function mergeGeometries(geos) {
  let vertexCount = 0;
  let indexCount = 0;
  for (const g of geos) {
    const pos = g.getAttribute('position');
    if (!pos) continue;
    vertexCount += pos.count;
    indexCount += g.index ? g.index.count : pos.count;
  }
  if (!vertexCount) return null;

  const positions = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const indices = new Uint32Array(indexCount);
  let vo = 0;
  let io = 0;

  for (const g of geos) {
    const pos = g.getAttribute('position');
    if (!pos) continue;
    const uv = g.getAttribute('uv');
    positions.set(pos.array, vo * 3);
    if (uv) uvs.set(uv.array, vo * 2);
    if (g.index) {
      const src = g.index.array;
      for (let i = 0; i < src.length; i++) indices[io + i] = src[i] + vo;
      io += src.length;
    } else {
      for (let i = 0; i < pos.count; i++) indices[io + i] = vo + i;
      io += pos.count;
    }
    vo += pos.count;
  }

  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  out.setIndex(new THREE.BufferAttribute(indices, 1));
  out.computeBoundingSphere();
  return out;
}

export function hash01(n) {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}
