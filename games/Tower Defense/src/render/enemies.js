import * as THREE from 'three';
import { Art, ORDER, glowMesh } from './art.js';

// ---------------------------------------------------------------------------
// Enemy art. Every painter faces +x so the game can simply point the whole
// group down the road. Bodies are drawn at unit radius; the game scales by
// the enemy's own radius.
// ---------------------------------------------------------------------------

const DARK = 0x241a14;

function eyes(a, x, y, spread, size, look = 0.05, pupil = DARK) {
  a.circle(x, y + spread, size, 0xfff8ec);
  a.circle(x, y - spread, size, 0xfff8ec);
  a.circle(x + look, y + spread, size * 0.48, pupil);
  a.circle(x + look, y - spread, size * 0.48, pupil);
}

function legs(a, count, y, len, width, color) {
  for (let i = 0; i < count; i++) {
    const x = -0.45 + (i / Math.max(1, count - 1)) * 0.9;
    a.rect(x, y - len / 2, width, len, color);
  }
}

function walker(a, def, group) {
  const body = def.body;
  const accent = def.accent;
  legs(a, 2, -0.62, 0.3, 0.16, accent);
  a.ellipse(0, -0.02, 0.6, 0.62, body);
  a.ellipse(-0.08, 0.02, 0.44, 0.46, 0xf0ffe8, { o: 0.2 });
  a.circle(0.1, 0.34, 0.24, body);
  eyes(a, 0.24, 0.36, 0.13, 0.1, 0.05);
  a.rect(0.18, 0.18, 0.2, 0.06, DARK, { o: 0.7 });
  a.circle(-0.42, 0.1, 0.16, accent);
  a.circle(0.42, -0.24, 0.14, accent);
  const arm = new THREE.Group();
  group.add(arm);
  arm.userData.phase = 0;
  group.userData.arm = arm;
}

function bug(a, def, group) {
  const body = def.body;
  const accent = def.accent;
  const legsG = new THREE.Group();
  group.add(legsG);
  const l = new Art(legsG, ORDER.enemy + 6);
  for (let i = 0; i < 3; i++) {
    const x = -0.18 + i * 0.18;
    l.line(x, -0.2, x - 0.16, -0.52, 0.07, accent);
    l.line(x, 0.2, x - 0.16, 0.52, 0.07, accent);
  }
  a.ellipse(-0.08, 0, 0.5, 0.36, body);
  a.ellipse(-0.12, 0, 0.34, 0.22, 0xf0ffe8, { o: 0.25 });
  a.rect(-0.5, 0, 0.3, 0.05, DARK, { o: 0.5 });
  a.circle(0.38, 0, 0.2, body);
  eyes(a, 0.44, 0, 0.1, 0.08, 0.04);
  a.line(0.5, 0.12, 0.72, 0.3, 0.03, accent);
  a.line(0.5, -0.12, 0.72, -0.3, 0.03, accent);
  const wings = new THREE.Group();
  group.add(wings);
  const w = new Art(wings, ORDER.enemy + 8);
  w.poly([[0, 0.2], [-0.3, 0.72], [0.16, 0.4]], 0xfff8ec, { o: 0.4 });
  w.poly([[0, -0.2], [-0.3, -0.72], [0.16, -0.4]], 0xfff8ec, { o: 0.4 });
  group.userData.wings = wings;
  groups.legs = legsG;
}

const groups = {};

function blob(a, def) {
  const body = def.body;
  const accent = def.accent;
  a.ellipse(0, -0.3, 0.72, 0.42, body, { o: 0.55 });
  a.ellipse(0, 0.02, 0.62, 0.58, body);
  a.ellipse(-0.1, 0.16, 0.36, 0.3, 0xfff8ec, { o: 0.28 });
  a.circle(-0.3, -0.3, 0.16, body);
  a.circle(0.28, -0.34, 0.13, body);
  eyes(a, 0.2, 0.1, 0.15, 0.11, 0.05);
  a.circle(0.05, -0.16, 0.1, accent, { o: 0.7 });
}

function bat(a, def, group) {
  const body = def.body;
  const accent = def.accent;
  const wings = new THREE.Group();
  group.add(wings);
  const w = new Art(wings, ORDER.enemy + 4);
  w.poly([[0.1, 0.18], [-0.72, 0.78], [-0.2, 0.1]], accent);
  w.poly([[0.1, -0.18], [-0.72, -0.78], [-0.2, -0.1]], accent);
  w.poly([[-0.2, 0.3], [-0.62, 0.66], [-0.36, 0.16]], 0xfff8ec, { o: 0.35 });
  w.poly([[-0.2, -0.3], [-0.62, -0.66], [-0.36, -0.16]], 0xfff8ec, { o: 0.35 });
  a.circle(0, 0, 0.4, body);
  a.circle(-0.06, 0.02, 0.24, 0xfff8ec, { o: 0.22 });
  a.poly([[0.05, 0.34], [0.2, 0.56], [0.26, 0.3]], body);
  a.poly([[0.05, -0.34], [0.2, -0.56], [0.26, -0.3]], body);
  eyes(a, 0.22, 0.02, 0.11, 0.09, 0.04);
  a.poly([[-0.34, 0.06], [-0.56, 0.16], [-0.36, -0.02]], accent);
  group.userData.wings = wings;
}

function brute(a, def) {
  const body = def.body;
  const accent = def.accent;
  legs(a, 2, -0.66, 0.34, 0.24, accent);
  a.circle(-0.06, -0.06, 0.66, body);
  a.circle(-0.2, 0.04, 0.44, 0xfff8ec, { o: 0.16 });
  a.circle(0.12, 0.3, 0.34, body);
  eyes(a, 0.28, 0.32, 0.12, 0.1, 0.05);
  // shoulders
  a.circle(-0.36, 0.44, 0.24, accent);
  a.circle(-0.36, -0.44, 0.24, accent);
  a.rect(0.16, 0.12, 0.22, 0.08, DARK, { o: 0.7 });
  // knuckles
  a.circle(0.36, 0.5, 0.16, accent);
  a.circle(0.36, -0.5, 0.16, accent);
}

function tank(a, def) {
  const body = def.body;
  const accent = def.accent;
  a.rect(-0.02, -0.04, 1.1, 0.98, accent);
  a.rect(-0.02, -0.04, 0.94, 0.8, body);
  a.rect(-0.02, 0.08, 0.94, 0.16, 0xfff8ec, { o: 0.16 });
  // treads
  for (let i = 0; i < 5; i++) {
    a.rect(-0.42 + i * 0.22, 0.46, 0.14, 0.16, DARK, { o: 0.45 });
    a.rect(-0.42 + i * 0.22, -0.56, 0.14, 0.16, DARK, { o: 0.45 });
  }
  a.circle(0.06, 0.06, 0.34, body);
  a.circle(0.06, 0.06, 0.24, accent);
  eyes(a, 0.2, 0.08, 0.1, 0.09, 0.04);
  a.rect(0.3, 0.04, 0.42, 0.12, DARK, { o: 0.85 });
  a.circle(-0.5, 0.34, 0.1, 0xffc247);
}

function bomber(a, def, group) {
  const body = def.body;
  const accent = def.accent;
  legs(a, 2, -0.6, 0.26, 0.16, accent);
  a.circle(0, 0, 0.52, body);
  a.circle(0, 0.32, 0.28, 0xffd9b0);
  eyes(a, 0.14, 0.34, 0.09, 0.075, 0.03);
  // the package
  a.circle(-0.46, -0.1, 0.36, 0x2a2622);
  a.circle(-0.54, 0.02, 0.1, 0xfff8ec, { o: 0.25 });
  a.line(-0.46, 0.2, -0.32, 0.42, 0.04, 0x8a6a3a);
  const spark = glowMesh(0xffc247, 0.4, 0.7);
  spark.position.set(-0.3, 0.46, 0);
  spark.renderOrder = ORDER.enemy + 20;
  group.add(spark);
  group.userData.spark = spark;
}

function robed(a, def, group) {
  const body = def.body;
  const accent = def.accent;
  a.poly([[-0.5, -0.6], [0.4, -0.6], [0.22, 0.42], [-0.3, 0.42]], accent);
  a.poly([[-0.34, -0.55], [0.28, -0.55], [0.16, 0.2], [-0.2, 0.2]], body);
  a.poly([[-0.3, 0.34], [0.24, 0.34], [0.08, 0.72], [-0.16, 0.72]], accent);
  a.circle(0.06, 0.5, 0.16, DARK);
  eyes(a, 0.12, 0.52, 0.06, 0.05, 0.02, 0xfff3e0);
  // floating orbs
  const orb = glowMesh(0xd9c2ff, 0.5, 0.5);
  orb.position.set(-0.5, 0.24, 0);
  orb.renderOrder = ORDER.enemy + 18;
  group.add(orb);
  group.userData.orb = orb;
}

function ghost(a, def) {
  const body = def.body;
  const accent = def.accent;
  a.poly(
    [
      [-0.44, 0.1],
      [-0.3, -0.5],
      [-0.12, -0.28],
      [0.06, -0.56],
      [0.24, -0.26],
      [0.44, -0.5],
      [0.44, 0.2],
      [0, 0.6],
      [-0.44, 0.2],
    ],
    body,
    { o: 0.92 },
  );
  a.circle(-0.04, 0.24, 0.3, 0xfff8ec, { o: 0.14 });
  eyes(a, 0.14, 0.26, 0.12, 0.1, 0.04);
  a.circle(0.0, 0.0, 0.1, accent, { o: 0.7 });
}

function spike(a, def) {
  const body = def.body;
  const accent = def.accent;
  for (let i = 0; i < 10; i++) {
    const ang = (i / 10) * Math.PI * 2;
    a.poly(
      [
        [Math.cos(ang - 0.16) * 0.5, Math.sin(ang - 0.16) * 0.5],
        [Math.cos(ang) * 0.92, Math.sin(ang) * 0.92],
        [Math.cos(ang + 0.16) * 0.5, Math.sin(ang + 0.16) * 0.5],
      ],
      accent,
    );
  }
  a.circle(0, 0, 0.52, body);
  a.circle(-0.1, 0.1, 0.3, 0xfff8ec, { o: 0.2 });
  eyes(a, 0.18, 0.08, 0.12, 0.09, 0.04);
}

function hound(a, def, group) {
  const body = def.body;
  const accent = def.accent;
  legs(a, 4, -0.52, 0.3, 0.13, accent);
  a.ellipse(-0.1, -0.02, 0.62, 0.42, body);
  a.circle(0.44, 0.08, 0.3, body);
  a.poly([[0.36, 0.3], [0.3, 0.56], [0.52, 0.34]], accent);
  a.poly([[0.36, -0.3], [0.3, -0.56], [0.52, -0.34]], accent);
  a.circle(0.66, 0.02, 0.1, DARK);
  eyes(a, 0.52, 0.1, 0.11, 0.075, 0.03);
  a.poly([[-0.66, 0.1], [-0.98, 0.34], [-0.72, -0.06]], accent);
  a.rect(0.42, -0.16, 0.2, 0.08, 0xfff8ec, { o: 0.7 });
  const tail = new THREE.Group();
  group.add(tail);
  group.userData.tail = tail;
}

function ogre(a, def) {
  const body = def.body;
  const accent = def.accent;
  legs(a, 2, -0.7, 0.36, 0.26, accent);
  a.circle(0, -0.06, 0.72, body);
  a.circle(-0.16, 0.08, 0.46, 0xfff8ec, { o: 0.14 });
  a.circle(0.2, 0.36, 0.3, body);
  eyes(a, 0.32, 0.38, 0.1, 0.085, 0.04);
  a.rect(0.2, 0.2, 0.24, 0.09, DARK, { o: 0.75 });
  // club
  a.line(-0.4, -0.5, -0.94, -0.94, 0.14, 0x8a5a2a);
  a.circle(-1.0, -1.0, 0.24, 0x6a4420);
  a.circle(-1.06, -1.06, 0.1, 0x9c6a44);
}

function bossWarden(a, def, group) {
  a.circle(0, -0.05, 1.0, 0x6a4a2a);
  a.circle(0, -0.05, 0.9, 0xff9a3d);
  a.circle(-0.2, 0.06, 0.58, 0xffd9a0, { o: 0.35 });
  a.rect(-0.1, 0.05, 0.7, 0.16, 0x6a4a2a, { o: 0.55 });
  a.circle(0.42, 0.46, 0.4, 0xffb054);
  eyes(a, 0.58, 0.48, 0.16, 0.1, 0.05);
  // hat
  a.circle(0.42, 0.66, 0.36, 0x2f2a24);
  a.rect(0.42, 0.58, 1.0, 0.12, 0x2f2a24);
  // lamp
  const glow = glowMesh(0xffe066, 1.4, 0.5);
  glow.position.set(0.42, 0.86, 0);
  glow.renderOrder = ORDER.enemy + 22;
  group.add(glow);
  a.circle(0.42, 0.86, 0.18, 0xffe066, { bright: 1.5 });
  // keys on a ring
  a.circle(-0.62, -0.5, 0.22, 0xe0a93d);
  a.circle(-0.62, -0.5, 0.12, 0x6a4a2a);
  a.rect(-0.62, -0.82, 0.08, 0.3, 0xe0a93d);
  // baton
  a.rect(0.6, -0.5, 0.5, 0.12, 0xfff3e0, { r: -0.5 });
  group.userData.boss = true;
}

function bossTyrant(a, def, group) {
  a.circle(0, -0.05, 1.05, 0x8a1f1a);
  a.circle(0, -0.05, 0.94, def.body);
  a.circle(-0.24, 0.06, 0.6, 0xfff3e0, { o: 0.16 });
  // shoulder spikes
  for (const s of [1, -1]) {
    a.poly([[-0.2, 0.6 * s], [-0.9, 1.0 * s], [-0.5, 0.2 * s]], 0xffc247);
  }
  a.circle(0.5, 0.4, 0.42, 0xff6a5a);
  eyes(a, 0.66, 0.42, 0.15, 0.09, 0.05);
  // crown
  for (let i = 0; i < 5; i++) {
    const ang = -0.9 + i * 0.45;
    a.poly(
      [
        [0.5 + Math.cos(ang) * 0.28, 0.4 + Math.sin(ang) * 0.28],
        [0.5 + Math.cos(ang) * 0.62, 0.4 + Math.sin(ang) * 0.62],
        [0.5 + Math.cos(ang + 0.22) * 0.28, 0.4 + Math.sin(ang + 0.22) * 0.28],
      ],
      0xffc247,
    );
  }
  // mace
  a.rect(-0.7, -0.5, 0.9, 0.12, 0x4a3a2a, { r: -0.3 });
  a.circle(-0.96, -0.72, 0.26, 0x8a9490);
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2;
    a.poly(
      [
        [Math.cos(ang - 0.14) * 0.24 - 0.96, Math.sin(ang - 0.14) * 0.24 - 0.72],
        [Math.cos(ang) * 0.42 - 0.96, Math.sin(ang) * 0.42 - 0.72],
        [Math.cos(ang + 0.14) * 0.24 - 0.96, Math.sin(ang + 0.14) * 0.24 - 0.72],
      ],
      0xb0b8b4,
    );
  }
  group.userData.boss = true;
}

function bossProphet(a, def, group) {
  // halo
  a.ring(0.1, 0.1, 0.8, 0.92, 0xfff3e0, { o: 0.55, seg: 48 });
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * Math.PI * 2;
    a.circle(0.1 + Math.cos(ang) * 0.86, 0.1 + Math.sin(ang) * 0.86, 0.05, 0xfff3e0, { o: 0.85 });
  }
  // robe
  a.poly([[-0.6, -0.8], [0.55, -0.8], [0.36, 0.44], [-0.42, 0.44]], 0x5a3fa8);
  a.poly([[-0.44, -0.72], [0.4, -0.72], [0.26, 0.24], [-0.3, 0.24]], def.body);
  // hood and face
  a.poly([[-0.26, 0.34], [0.34, 0.34], [0.06, 0.84], [-0.06, 0.84]], 0x5a3fa8);
  a.circle(0.06, 0.56, 0.18, 0x1d1430);
  // many eyes
  for (const [dx, dy] of [
    [0.06, 0.52],
    [0.18, 0.62],
    [-0.06, 0.64],
  ]) {
    a.circle(dx, dy, 0.05, 0xfff3e0, { bright: 1.2 });
  }
  // sceptre
  a.line(0.52, -0.6, 0.72, 0.62, 0.07, 0xffc247);
  a.star(0.74, 0.72, 0.2, 6, 0xfff3e0, { o: 0.95, inner: 0.4 });
  const glow = glowMesh(0xb98cff, 2.0, 0.28);
  glow.position.set(0, 0.1, 0);
  glow.renderOrder = ORDER.enemy + 24;
  group.add(glow);
  group.userData.boss = true;
}

function bossEternal(a, def, group) {
  // rays
  for (let i = 0; i < 16; i++) {
    const ang = (i / 16) * Math.PI * 2;
    a.poly(
      [
        [Math.cos(ang - 0.07) * 0.9, Math.sin(ang - 0.07) * 0.9],
        [Math.cos(ang) * 1.6, Math.sin(ang) * 1.6],
        [Math.cos(ang + 0.07) * 0.9, Math.sin(ang + 0.07) * 0.9],
      ],
      i % 2 ? 0xffc247 : 0xfff3e0,
      { o: i % 2 ? 0.7 : 0.95 },
    );
  }
  a.circle(0, 0, 0.92, 0xffc247);
  a.circle(0, 0, 0.78, 0xfff3e0);
  a.circle(0, 0, 0.6, 0xffe0a0);
  // face
  a.ellipse(0.08, 0, 0.42, 0.3, 0xff5f4d);
  a.circle(0.18, 0, 0.14, 0x241a14);
  a.circle(0.22, 0.06, 0.05, 0xfff3e0, { bright: 1.5 });
  // crown of eyes
  for (let i = 0; i < 5; i++) {
    const ang = -0.8 + i * 0.4;
    a.circle(Math.cos(ang) * 0.5, Math.sin(ang) * 0.5, 0.06, 0x241a14);
  }
  // wings
  for (const s of [1, -1]) {
    a.poly(
      [
        [-0.1, 0.5 * s],
        [-1.4, 1.3 * s],
        [-0.5, 0.4 * s],
        [-1.2, 0.3 * s],
      ],
      0xfff3e0,
      { o: 0.5 },
    );
  }
  const glow = glowMesh(0xffd76a, 2.6, 0.4);
  glow.position.set(0, 0, 0);
  glow.renderOrder = ORDER.enemy + 26;
  group.add(glow);
  group.userData.boss = true;
}

const PAINTERS = {
  walker,
  bug,
  blob,
  bat,
  brute,
  tank,
  bomber,
  robed,
  ghost,
  spike,
  hound,
  ogre,
  bossWarden,
  bossTyrant,
  bossProphet,
  bossEternal,
};

export function buildEnemyVisual(def) {
  const group = new THREE.Group();
  const a = new Art(group, ORDER.enemy);
  const painter = PAINTERS[def.shape] || blob;
  painter(a, def, group);

  // health bar (hidden until damaged)
  const bar = new THREE.Group();
  bar.position.set(0, 1.45, 0);
  const bg = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 0.2),
    new THREE.MeshBasicMaterial({ color: 0x1a120c, transparent: true, opacity: 0.8, depthTest: false, depthWrite: false }),
  );
  const fill = new THREE.Mesh(
    new THREE.PlaneGeometry(1.44, 0.14),
    new THREE.MeshBasicMaterial({ color: 0x5ee07a, transparent: true, depthTest: false, depthWrite: false }),
  );
  bg.renderOrder = ORDER.hp;
  fill.renderOrder = ORDER.hp + 1;
  fill.position.x = 0;
  bar.add(bg, fill);
  bar.scale.setScalar(1 / Math.max(1, def.r));
  group.add(bar);
  group.userData.hpBar = bar;
  group.userData.hpFill = fill;

  group.scale.setScalar(def.r);
  return group;
}
