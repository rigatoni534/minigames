import * as THREE from 'three';
import { Art, ORDER, glowMesh } from './art.js';

// ---------------------------------------------------------------------------
// The fourteen towers.
//
// Each one is a hand-built diorama with its own silhouette: a tent, a callbox,
// a hydrant, a sandbag nest, a jeep, a sniper nest, a lawn chair, a minigun,
// a ruby lens, a mortar, a sunburst, an ice-cream cart, a barn and a vault.
// Nothing sits on a shared plinth.
// ---------------------------------------------------------------------------

const C = {
  cream: 0xfff3e0,
  ink: 0x2a1d14,
  dark: 0x38281e,
  orange: 0xff8a3d,
  red: 0xff4d5e,
  green: 0x5ec86a,
  gold: 0xffc247,
  mint: 0x9ff0d8,
  steel: 0x8a9490,
  brass: 0xe0a93d,
};

function shadowFor(a, r = 1.05) {
  a.ellipse(0.12, -0.18, r * 1.05, r * 0.78, 0x000000, { o: 0.3 });
}

function rank(a, level) {
  if (level < 2) return;
  for (let i = 0; i < level - 1; i++) {
    a.star(-0.55 + i * 0.26, -1.0, 0.11, 4, C.gold, { o: 0.95, inner: 0.35 });
  }
}

// ---------------------------------------------------------------- 1. scout
function scout(a, turret) {
  shadowFor(a, 1.0);
  a.circle(-0.82, -0.45, 0.1, 0x3f7a4a, { o: 0.9 });
  a.circle(0.86, -0.5, 0.09, 0x3f7a4a, { o: 0.9 });
  a.circle(0.62, 0.62, 0.08, 0x4f8f52, { o: 0.75 });

  // guy ropes and pegs
  a.line(0, 0.78, -1.02, 0.24, 0.035, 0xf0e2c8, { o: 0.55 });
  a.line(0, 0.78, 1.02, 0.24, 0.035, 0xf0e2c8, { o: 0.55 });

  // canvas: two halves so the ridge reads
  a.poly([[-0.9, -0.66], [0, 0.78], [0, -0.66]], 0xd9a521);
  a.poly([[0, -0.66], [0, 0.78], [0.9, -0.66]], 0xf6c445);
  a.poly([[-0.62, -0.6], [0, 0.36], [-0.06, -0.6]], 0xffe08a, { o: 0.55 });
  // door flap
  a.poly([[-0.2, -0.66], [0, 0.12], [0.2, -0.66]], 0x8a5a1f);
  a.poly([[-0.12, -0.66], [0, -0.02], [0.06, -0.66]], 0x2a1d14, { o: 0.9 });

  // pennant
  a.line(0.72, -0.62, 0.72, 0.3, 0.05, C.cream);
  a.poly([[0.72, 0.3], [1.16, 0.12], [0.72, -0.06]], 0xff5f4d);

  // the plinker
  a.rect(-0.02, 0.12, 0.62, 0.1, 0x3a3733);
  a.rect(0.28, 0.05, 0.16, 0.14, 0x2a2622);
  a.line(0.32, 0.12, 0.86, 0.12, 0.055, 0x6a635a);
  if (turret) {
    const b = new Art(turret, ORDER.towerBase + 200);
    b.line(0, 0, 0.82, 0, 0.075, 0x4a453f);
    b.rect(0.06, -0.02, 0.28, 0.16, 0x8a5a2a);
    b.circle(0.82, 0, 0.045, 0xffd166, { bright: 1.3 });
  }
}

// -------------------------------------------------------------- 2. enforcer
function enforcer(a, turret) {
  shadowFor(a, 1.0);
  // callbox
  a.rect(0, -0.06, 1.12, 1.24, 0x2f5f9e);
  a.rect(0, 0.5, 1.12, 0.24, 0x3f7fd0);
  a.rect(0, 0.02, 0.94, 0.44, 0xe8f0ff, { o: 0.95 });
  a.rect(0, 0.02, 0.82, 0.3, 0x9ec8ff, { o: 0.55 });
  a.rect(0, -0.52, 1.12, 0.2, 0x24486f);
  // little crest
  a.circle(0, 0.26, 0.11, 0xffc247);
  a.circle(0, 0.26, 0.06, 0xff8a3d);
  // base curb
  a.rect(0, -0.66, 1.24, 0.16, 0x1f3f5e);
  // blinking roof light
  a.circle(0, 0.66, 0.16, 0xff4d5e, { bright: 1.2 });
  a.circle(0, 0.66, 0.3, 0xff4d5e, { o: 0.16, add: true });
  if (turret) {
    const b = new Art(turret, ORDER.towerBase + 200);
    b.rect(0.02, 0, 0.5, 0.13, 0x2a2a2a);
    b.rect(0.44, 0, 0.5, 0.16, 0xfff3e0);
    b.rect(0.66, 0, 0.1, 0.24, 0xff8a3d);
    b.circle(-0.02, 0, 0.14, 0xfff3e0);
  }
}

// ---------------------------------------------------------------- 3. crowd
function crowd(a, turret) {
  shadowFor(a, 1.0);
  // hose coil on the lawn
  a.ring(0.48, -0.42, 0.3, 0.44, 0xff8a3d, { o: 0.95, seg: 26 });
  a.ring(0.48, -0.42, 0.12, 0.2, 0xd9642a, { o: 0.8, seg: 20 });

  // hydrant
  a.rect(-0.35, -0.12, 0.46, 0.96, 0xff5f2e);
  a.circle(-0.35, 0.36, 0.23, 0xff8a3d);
  a.circle(-0.35, -0.58, 0.28, 0xd94a1f);
  a.rect(-0.35, 0.02, 0.66, 0.14, 0xffb054);
  a.circle(-0.35, 0.52, 0.09, 0xfff3e0, { o: 0.9 });
  a.circle(-0.72, -0.1, 0.11, 0xffb054);
  a.circle(0.02, -0.1, 0.11, 0xffb054);
  // pressure gauge
  a.circle(-0.35, -0.24, 0.12, 0xfff3e0);
  a.circle(-0.35, -0.24, 0.05, 0x2a1d14);

  if (turret) {
    const b = new Art(turret, ORDER.towerBase + 200);
    b.rect(0, 0, 0.5, 0.16, 0xffb054);
    b.rect(0.3, 0, 0.62, 0.2, 0xff8a3d);
    b.rect(0.62, 0, 0.16, 0.3, 0xfff3e0);
    b.circle(0.7, 0, 0.1, 0x9ff0d8, { o: 0.7 });
  }
}

// -------------------------------------------------------------- 4. soldier
function soldier(a, turret) {
  shadowFor(a, 1.05);
  // sandbag ring
  for (let i = 0; i < 7; i++) {
    const ang = Math.PI * 0.15 + (i / 6) * Math.PI * 0.7;
    const x = Math.cos(ang) * 0.86;
    const y = Math.sin(ang) * 0.72 - 0.24;
    a.ellipse(x, y, 0.26, 0.17, 0xbfa77e, { r: ang });
    a.ellipse(x - 0.04, y + 0.04, 0.16, 0.09, 0xd8c39a, { r: ang });
  }
  // boots
  a.rect(-0.2, -0.44, 0.24, 0.32, 0x3d5c35);
  a.rect(0.16, -0.44, 0.24, 0.32, 0x3d5c35);
  // torso
  a.rect(0, -0.08, 0.62, 0.42, 0x5c8a45);
  a.rect(0, -0.08, 0.22, 0.42, 0x7aa855, { o: 0.8 });
  // helmet
  a.circle(0, 0.24, 0.3, 0x3f6b33);
  a.circle(0, 0.27, 0.24, 0x5c8a45);
  a.ring(0, 0.16, 0.3, 0.38, 0x33562a, { o: 0.9, seg: 26 });
  // rifle
  a.line(-0.1, 0.05, 0.94, 0.32, 0.08, 0x2f2a24);
  a.rect(0.5, 0.24, 0.2, 0.14, 0xe0a93d);
  if (turret) {
    const b = new Art(turret, ORDER.towerBase + 200);
    b.line(0, 0, 0.98, 0, 0.075, 0x2f2a24);
    b.rect(0.1, -0.02, 0.3, 0.15, 0xe0a93d);
    b.circle(0.98, 0, 0.05, 0xfff3e0, { o: 0.8 });
  }
}

// --------------------------------------------------------------- 5. patrol
function patrol(root, a, turret) {
  shadowFor(a, 1.15);
  // wheels
  for (const [x, y] of [
    [-0.52, -0.42],
    [0.52, -0.42],
    [-0.52, 0.34],
    [0.52, 0.34],
  ]) {
    a.rect(x, y, 0.34, 0.24, 0x241f1b);
    a.rect(x, y, 0.16, 0.1, 0x6a635a, { o: 0.8 });
  }
  // body
  a.rect(0, -0.02, 1.5, 0.86, 0xd93f34);
  a.rect(0, 0.28, 1.5, 0.16, 0xfff3e0, { o: 0.95 });
  a.poly([[-0.3, 0.06], [0.42, 0.06], [0.3, 0.3], [-0.2, 0.3]], 0x9ec8ff, { o: 0.85 });
  a.rect(0.64, 0.06, 0.24, 0.52, 0x8a2a20);
  // headlights
  a.circle(0.76, -0.18, 0.06, 0xffe9a8, { bright: 1.4 });
  a.circle(-0.76, -0.18, 0.05, 0xff9a8a, { o: 0.9 });
  // light bar
  a.rect(0, 0.42, 0.44, 0.12, 0x241f1b);
  a.rect(-0.1, 0.42, 0.18, 0.1, 0xff4d5e, { bright: 1.2 });
  a.rect(0.1, 0.42, 0.18, 0.1, 0x5aa9ff, { bright: 1.2 });
  if (turret) {
    const b = new Art(turret, ORDER.towerBase + 200);
    b.circle(0, 0, 0.2, 0x241f1b);
    b.line(0, 0, 0.82, 0, 0.09, 0x3a3632);
    b.rect(0.36, 0.02, 0.26, 0.14, 0xfff3e0, { o: 0.9 });
  }
}

// ---------------------------------------------------------------- 6. sniper
function sniper(a, turret) {
  shadowFor(a, 1.0);
  // tripod
  for (const ang of [1.1, 2.6, 4.3]) {
    a.line(0, 0, Math.cos(ang) * 0.78, Math.sin(ang) * 0.6 - 0.18, 0.07, 0x4a4038);
  }
  a.circle(0, -0.05, 0.2, 0x5c5044);
  // stool + pack
  a.rect(-0.42, -0.4, 0.34, 0.26, 0x5c8a45);
  a.rect(-0.42, -0.4, 0.34, 0.08, 0x7aa855);
  a.rect(-0.42, -0.28, 0.3, 0.1, 0x3f6b33);
  // long rifle
  a.line(-0.5, 0.18, 1.28, 0.28, 0.1, 0x2f2a24);
  a.line(0.5, 0.22, 1.3, 0.3, 0.05, 0xa8a094);
  a.rect(-0.14, 0.16, 0.34, 0.18, 0x4a3a2a);
  a.circle(0.16, 0.34, 0.09, 0x1f1b18);
  a.circle(0.16, 0.34, 0.045, 0x9ff0d8, { bright: 1.6 });
  // bipod
  a.line(1.02, 0.26, 1.16, -0.02, 0.04, 0x3a3632);
  a.line(1.02, 0.26, 1.32, 0.06, 0.04, 0x3a3632);
  if (turret) {
    const b = new Art(turret, ORDER.towerBase + 200);
    b.line(0, 0, 1.5, 0, 0.09, 0x2f2a24);
    b.line(0.2, 0, 1.48, 0, 0.04, 0xb0a89a);
    b.rect(-0.16, 0, 0.3, 0.16, 0x4a3a2a);
    b.circle(0.06, 0.1, 0.08, 0x1f1b18);
  }
}

// ----------------------------------------------------------------- 7. based
function based(a, turret) {
  shadowFor(a, 1.15);
  // cooler
  a.rect(-0.72, -0.52, 0.34, 0.3, 0xfff3e0);
  a.rect(-0.72, -0.46, 0.34, 0.1, 0x5aa9ff, { o: 0.9 });
  // lounger
  a.poly([[-0.62, -0.34], [0.52, -0.34], [0.74, 0.06], [-0.46, 0.06]], 0xff8a3d);
  a.poly([[-0.5, -0.26], [0.44, -0.26], [0.58, 0.0], [-0.38, 0.0]], 0xffc247, { o: 0.9 });
  for (let i = 0; i < 4; i++) {
    a.line(-0.46 + i * 0.24, -0.32, -0.36 + i * 0.24, 0.04, 0.045, 0xfff3e0, { o: 0.8 });
  }
  // dude
  a.rect(0.06, 0.06, 0.42, 0.26, 0x5ec86a);
  a.circle(0.06, 0.26, 0.16, 0xffd9b0);
  a.rect(0.06, 0.34, 0.32, 0.1, 0xff5f4d);
  a.circle(0.06, 0.38, 0.16, 0xff5f4d);
  a.circle(0.18, 0.28, 0.03, 0x2a1d14);
  // can
  a.rect(0.34, 0.1, 0.1, 0.16, 0xfff3e0);
  // umbrella
  a.line(-0.86, 0.5, -0.86, -0.1, 0.06, 0xd9c39a);
  a.circle(-0.86, 0.58, 0.62, 0xff4d5e);
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2;
    a.line(-0.86, 0.58, -0.86 + Math.cos(ang) * 0.6, 0.58 + Math.sin(ang) * 0.6, 0.03, 0xfff3e0, { o: 0.7 });
  }
  a.circle(-0.86, 0.58, 0.09, 0xffc247);
  if (turret) {
    const b = new Art(turret, ORDER.towerBase + 200);
    b.line(0.05, 0, 0.72, 0, 0.09, 0x2f2a24);
    b.rect(0.1, -0.02, 0.26, 0.14, 0x8a5a2a);
    b.rect(0.28, 0.0, 0.18, 0.2, 0x241f1b);
  }
}

// -------------------------------------------------------------- 8. minigun
function minigun(a, turret) {
  shadowFor(a, 1.05);
  for (const ang of [0.6, 2.7, 4.6]) {
    a.line(0, -0.2, Math.cos(ang) * 0.86, Math.sin(ang) * 0.62 - 0.24, 0.09, 0x3a3632);
    a.circle(Math.cos(ang) * 0.86, Math.sin(ang) * 0.62 - 0.24, 0.08, 0x241f1b);
  }
  a.circle(0, -0.16, 0.34, 0x5c5044);
  // ammo box + belt
  a.rect(-0.72, -0.5, 0.44, 0.34, 0x4a5c3a);
  a.rect(-0.72, -0.4, 0.44, 0.1, 0xe0a93d, { o: 0.9 });
  a.line(-0.5, -0.34, -0.1, -0.2, 0.08, 0xe0a93d);
  if (turret) {
    const b = new Art(turret, ORDER.towerBase + 200);
    const drum = new THREE.Group();
    turret.add(drum);
    const d = new Art(drum, ORDER.towerBase + 210);
    d.circle(0, 0, 0.24, 0x241f1b);
    d.circle(0, 0, 0.16, 0x6a635a);
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      d.rect(Math.cos(ang) * 0.11, Math.sin(ang) * 0.11, 0.62, 0.07, 0x8a9490, { r: ang });
    }
    d.circle(0, 0, 0.07, 0xffc247, { bright: 1.3 });
    d.rect(0.5, -0.04, 0.24, 0.08, 0x241f1b);
    turret.userData.spin = drum;
  }
}

// ----------------------------------------------------------------- 9. laser
function laser(a, turret) {
  shadowFor(a, 1.0);
  // tripod fins
  for (let i = 0; i < 3; i++) {
    const ang = Math.PI / 2 + (i / 3) * Math.PI * 2;
    a.poly(
      [
        [0, 0],
        [Math.cos(ang - 0.22) * 0.95, Math.sin(ang - 0.22) * 0.72],
        [Math.cos(ang + 0.22) * 0.95, Math.sin(ang + 0.22) * 0.72],
      ],
      0x3a2a3c,
      { x: 0, y: -0.14 },
    );
  }
  a.circle(0, -0.14, 0.44, 0x2a1d2e);
  a.ring(0, -0.14, 0.34, 0.46, 0xff4d5e, { o: 0.55, seg: 34 });
  a.circle(0, -0.14, 0.2, 0xff8a3d, { bright: 1.2 });
  // heat sink fins
  for (let i = 0; i < 4; i++) {
    a.rect(-0.5 + i * 0.2, -0.44, 0.06, 0.16, 0x8a9490, { o: 0.8 });
  }
  if (turret) {
    const b = new Art(turret, ORDER.towerBase + 200);
    b.ring(0.36, 0, 0.26, 0.34, 0x8a9490, { o: 0.9, seg: 30 });
    b.ring(0.36, 0, 0.16, 0.2, 0xffc247, { o: 0.9, seg: 26 });
    b.circle(0.4, 0, 0.13, 0xff4d5e, { bright: 2.0 });
    b.rect(-0.2, -0.16, 0.3, 0.32, 0x4a3a4c);
    b.circle(0.4, 0, 0.36, 0xff4d5e, { o: 0.14, add: true });
  }
}

// ---------------------------------------------------------------- 10. bomber
function bomber(a, turret) {
  shadowFor(a, 1.1);
  // shell crates
  a.rect(-0.62, -0.5, 0.5, 0.34, 0x5c4a32);
  a.rect(-0.62, -0.4, 0.5, 0.08, 0xffc247, { o: 0.85 });
  for (let i = 0; i < 3; i++) {
    const x = -0.76 + i * 0.14;
    a.rect(x, -0.16, 0.09, 0.24, 0xff8a3d);
    a.circle(x, -0.02, 0.055, 0xffc247);
    a.rect(x, -0.22, 0.09, 0.04, 0x2a1d14, { o: 0.6 });
  }
  // base plate + bipod
  a.rect(0.16, -0.36, 0.62, 0.2, 0x3a3632);
  a.line(0.0, -0.3, -0.18, -0.06, 0.07, 0x4a423a);
  a.line(0.42, -0.3, 0.56, -0.06, 0.07, 0x4a423a);
  // tube
  a.rect(0.14, 0.06, 0.94, 0.36, 0xff7a2f, { r: 0.62 });
  a.rect(0.14, 0.14, 0.9, 0.1, 0x2a1d14, { r: 0.62, o: 0.75 });
  a.circle(0.42, 0.42, 0.14, 0x3a2a1e);
  if (turret) {
    const b = new Art(turret, ORDER.towerBase + 200);
    b.rect(0.2, 0.02, 1.0, 0.28, 0x5c5044);
    b.rect(0.44, 0.02, 0.5, 0.32, 0xff7a2f);
    b.rect(0.5, 0.02, 0.1, 0.34, 0x2a1d14, { o: 0.8 });
    b.circle(0.7, 0.02, 0.13, 0x2a1d14);
  }
}

// ------------------------------------------------------------------ 11. god
function god(a, turret) {
  a.shadow(0.1, -0.24, 1.2, 0.72, 0.28);
  // ground halo
  a.ring(0, -0.24, 0.95, 1.16, 0xffc247, { o: 0.35, seg: 48 });
  a.ring(0, -0.24, 0.7, 0.78, 0xfff3e0, { o: 0.22, seg: 40 });
  a.circle(0, -0.24, 1.2, 0xffc247, { o: 0.07, add: true });

  // lower crown of rays
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * Math.PI * 2;
    a.poly(
      [
        [0, 0],
        [Math.cos(ang - 0.09) * 1.32, Math.sin(ang - 0.09) * 1.32],
        [Math.cos(ang + 0.09) * 1.32, Math.sin(ang + 0.09) * 1.32],
      ],
      0xffc247,
      { o: i % 2 ? 0.55 : 0.9 },
    );
  }
  // disc
  a.circle(0, 0, 0.78, 0xffb054);
  a.circle(0, 0, 0.66, 0xffd76a);
  a.circle(-0.08, 0.1, 0.48, 0xfff3e0);
  // eye
  a.ellipse(0, 0.02, 0.28, 0.16, 0xff5f4d);
  a.circle(0, 0.02, 0.09, 0x2a1d14);
  a.circle(0.04, 0.06, 0.035, 0xfff3e0, { bright: 1.4 });
  // rays crown
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2 + 0.4;
    a.rect(Math.cos(ang) * 0.92, Math.sin(ang) * 0.92, 0.22, 0.05, 0xfff3e0, { r: ang, o: 0.85 });
  }
  // wings
  a.poly([[-0.7, -0.1], [-1.22, -0.34], [-0.86, 0.16]], 0xfff3e0, { o: 0.7 });
  a.poly([[0.7, -0.1], [1.22, -0.34], [0.86, 0.16]], 0xfff3e0, { o: 0.7 });
  if (turret) {
    const gl = glowMesh(0xffd76a, 1.5, 0.4);
    gl.renderOrder = ORDER.towerBase + 260;
    turret.add(gl);
  }
}

// --------------------------------------------------------------- 12. freezer
function freezer(a, turret) {
  shadowFor(a, 1.05);
  // frost puddle
  a.ellipse(0.1, -0.46, 1.0, 0.44, 0xd8fff4, { o: 0.18 });
  a.ellipse(0.1, -0.46, 0.7, 0.26, 0xd8fff4, { o: 0.16 });
  // cart body
  a.rect(0, -0.12, 1.1, 0.72, 0xfff3e0);
  a.rect(0, 0.12, 1.1, 0.2, 0x9ff0d8);
  a.rect(0, -0.34, 1.1, 0.14, 0x3aa8a0);
  // wheels
  a.circle(-0.44, -0.52, 0.2, 0x2a1d14);
  a.circle(0.44, -0.52, 0.2, 0x2a1d14);
  a.circle(-0.44, -0.52, 0.09, 0xd8fff4);
  a.circle(0.44, -0.52, 0.09, 0xd8fff4);
  // awning
  for (let i = 0; i < 5; i++) {
    a.rect(-0.52 + i * 0.26, 0.42, 0.26, 0.28, i % 2 ? 0xfff3e0 : 0x3aa8a0);
  }
  a.rect(0, 0.58, 1.3, 0.1, 0xff8a3d);
  // giant cone
  a.poly([[-0.26, 0.62], [0.26, 0.62], [0, 1.16]], 0xd9a521);
  a.circle(0, 1.12, 0.3, 0xfff3e0);
  a.circle(-0.08, 1.18, 0.14, 0x9ff0d8, { o: 0.9 });
  a.circle(0.1, 1.1, 0.1, 0xd8fff4, { o: 0.9 });
  if (turret) {
    const b = new Art(turret, ORDER.towerBase + 200);
    b.rect(0, 0, 0.62, 0.2, 0x3aa8a0);
    b.circle(0.36, 0, 0.14, 0xfff3e0);
    b.circle(0.4, 0, 0.08, 0x9ff0d8);
    b.star(0.6, 0, 0.12, 5, 0xd8fff4, { o: 0.9, inner: 0.4 });
  }
}

// ----------------------------------------------------------------- 13. farm
function farm(a) {
  shadowFor(a, 1.2);
  // pumpkin patch
  for (const [x, y, s] of [
    [-0.84, -0.52, 0.16],
    [-0.56, -0.66, 0.13],
    [0.86, -0.56, 0.14],
  ]) {
    a.circle(x, y, s, 0xff7a2f);
    a.rect(x, y + s * 0.9, 0.03, s * 0.5, 0x4f8f52);
    a.line(x - s * 0.7, y, x + s * 0.7, y, s * 0.22, 0xd94a1f, { o: 0.8 });
  }
  // barn
  a.rect(0, 0.02, 1.28, 0.98, 0xd04a3a);
  a.rect(0, 0.02, 1.28, 0.12, 0xfff3e0, { o: 0.9 });
  a.poly([[-0.72, 0.5], [0.72, 0.5], [0.5, 0.86], [-0.5, 0.86]], 0xa83a2c);
  a.rect(0, 0.68, 1.0, 0.16, 0xfff3e0, { o: 0.9 });
  // doors
  a.rect(0, -0.24, 0.62, 0.5, 0xfff3e0);
  a.rect(0, -0.24, 0.52, 0.42, 0xb03a2c);
  a.line(0, -0.46, 0, -0.02, 0.04, 0xfff3e0, { o: 0.8 });
  a.line(-0.26, 0.06, 0.26, -0.54, 0.03, 0xfff3e0, { o: 0.6 });
  a.line(0.26, 0.06, -0.26, -0.54, 0.03, 0xfff3e0, { o: 0.6 });
  // silo
  a.rect(0.78, 0.16, 0.34, 0.72, 0xd9c39a);
  a.circle(0.78, 0.54, 0.17, 0x8a9490);
  a.ring(0.78, 0.16, 0.15, 0.2, 0xbfa77e, { o: 0.7, seg: 20 });
  // weathervane
  a.line(-0.62, 0.82, -0.62, 1.06, 0.035, 0x3a3632);
  a.poly([[-0.62, 1.02], [-0.3, 0.96], [-0.62, 0.9]], 0xffc247);
}

// ----------------------------------------------------------------- 14. bank
function bank(a) {
  shadowFor(a, 1.2);
  // steps
  a.rect(0, -0.62, 1.34, 0.22, 0xe0d6c4);
  a.rect(0, -0.5, 1.2, 0.16, 0xc9bfae);
  a.poly([[-0.62, -0.4], [0.62, -0.4], [0.5, 0.62], [-0.5, 0.62]], 0x6fbf7a);
  a.poly([[-0.55, -0.34], [0.55, -0.34], [0.44, 0.56], [-0.44, 0.56]], 0x7ee08a);
  // pediment
  a.poly([[-0.66, 0.58], [0.66, 0.58], [0, 0.94]], 0xfff3e0);
  a.circle(0, 0.72, 0.08, 0xe0a93d);
  // columns
  for (const x of [-0.56, -0.2, 0.2, 0.56]) {
    a.rect(x, 0.06, 0.11, 1.0, 0xfff3e0, { o: 0.92 });
    a.rect(x, 0.58, 0.13, 0.08, 0xd9c39a);
  }
  // vault door
  a.circle(0, 0.02, 0.5, 0x2c5c36);
  a.circle(0, 0.02, 0.42, 0xffc247);
  a.circle(0, 0.02, 0.34, 0xe0a93d);
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2 + 0.6;
    a.rect(0, 0.02, 0.62, 0.07, 0x8a6420, { r: ang, o: 0.9 });
  }
  a.circle(0, 0.02, 0.1, 0x2c5c36);
  // coin stack
  for (let i = 0; i < 3; i++) a.rect(0.72, -0.56 + i * 0.08, 0.24, 0.07, 0xffc247);
  a.rect(0.72, -0.34, 0.24, 0.06, 0xe0a93d);
  // $ sign
  a.line(0.72, -0.86, 0.72, -0.42, 0.05, 0x2c5c36);
}

// ---------------------------------------------------------------------------

export function buildTower(def, level = 1) {
  const root = new THREE.Group();
  const turret = new THREE.Group();
  root.add(turret);
  const a = new Art(root, ORDER.towerBase);
  const at = ORDER.towerBase + 200;

  const spin = buildBody(def.id, root, a, turret, at);
  const hasTurret = turret.children.length > 0;
  root.userData.turret = hasTurret ? turret : null;
  root.userData.spin = spin || null;
  root.userData.id = def.id;

  rank(a, level);
  if (level >= 4) {
    const gl = glowMesh(def.color, 0.9, 0.12);
    gl.position.set(0, -0.32, 0);
    gl.renderOrder = ORDER.towerBase + 5;
    root.add(gl);
  }
  if (level >= 3) a.star(0.86, 0.72, 0.13, 5, 0xfff3e0, { o: 0.9, inner: 0.4 });

  root.scale.setScalar(1 + (level - 1) * 0.035);
  return root;
}

function buildBody(id, root, a, turret, at) {
  switch (id) {
    case 'scout':
      scout(a, turret);
      return null;
    case 'enforcer':
      enforcer(a, turret);
      return null;
    case 'crowd':
      crowd(a, turret);
      return null;
    case 'soldier':
      soldier(a, turret);
      return null;
    case 'patrol':
      patrol(root, a, turret);
      return null;
    case 'sniper':
      sniper(a, turret);
      return null;
    case 'based':
      based(a, turret);
      return null;
    case 'minigun':
      minigun(a, turret);
      return turret.userData.spin || null;
    case 'laser':
      laser(a, turret);
      return null;
    case 'bomber':
      bomber(a, turret);
      return null;
    case 'god':
      god(a, turret);
      return null;
    case 'freezer':
      freezer(a, turret);
      return null;
    case 'farm':
      farm(a);
      return null;
    case 'bank':
      bank(a);
      return null;
    default:
      scout(a, turret);
      return null;
  }
}
