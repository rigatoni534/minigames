import * as THREE from 'three';
import { prepareMap, distanceToPath, pointAt, PATH_WIDTH, getMap } from './data/maps.js';
import { TOWER_BY_ID, towerStats, TOWER_CAP, LEVELS } from './data/towers.js';
import { enemyDef } from './data/enemies.js';
import { getMode, waveFor } from './data/waves.js';
import { buildWorldArt } from './render/world.js';
import { buildTower } from './render/towers.js';
import { buildEnemyVisual } from './render/enemies.js';
import { Art, ORDER } from './render/art.js';
import { PostFX } from './render/postfx.js';

const CELL = 2;
const CLEARANCE = 0.85;
const ZOOM = { city: 2.05, desert: 1.55, eternal: 3.1 };

let nextId = 1;

export class Game {
  constructor({ canvas, mapId, modeId, onEvent }) {
    this.canvas = canvas;
    this.mapDef = getMap(mapId);
    this.map = prepareMap(this.mapDef);
    this.modeDef = getMode(modeId);
    this.onEvent = onEvent || (() => {});

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.mapDef.palette.bg);
    this.camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 1000);
    this.camera.position.set(0, 0, 200);

    this.postfx = new PostFX(this.renderer, this.scene, this.camera);

    this.time = 0;
    this.running = false;
    this.paused = false;
    this.speed = 1;
    this.over = false;
    this.frameHandle = 0;

    this.cash = this.mapDef.startCash;
    this.lives = this.modeDef.lives;
    this.wave = 0;
    this.waveTotal = this.modeDef.waves;
    this.waveActive = false;
    this.waveHpScale = 1;
    this.waveSpeedScale = 1;
    this.spawnQueue = [];
    this.spawnClock = 0;
    this.waveKills = 0;

    this.towers = [];
    this.enemies = [];
    this.effects = [];
    this.occupied = new Map();
    this.blocked = new Set();
    this.decorRects = [];

    this.buildType = null;
    this.selected = null;
    this.hoverCell = null;
    this.pointer = { x: 0, y: 0, down: false, moved: 0 };
    this.keys = new Set();

    this.stats = { kills: 0, damage: 0, earned: 0, built: 0, leaked: 0 };
    this.hint = '';

    this.zoom = ZOOM[this.mapDef.id] || 1.5;
    this.camX = this.map.bounds.cx;
    this.camY = this.map.bounds.cy;

    this.buildWorld();
    this.resize();
    this.bindInput();

    this.loop = this.loop.bind(this);
  }

  // ------------------------------------------------------------------ setup

  buildWorld() {
    const { root, blocks } = buildWorldArt(this.scene, this.map);
    this.world = root;
    this.decorRects = blocks;
    this.markBlocked();
    this.makeIndicator();
  }

  markBlocked() {
    const b = this.map.bounds;
    // Walk the build grid itself (not an arbitrary step from the bounds), so a
    // cell that sits on the road can never be mistaken for a free plot.
    const ix0 = Math.floor(b.minX / CELL);
    const ix1 = Math.ceil(b.maxX / CELL);
    const iy0 = Math.floor(b.minY / CELL);
    const iy1 = Math.ceil(b.maxY / CELL);
    for (let ix = ix0; ix <= ix1; ix++) {
      for (let iy = iy0; iy <= iy1; iy++) {
        const x = ix * CELL;
        const y = iy * CELL;
        if (distanceToPath(this.map.segs, x, y) < PATH_WIDTH / 2 + CLEARANCE) {
          this.blocked.add(`${ix}|${iy}`);
        }
      }
    }
    for (const r of this.decorRects) {
      const x0 = Math.ceil((r.x - 0.3) / CELL);
      const x1 = Math.floor((r.x + r.w + 0.3) / CELL);
      const y0 = Math.ceil((r.y - 0.3) / CELL);
      const y1 = Math.floor((r.y + r.h + 0.3) / CELL);
      for (let ix = x0; ix <= x1; ix++) {
        for (let iy = y0; iy <= y1; iy++) this.blocked.add(`${ix}|${iy}`);
      }
    }
  }

  makeIndicator() {
    const safe = new THREE.MeshBasicMaterial({
      color: 0x5ee07a,
      transparent: true,
      opacity: 0.12,
      depthTest: false,
      depthWrite: false,
    });
    const safeRing = new THREE.MeshBasicMaterial({
      color: 0x5ee07a,
      transparent: true,
      opacity: 0.75,
      depthTest: false,
      depthWrite: false,
    });
    this.ghost = new THREE.Group();
    this.ghostFill = new THREE.Mesh(new THREE.PlaneGeometry(CELL, CELL), safe);
    this.ghostFill.renderOrder = ORDER.cell;
    this.ghostEdge = new THREE.Mesh(new THREE.RingGeometry(CELL * 0.46, CELL * 0.5, 4, 1, Math.PI / 4), safeRing);
    this.ghostEdge.renderOrder = ORDER.cell + 1;
    this.ghost.add(this.ghostFill, this.ghostEdge);
    this.ghost.visible = false;
    this.scene.add(this.ghost);

    this.rangeFill = new THREE.Mesh(
      new THREE.CircleGeometry(1, 56),
      new THREE.MeshBasicMaterial({ color: 0xfff3e0, transparent: true, opacity: 0.07, depthTest: false, depthWrite: false }),
    );
    this.rangeEdge = new THREE.Mesh(
      new THREE.RingGeometry(0.985, 1, 64),
      new THREE.MeshBasicMaterial({ color: 0xfff3e0, transparent: true, opacity: 0.5, depthTest: false, depthWrite: false }),
    );
    this.rangeFill.renderOrder = ORDER.cell + 2;
    this.rangeEdge.renderOrder = ORDER.cell + 3;
    this.rangeFill.visible = false;
    this.rangeEdge.visible = false;
    this.scene.add(this.rangeFill, this.rangeEdge);
  }

  resize() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.postfx.setSize(w, h);
    this.width = w;
    this.height = h;
    this.aspect = w / Math.max(1, h);

    const b = this.map.bounds;
    let vw = b.w * 1.02;
    let vh = vw / this.aspect;
    if (vh < b.h * 1.02) {
      vh = b.h * 1.02;
      vw = vh * this.aspect;
    }
    this.fitW = vw;
    this.fitH = vh;
    this.applyCamera();
  }

  applyCamera() {
    const vw = this.fitW / this.zoom;
    const vh = this.fitH / this.zoom;
    const b = this.map.bounds;
    const maxX = Math.max(0, (b.w - vw) / 2 + 6);
    const maxY = Math.max(0, (b.h - vh) / 2 + 6);
    this.camX = Math.max(b.cx - maxX, Math.min(b.cx + maxX, this.camX));
    this.camY = Math.max(b.cy - maxY, Math.min(b.cy + maxY, this.camY));

    this.camera.left = -vw / 2;
    this.camera.right = vw / 2;
    this.camera.top = vh / 2;
    this.camera.bottom = -vh / 2;
    this.camera.updateProjectionMatrix();
    this.camera.position.set(this.camX, this.camY - 2.6 / this.zoom, 200);
    this.viewW = vw;
    this.viewH = vh;
  }

  // ------------------------------------------------------------------ input

  bindInput() {
    const c = this.canvas;
    this.onPointerDown = (ev) => {
      if (ev.button === 2) {
        this.cancelBuild();
        return;
      }
      this.pointer.down = true;
      this.pointer.moved = 0;
      this.pointer.x = ev.clientX;
      this.pointer.y = ev.clientY;
      c.setPointerCapture?.(ev.pointerId);
    };
    this.onPointerMove = (ev) => {
      const r = c.getBoundingClientRect();
      this.mouseX = ev.clientX - r.left;
      this.mouseY = ev.clientY - r.top;
      const w = this.worldFromScreen(this.mouseX, this.mouseY);
      this.hoverWorld = w;
      if (this.pointer.down) {
        const dx = ev.clientX - this.pointer.x;
        const dy = ev.clientY - this.pointer.y;
        if (Math.abs(dx) + Math.abs(dy) > 3) {
          this.pointer.moved += Math.abs(dx) + Math.abs(dy);
          const scale = this.viewW / Math.max(1, this.width);
          this.camX -= dx * scale;
          this.camY += dy * scale;
          this.pointer.x = ev.clientX;
          this.pointer.y = ev.clientY;
          this.applyCamera();
        }
      }
    };
    this.onPointerUp = (ev) => {
      if (!this.pointer.down) return;
      this.pointer.down = false;
      if (this.pointer.moved < 8) this.clickWorld(this.hoverWorld || this.worldFromScreen(this.mouseX || 0, this.mouseY || 0));
      void ev;
    };
    this.onWheel = (ev) => {
      ev.preventDefault();
      const factor = Math.exp(-ev.deltaY * 0.0011);
      this.zoom = Math.max(0.9, Math.min(6, this.zoom * factor));
      this.applyCamera();
    };
    this.onContext = (ev) => ev.preventDefault();
    this.onKeyDown = (ev) => {
      this.keys.add(ev.key.toLowerCase());
      if (ev.key === 'Escape') this.cancelBuild();
      if (ev.key === ' ') {
        ev.preventDefault();
        this.paused = !this.paused;
      }
    };
    this.onKeyUp = (ev) => this.keys.delete(ev.key.toLowerCase());

    c.addEventListener('pointerdown', this.onPointerDown);
    c.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    c.addEventListener('wheel', this.onWheel, { passive: false });
    c.addEventListener('contextmenu', this.onContext);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  worldFromScreen(x, y) {
    const nx = (x / Math.max(1, this.width)) * 2 - 1;
    const ny = -(y / Math.max(1, this.height)) * 2 + 1;
    return { x: this.camX + (nx * this.viewW) / 2, y: this.camY + (ny * this.viewH) / 2 };
  }

  cellAt(x, y) {
    return { ix: Math.round(x / CELL), iy: Math.round(y / CELL) };
  }

  cellKey(ix, iy) {
    return `${ix}|${iy}`;
  }

  cellFree(ix, iy) {
    const key = this.cellKey(ix, iy);
    if (this.occupied.has(key) || this.blocked.has(key)) return false;
    return true;
  }

  // ------------------------------------------------------------------ build

  beginBuild(id) {
    const def = TOWER_BY_ID[id];
    if (!def || this.over) return;
    if (this.cash < def.cost) {
      this.toast(`Not enough cash for ${def.name}`);
      return;
    }
    if (this.towers.length >= TOWER_CAP) {
      this.toast('Tower limit reached');
      return;
    }
    this.buildType = this.buildType === id ? null : id;
    this.selected = null;
  }

  cancelBuild() {
    this.buildType = null;
  }

  clickWorld(pos) {
    if (!pos || this.over) return;
    if (this.buildType) {
      this.placeAt(pos.x, pos.y);
      return;
    }
    // select the nearest tower
    let best = null;
    let bestD = 1.9;
    for (const t of this.towers) {
      const d = Math.hypot(t.x - pos.x, t.y - pos.y);
      if (d < bestD) {
        best = t;
        bestD = d;
      }
    }
    this.selected = best;
  }

  placeAt(x, y) {
    const def = TOWER_BY_ID[this.buildType];
    if (!def) return;
    const { ix, iy } = this.cellAt(x, y);
    if (!this.cellFree(ix, iy)) {
      this.toast('Can’t build there');
      return;
    }
    if (this.cash < def.cost) {
      this.toast('Not enough cash');
      return;
    }
    if (this.towers.length >= TOWER_CAP) {
      this.toast('Tower limit reached');
      return;
    }

    const t = {
      id: nextId++,
      def,
      icon: this.iconMap?.[def.id],
      ix,
      iy,
      x: ix * CELL,
      y: iy * CELL,
      level: 1,
      stats: towerStats(def, 1),
      cooldown: 0,
      invested: def.cost,
      angle: 0,
      group: null,
      turret: null,
      spin: null,
      roam: 0,
      laserTarget: null,
      laserOn: 0,
    };
    t.group = buildTower(def, 1);
    t.group.position.set(t.x, t.y, 0);
    // a soft ground contact so the piece sits on the lawn rather than floating
    t.shadow = new THREE.Mesh(
      new THREE.CircleGeometry(1, 28),
      new THREE.MeshBasicMaterial({ color: 0x0b1a10, transparent: true, opacity: 0.16, depthTest: false, depthWrite: false }),
    );
    t.shadow.scale.set(1.35, 1.1, 1);
    t.shadow.position.set(t.x + 0.2, t.y - 0.22, 0);
    t.shadow.renderOrder = ORDER.propShadow + 1;
    this.scene.add(t.shadow);
    t.group.scale.setScalar(1.72);
    t.turret = t.group.userData.turret;
    t.spin = t.group.userData.spin;
    this.scene.add(t.group);
    this.towers.push(t);
    this.occupied.set(this.cellKey(ix, iy), t);

    this.cash -= def.cost;
    this.stats.built++;
    this.stats.earned += 0;
    this.buildType = null;
    this.selected = t;
    this.pulse(t.x, t.y, def.color, 1.6);
  }

  upgradeSelected() {
    const t = this.selected;
    if (!t || t.level >= LEVELS) return;
    const cost = t.def.up[t.level - 1];
    if (this.cash < cost) {
      this.toast('Not enough cash');
      return;
    }
    this.cash -= cost;
    t.invested += cost;
    t.level++;
    t.stats = towerStats(t.def, t.level);

    this.scene.remove(t.group);
    t.group = buildTower(t.def, t.level);
    t.group.position.set(t.roam ? t.group.position.x : t.x, t.roam ? t.group.position.y : t.y, 0);
    t.group.scale.setScalar(1.72);
    t.turret = t.group.userData.turret;
    t.spin = t.group.userData.spin;
    this.scene.add(t.group);
    this.pulse(t.x, t.y, t.def.color, 2.2);
  }

  sellSelected() {
    const t = this.selected;
    if (!t) return;
    const value = Math.round(t.invested * 0.65);
    this.cash += value;
    this.occupied.delete(this.cellKey(t.ix, t.iy));
    this.scene.remove(t.group);
    if (t.shadow) {
      this.scene.remove(t.shadow);
      t.shadow.geometry.dispose();
      t.shadow.material.dispose();
    }
    this.towers = this.towers.filter((o) => o !== t);
    this.selected = null;
    this.toast(`Sold for ${value}`);
  }

  selectTower(t) {
    this.selected = t;
    if (t) this.buildType = null;
  }

  // ------------------------------------------------------------------ waves

  nextWave() {
    if (this.waveActive || this.over) return;
    if (this.waveTotal !== Infinity && this.wave >= this.waveTotal) return;

    this.wave++;
    const plan = waveFor(this.modeDef.id, this.wave, this.map);
    this.waveHpScale = plan.hpScale;
    this.waveSpeedScale = plan.speedScale;
    this.spawnQueue = [];
    for (const g of plan.groups) {
      for (let i = 0; i < g.count; i++) {
        this.spawnQueue.push({ at: g.delay + i * g.gap, type: g.type, boss: !!plan.boss && g.type === plan.boss });
      }
    }
    this.spawnQueue.sort((a, b) => a.at - b.at);
    this.spawnClock = 0;
    this.waveActive = true;
    this.waveKills = 0;
    this.onEvent({ type: 'wave', payload: { wave: this.wave, boss: plan.boss } });
    if (plan.boss) this.toast(`${enemyDef(plan.boss).name} is on the road`);
  }

  spawn(typeId) {
    const def = enemyDef(typeId);
    const isBoss = !!def.boss;
    const hp = isBoss ? def.hp * (1 + this.wave * 0.03) : def.hp * this.waveHpScale;
    const group = buildEnemyVisual(def);
    this.scene.add(group);
    const e = {
      id: nextId++,
      def,
      typeId,
      hp,
      maxHp: hp,
      dist: -2 - Math.random() * 2,
      speed: def.speed * this.waveSpeedScale,
      slowT: 0,
      slowAmt: 0,
      group,
      pos: { x: 0, y: 0 },
      angle: 0,
      bob: Math.random() * 6.28,
      dead: false,
      summonT: 4 + Math.random() * 3,
      hpShown: false,
    };
    this.enemies.push(e);
    if (isBoss) this.pulse(this.map.start[0], this.map.start[1], def.body, 4);
  }

  updateWaveSpawning(dt) {
    if (!this.waveActive) return;
    this.spawnClock += dt;
    while (this.spawnQueue.length && this.spawnQueue[0].at <= this.spawnClock) {
      const s = this.spawnQueue.shift();
      this.spawn(s.type);
    }
  }

  finishWave() {
    if (!this.waveActive) return;
    this.waveActive = false;
    const bonus = 24 + this.wave * 7;
    let income = 0;
    for (const t of this.towers) {
      if (t.def.kind === 'support') income += Math.round(t.stats.income);
    }
    let interest = 0;
    for (const t of this.towers) {
      if (t.def.interest) interest += Math.round(this.cash * t.def.interest * (t.level / 5 + 0.8));
    }
    this.cash += bonus + income + interest;
    this.stats.earned += bonus + income + interest;
    this.toast(`Wave ${this.wave} cleared · +${bonus + income + interest}`);

    if (this.waveTotal !== Infinity && this.wave >= this.waveTotal) this.end(true);
  }

  // --------------------------------------------------------------- combat

  hit(e, amount, color) {
    if (e.dead) return;
    const dmg = amount * (1 - (e.def.armor || 0));
    e.hp -= dmg;
    this.stats.damage += dmg;
    this.cash += dmg * 0.035;
    if (!e.hpShown) {
      e.hpShown = true;
      e.group.userData.hpBar.visible = true;
    }
    if (e.hp <= 0) this.kill(e, color);
  }

  kill(e, color) {
    if (e.dead) return;
    e.dead = true;
    this.stats.kills++;
    this.waveKills++;
    const bounty = Math.round((e.def.bounty || 5) + this.wave * 0.5);
    this.cash += bounty;
    this.stats.earned += bounty;
    this.blast(e.pos.x, e.pos.y, e.def.r * 1.6, color || e.def.body, 0.32);
  }

  splashAt(x, y, radius, amount, color) {
    for (const e of this.enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.pos.x - x, e.pos.y - y);
      if (d <= radius + e.def.r * 0.5) {
        const falloff = 1 - Math.min(1, d / (radius + 0.001)) * 0.45;
        this.hit(e, amount * falloff, color);
      }
    }
  }

  fire(t, target) {
    const def = t.def;
    const st = t.stats;
    this.faceTower(t, target);
    const color = def.color;

    if (def.kind === 'mortar') {
      const lead = Math.min(0.7, Math.hypot(target.pos.x - t.x, target.pos.y - t.y) / 55);
      const predicted = pointAt(this.map, target.dist + target.speed * lead);
      this.shell(t.x, t.y + 0.6, predicted.x, predicted.y, def.splash, st.dmg, color);
    } else if (def.kind === 'shot') {
      for (let i = 0; i < (def.pellets || 3); i++) {
        const spread = (i - ((def.pellets || 3) - 1) / 2) * 0.22;
        const len = Math.hypot(target.pos.x - t.x, target.pos.y - t.y);
        const tx = t.x + Math.cos(t.angle + spread) * len;
        const ty = t.y + Math.sin(t.angle + spread) * len;
        this.tracer(t.x, t.y + 0.6, tx, ty, color, 0.09, 0.1);
      }
      this.splashAt(target.pos.x, target.pos.y, def.splash || 2, st.dmg, color);
      if (def.slow) this.applySlow(target, def);
    } else if (def.kind === 'beam' || def.kind === 'bullet') {
      this.tracer(t.x, t.y + 0.62, target.pos.x, target.pos.y, color, def.kind === 'beam' ? 0.26 : 0.13, def.kind === 'beam' ? 0.16 : 0.09);
      if (def.splash) this.splashAt(target.pos.x, target.pos.y, def.splash, st.dmg, color);
      else this.hit(target, st.dmg, color);
      this.muzzle(t.x + Math.cos(t.angle) * 0.6, t.y + Math.sin(t.angle) * 0.6, color);
    }
  }

  applySlow(e, def) {
    if (!def.slow) return;
    e.slowT = Math.max(e.slowT, def.slowTime || 2);
    e.slowAmt = Math.max(e.slowAmt, def.slow);
  }

  faceTower(t, target) {
    const ang = Math.atan2(target.pos.y - t.y, target.pos.x - t.x);
    t.angle = ang;
    if (t.turret) t.turret.rotation.z = ang;
  }

  findTarget(t) {
    const range = t.stats.range;
    let best = null;
    let bestDist = -1;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.pos.x - t.x, e.pos.y - t.y);
      if (d > range + e.def.r) continue;
      if (e.dist > bestDist) {
        best = e;
        bestDist = e.dist;
      }
    }
    return best;
  }

  // ------------------------------------------------------------------- loop

  start() {
    this.running = true;
    this.last = performance.now();
    this.frameHandle = requestAnimationFrame(this.loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.frameHandle);
  }

  loop(now) {
    this.frameHandle = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, (now - (this.last || now)) / 1000);
    this.last = now;
    if (!this.paused) this.update(dt * this.speed);
    this.render(dt);
  }

  update(dt) {
    this.time += dt;
    this.updateCameraKeys(dt);
    this.updateWaveSpawning(dt);
    this.updateEnemies(dt);
    this.updateTowers(dt);
    this.updateEffects(dt);
    this.updateIndicator();

    if (this.waveActive && !this.spawnQueue.length && !this.enemies.some((e) => !e.dead)) this.finishWave();
  }

  updateCameraKeys(dt) {
    if (!this.keys.size) return;
    const sp = (this.viewW / 2.4) * dt;
    let dx = 0;
    let dy = 0;
    if (this.keys.has('a') || this.keys.has('arrowleft')) dx -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) dx += 1;
    if (this.keys.has('w') || this.keys.has('arrowup')) dy += 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) dy -= 1;
    if (!dx && !dy) return;
    this.camX += dx * sp;
    this.camY += dy * sp;
    this.applyCamera();
  }

  updateEnemies(dt) {
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (e.slowT > 0) {
        e.slowT -= dt;
        if (e.slowT <= 0) e.slowAmt = 0;
      }
      const slow = 1 - e.slowAmt;
      e.dist += e.speed * slow * dt;
      const p = pointAt(this.map, Math.max(0, e.dist));
      e.pos.x = p.x;
      e.pos.y = p.y;

      if (e.def.regen && e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + e.def.regen * dt);
      if (e.def.summoner) {
        e.summonT -= dt;
        if (e.summonT <= 0 && this.enemies.length < 90) {
          e.summonT = 6 + Math.random() * 3;
          const save = this.waveHpScale;
          this.waveHpScale *= 0.5;
          this.spawnAt(e.def.summoner, Math.max(0, e.dist - 1.5));
          this.waveHpScale = save;
        }
      }

      if (e.dist >= this.map.length) {
        e.dead = true;
        const dmg = e.def.boss ? 10 : 1;
        this.lives -= dmg;
        this.stats.leaked++;
        this.blast(e.pos.x, e.pos.y, 2.2, 0xff5f4d, 0.5);
        this.toast(`${e.def.name} broke through`);
        if (this.lives <= 0) {
          this.lives = 0;
          this.end(false);
        }
      }
    }
    this.enemies = this.enemies.filter((e) => !e.dead);
    this.syncEnemyVisuals(dt);
  }

  syncEnemyVisuals(dt) {
    for (const e of this.enemies) {
      const g = e.group;
      g.position.set(e.pos.x, e.pos.y, 0);
      e.bob += dt * (6 + e.speed * 2);
      const hop = Math.sin(e.bob) * 0.06;
      g.scale.setScalar(e.def.r * (1 + Math.sin(e.bob * 0.5) * 0.02));
      g.position.y += hop * e.def.r;
      if (e.def.shape !== 'bossEternal') {
        g.rotation.z = 0;
      }
      const wings = g.userData.wings;
      if (wings) wings.rotation.z = Math.sin(e.bob * 3) * 0.5;
      const tail = g.userData.tail;
      if (tail) tail.rotation.z = Math.sin(e.bob * 0.8) * 0.2;
      const spark = g.userData.spark;
      if (spark) spark.material.opacity = 0.4 + Math.sin(e.bob * 4) * 0.25;

      if (e.hpShown) {
        const frac = Math.max(0, Math.min(1, e.hp / e.maxHp));
        const fill = g.userData.hpFill;
        fill.scale.x = frac;
        fill.position.x = -(1 - frac) * 0.72;
        fill.material.color.setHex(frac > 0.55 ? 0x5ee07a : frac > 0.25 ? 0xffc247 : 0xff5f4d);
      }
    }
  }

  updateTowers(dt) {
    for (const t of this.towers) {
      // the patrol jeep drives the road itself, lapping the whole track
      if (t.def.roams) {
        t.track = (t.track || 0) + dt * 7.5;
        const p = pointAt(this.map, t.track % this.map.length);
        t.x = p.x;
        t.y = p.y;
        t.group.position.set(t.x, t.y, 0);
        t.group.rotation.z = p.angle;
        if (t.shadow) t.shadow.position.set(t.x + 0.2, t.y - 0.22, 0);
      }

      if (t.def.kind === 'support') {
        if (t.spin) t.spin.rotation.z += dt * 0.6;
        continue;
      }

      if (t.spin) t.spin.rotation.z += dt * 22;

      if (t.def.kind === 'laser') {
        const target = this.findTarget(t);
        t.laserTarget = target;
        if (target) {
          this.faceTower(t, target);
          this.hit(target, t.stats.dmg * dt * 3, t.def.color);
          if (t.def.splash) this.splashAt(target.pos.x, target.pos.y, t.def.splash, t.stats.dmg * dt * 1.2, t.def.color);
        }
        continue;
      }

      t.cooldown -= dt;
      if (t.cooldown > 0) continue;
      const target = this.findTarget(t);
      if (!target) continue;
      t.cooldown = 1 / Math.max(0.05, t.stats.rate);
      this.fire(t, target);
    }
  }

  // ---------------------------------------------------------------- effects

  tracer(x1, y1, x2, y2, color, width = 0.06, life = 0.09) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len < 0.05) return;
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.95,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    mesh.position.set((x1 + x2) / 2, (y1 + y2) / 2, 0);
    mesh.rotation.z = Math.atan2(dy, dx);
    mesh.scale.set(len, width, 1);
    mesh.renderOrder = ORDER.fxGlow;
    this.scene.add(mesh);
    this.effects.push({ mesh, life, max: life, kind: 'tracer' });
  }

  muzzle(x, y, color) {
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.9,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const mesh = new THREE.Mesh(new THREE.CircleGeometry(0.28, 12), mat);
    mesh.position.set(x, y, 0);
    mesh.renderOrder = ORDER.fxGlow + 1;
    this.scene.add(mesh);
    this.effects.push({ mesh, life: 0.09, max: 0.09, kind: 'flash' });
  }

  blast(x, y, radius, color, life = 0.35) {
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.55,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const mesh = new THREE.Mesh(new THREE.RingGeometry(0.72, 1, 32), mat);
    mesh.position.set(x, y, 0);
    mesh.scale.setScalar(0.3);
    mesh.renderOrder = ORDER.fx;
    this.scene.add(mesh);
    this.effects.push({ mesh, life, max: life, kind: 'blast', radius });
  }

  pulse(x, y, color, radius = 1.6) {
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.5,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const mesh = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 36), mat);
    mesh.position.set(x, y, 0);
    mesh.scale.setScalar(0.2);
    mesh.renderOrder = ORDER.fx;
    this.scene.add(mesh);
    this.effects.push({ mesh, life: 0.45, max: 0.45, kind: 'blast', radius });
  }

  shell(x1, y1, x2, y2, radius, dmg, color) {
    const mat = new THREE.MeshBasicMaterial({ color, depthTest: false, depthWrite: false });
    const mesh = new THREE.Mesh(new THREE.CircleGeometry(0.16, 10), mat);
    mesh.position.set(x1, y1, 0);
    mesh.renderOrder = ORDER.fxGlow + 2;
    this.scene.add(mesh);
    this.effects.push({
      mesh,
      life: 0.42,
      max: 0.42,
      kind: 'shell',
      from: { x: x1, y: y1 },
      to: { x: x2, y: y2 },
      radius,
      dmg,
      color,
    });
  }

  updateEffects(dt) {
    for (const fx of this.effects) {
      fx.life -= dt;
      const k = 1 - Math.max(0, fx.life) / fx.max;
      if (fx.kind === 'blast') {
        fx.mesh.scale.setScalar((fx.radius || 1.6) * (0.35 + k * 0.9));
        fx.mesh.material.opacity = 0.5 * (1 - k);
      } else if (fx.kind === 'tracer') {
        fx.mesh.material.opacity = 0.95 * (1 - k);
        fx.mesh.scale.y *= 0.98;
      } else if (fx.kind === 'flash') {
        fx.mesh.material.opacity = 0.9 * (1 - k);
        fx.mesh.scale.setScalar(1 + k * 1.4);
      } else if (fx.kind === 'shell') {
        const px = fx.from.x + (fx.to.x - fx.from.x) * k;
        const py = fx.from.y + (fx.to.y - fx.from.y) * k + Math.sin(k * Math.PI) * 1.2;
        fx.mesh.position.set(px, py, 0);
        if (fx.life <= 0) {
          this.splashAt(fx.to.x, fx.to.y, fx.radius, fx.dmg, fx.color);
          this.blast(fx.to.x, fx.to.y, fx.radius * 1.4, fx.color, 0.34);
        }
      }
    }
    const dead = this.effects.filter((f) => f.life <= 0);
    for (const fx of dead) {
      this.scene.remove(fx.mesh);
      fx.mesh.geometry.dispose();
      fx.mesh.material.dispose();
    }
    this.effects = this.effects.filter((f) => f.life > 0);
  }

  updateIndicator() {
    const showGhost = !!this.buildType && this.hoverWorld;
    this.ghost.visible = showGhost;
    if (showGhost) {
      const { ix, iy } = this.cellAt(this.hoverWorld.x, this.hoverWorld.y);
      const ok = this.cellFree(ix, iy);
      this.ghost.position.set(ix * CELL, iy * CELL, 0);
      this.ghostFill.material.color.setHex(ok ? 0x5ee07a : 0xff5f4d);
      this.ghostEdge.material.color.setHex(ok ? 0x5ee07a : 0xff5f4d);
      this.hoverCell = { ix, iy };
    }

    const t = this.selected;
    const showRange = !!t;
    this.rangeFill.visible = showRange;
    this.rangeEdge.visible = showRange;
    if (showRange) {
      const r = t.stats.range || 4;
      this.rangeFill.position.set(t.x, t.y, 0);
      this.rangeEdge.position.set(t.x, t.y, 0);
      this.rangeFill.scale.setScalar(r);
      this.rangeEdge.scale.setScalar(r);
      this.rangeFill.material.color.setHex(t.def.color);
      this.rangeEdge.material.color.setHex(t.def.color);
    }

    // laser beams
    this.laserMeshes = this.laserMeshes || new Map();
    for (const tower of this.towers) {
      if (tower.def.kind !== 'laser') continue;
      let mesh = this.laserMeshes.get(tower.id);
      const target = tower.laserTarget;
      if (!target || target.dead) {
        if (mesh) mesh.visible = false;
        continue;
      }
      if (!mesh) {
        const mat = new THREE.MeshBasicMaterial({
          color: tower.def.color,
          transparent: true,
          opacity: 0.7,
          depthTest: false,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
        mesh.renderOrder = ORDER.fxGlow;
        this.scene.add(mesh);
        this.laserMeshes.set(tower.id, mesh);
      }
      const dx = target.pos.x - tower.x;
      const dy = target.pos.y - tower.y;
      const len = Math.hypot(dx, dy);
      mesh.visible = true;
      mesh.position.set(tower.x + dx / 2, tower.y + dy / 2 + 0.6, 0);
      mesh.rotation.z = Math.atan2(dy, dx);
      mesh.scale.set(len, 0.12 + Math.sin(this.time * 40) * 0.02, 1);
      mesh.material.opacity = 0.55 + Math.sin(this.time * 30) * 0.2;
    }
  }

  render(dt) {
    this.postfx.render(dt, this.time);
  }

  // ------------------------------------------------------------------- util

  toast(text) {
    this.onEvent({ type: 'toast', payload: text });
  }

  end(victory) {
    if (this.over) return;
    this.over = true;
    this.waveActive = false;
    this.onEvent({
      type: 'end',
      payload: {
        victory,
        waves: this.wave,
        kills: this.stats.kills,
        earned: Math.round(this.stats.earned),
        built: this.stats.built,
      },
    });
  }

  spawnAt(typeId, dist) {
    const def = enemyDef(typeId);
    const hp = def.hp * this.waveHpScale;
    const group = buildEnemyVisual(def);
    this.scene.add(group);
    this.enemies.push({
      id: nextId++,
      def,
      typeId,
      hp,
      maxHp: hp,
      dist,
      speed: def.speed * this.waveSpeedScale,
      slowT: 0,
      slowAmt: 0,
      group,
      pos: { x: 0, y: 0 },
      angle: 0,
      bob: Math.random() * 6.28,
      dead: false,
      summonT: 8,
      hpShown: false,
    });
  }

  togglePause() {
    this.paused = !this.paused;
  }

  cycleSpeed() {
    this.speed = this.speed === 1 ? 2 : this.speed === 2 ? 3 : 1;
  }

  snapshot() {
    const t = this.selected;
    let selected = null;
    if (t) {
      const s = t.stats;
      selected = {
        id: t.def.id,
        name: t.def.name,
        tier: t.def.tier,
        desc: t.def.desc,
        level: t.level,
        dmg: s.dmg,
        range: s.range,
        rate: s.rate,
        dps: s.dps,
        upgrade: t.level < LEVELS ? t.def.up[t.level - 1] : 0,
        sell: Math.round(t.invested * 0.65),
        maxed: t.level >= LEVELS,
        income: s.income,
        support: t.def.kind === 'support',
      };
    }
    return {
      cash: Math.floor(this.cash),
      lives: this.lives,
      wave: this.wave,
      waveTotal: this.waveTotal,
      waveActive: this.waveActive,
      waveLeft: this.enemies.length,
      towers: this.towers.length,
      cap: TOWER_CAP,
      speed: this.speed,
      paused: this.paused,
      over: this.over,
      buildType: this.buildType,
      selected,
      hint: this.hint,
    };
  }

  dispose() {
    this.stop();
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('wheel', this.onWheel);
    this.canvas.removeEventListener('contextmenu', this.onContext);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.postfx.dispose();
    this.renderer.dispose();
  }
}
