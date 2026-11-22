import { TOWERS, TOWER_BY_ID } from './data/towers.js';
import { MAPS } from './data/maps.js';
import { MODES } from './data/waves.js';
import { towerIconMap } from './render/icons.js';

const $ = (id) => document.getElementById(id);
const hex = (n) => '#' + n.toString(16).padStart(6, '0');

export class UI {
  constructor({ getGame, onStart, onRetry, onMenu, onMapSelect, onModeChange }) {
    this.getGame = getGame;
    this.onStart = onStart;
    this.onRetry = onRetry;
    this.onMenu = onMenu;
    this.onMapSelect = onMapSelect;
    this.onModeChange = onModeChange;

    this.selMap = MAPS[0].id;
    this.selMode = 'standard';
    this.cards = new Map();
    this.icons = towerIconMap(TOWERS, 132);
    this.toastTimer = null;

    this.buildMenu();
    this.buildDock();
    this.bind();
    this.setMode('menu');
  }

  // ------------------------------------------------------------------ menu

  buildMenu() {
    const mc = $('mapCards');
    mc.innerHTML = '';
    for (const m of MAPS) {
      const el = document.createElement('button');
      el.className = 'pickcard';
      el.style.setProperty('--stripe', m.palette.accent);
      el.dataset.id = m.id;
      el.innerHTML = `
        <span class="pname">${m.name}</span>
        <span class="pspec">${m.spec}</span>
        <span class="pblurb">${m.blurb}</span>`;
      el.addEventListener('click', () => {
        this.selMap = m.id;
        this.syncMenu();
        this.onMapSelect?.(m.id);
      });
      mc.appendChild(el);
    }

    const dc = $('modeCards');
    dc.innerHTML = '';
    for (const m of MODES) {
      const el = document.createElement('button');
      el.className = 'pickcard';
      el.style.setProperty('--stripe', m.id === 'endless' ? '#ff8fb8' : m.id === 'tutorial' ? '#9ff0d8' : '#ff8a3d');
      el.dataset.id = m.id;
      const waves = m.waves === Infinity ? '∞' : m.waves;
      el.innerHTML = `
        <span class="pname">${m.name}</span>
        <span class="pspec">${waves} waves · ${m.lives} lives</span>
        <span class="pblurb">${m.blurb}</span>`;
      el.addEventListener('click', () => {
        this.selMode = m.id;
        this.syncMenu();
        this.onModeChange?.(m.id);
      });
      dc.appendChild(el);
    }

    this.syncMenu();
  }

  syncMenu() {
    for (const el of $('mapCards').children) el.classList.toggle('on', el.dataset.id === this.selMap);
    for (const el of $('modeCards').children) el.classList.toggle('on', el.dataset.id === this.selMode);
  }

  // ------------------------------------------------------------------ dock

  buildDock() {
    const wrap = $('cards');
    wrap.innerHTML = '';
    TOWERS.forEach((def) => {
      const el = document.createElement('button');
      el.className = 'card';
      el.style.setProperty('--accent', def.accent);
      el.dataset.id = def.id;
      const src = this.icons[def.id];
      el.innerHTML = `
        <span class="cardrole">${def.role}</span>
        ${src ? `<img class="cardart" src="${src}" alt="" draggable="false">` : '<span class="cardart"></span>'}
        <span class="cardname">${def.name}</span>
        <span class="cardcost">◉ ${def.cost}</span>`;
      el.title = `${def.name} — ${def.desc}`;
      el.addEventListener('click', () => {
        const game = this.getGame();
        if (!game) return;
        game.beginBuild(def.id);
        this.refreshDock(game.snapshot());
      });
      wrap.appendChild(el);
      this.cards.set(def.id, el);
    });
  }

  refreshDock(s) {
    for (const [id, el] of this.cards) {
      const def = TOWER_BY_ID[id];
      el.classList.toggle('on', s.buildType === id);
      el.classList.toggle('poor', s.cash < def.cost);
    }
    if (s.buildType) {
      const def = TOWER_BY_ID[s.buildType];
      $('dockHint').textContent = `Placing ${def.name} — click the map · right click to cancel`;
    } else {
      $('dockHint').textContent = 'Pick a tower, then click the map';
    }
  }

  // ----------------------------------------------------------------- wiring

  bind() {
    $('btnStart').addEventListener('click', () => this.onStart(this.selMap, this.selMode));
    $('btnRetry').addEventListener('click', () => this.onRetry());
    $('btnEndMenu').addEventListener('click', () => {
      this.hideEnd();
      this.onMenu();
    });
    $('btnQuit').addEventListener('click', () => {
      this.hideEnd();
      this.onMenu();
    });

    $('btnPause').addEventListener('click', () => {
      const g = this.getGame();
      if (!g) return;
      g.togglePause();
      $('btnPause').textContent = g.paused ? '▶' : '❚❚';
    });

    $('btnSpeed').addEventListener('click', () => {
      const g = this.getGame();
      if (!g) return;
      g.cycleSpeed();
      $('btnSpeed').textContent = `${g.speed}×`;
    });

    $('btnNext').addEventListener('click', () => {
      const g = this.getGame();
      if (g) g.nextWave();
    });

    $('pClose').addEventListener('click', () => {
      const g = this.getGame();
      if (g) g.selectTower(null);
    });

    $('btnUpgrade').addEventListener('click', () => {
      const g = this.getGame();
      if (g) g.upgradeSelected();
    });

    $('btnSell').addEventListener('click', () => {
      const g = this.getGame();
      if (g) g.sellSelected();
    });

    window.addEventListener('keydown', (ev) => {
      const g = this.getGame();
      if (!g || document.getElementById('app').dataset.mode !== 'game') return;
      const n = parseInt(ev.key, 10);
      if (n >= 1 && n <= 9) {
        const def = TOWERS[n - 1];
        if (def) {
          g.beginBuild(def.id);
          this.refreshDock(g.snapshot());
        }
      }
    });
  }

  setMode(mode) {
    document.getElementById('app').dataset.mode = mode;
    this.mode = mode;
  }

  setGameInfo(mapName, modeName) {
    $('mapName').textContent = mapName;
    $('modeName').textContent = modeName;
  }

  // ------------------------------------------------------------------- hud

  update(s) {
    $('cash').textContent = s.cash.toLocaleString();
    $('lives').textContent = s.lives;
    $('towerCount').textContent = s.towers;
    $('waveNum').textContent = s.wave;
    $('waveMax').textContent = s.waveTotal === Infinity ? '∞' : `/ ${s.waveTotal}`;
    const fill = s.waveTotal === Infinity ? Math.min(100, s.wave * 2) : (s.wave / s.waveTotal) * 100;
    $('waveFill').style.width = `${Math.min(100, fill)}%`;
    $('btnSpeed').textContent = `${s.speed}×`;
    $('btnPause').textContent = s.paused ? '▶' : '❚❚';
    $('btnNext').style.opacity = s.waveActive || s.over ? '0.4' : '1';
    this.refreshDock(s);

    const panel = $('panel');
    if (s.selected) {
      const t = s.selected;
      panel.classList.add('on');
      const src = this.icons[t.id];
      if (src) $('pIcon').src = src;
      $('pName').textContent = t.name;
      $('pTier').textContent = t.tier;
      $('pLevel').textContent = `LV ${t.level}`;
      $('pDesc').textContent = t.desc;
      $('pDmg').textContent = t.support ? '—' : Math.round(t.dmg);
      $('pRange').textContent = t.support ? '—' : Math.round(t.range);
      $('pRate').textContent = t.support ? '—' : t.rate.toFixed(2);
      $('pDps').textContent = t.support ? Math.round(t.dps) : Math.round(t.dps);
      const up = $('btnUpgrade');
      if (t.maxed) {
        up.innerHTML = 'MAX LEVEL';
        up.disabled = true;
      } else {
        up.innerHTML = `UPGRADE <em>◉ ${t.upgrade}</em>`;
        up.disabled = s.cash < t.upgrade;
      }
      $('btnSell').innerHTML = `SELL <em>◉ ${t.sell}</em>`;
    } else {
      panel.classList.remove('on');
    }
  }

  // ---------------------------------------------------------------- toasts

  toast(text) {
    const wrap = $('hint');
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = text;
    wrap.appendChild(el);
    wrap.classList.add('on');
    while (wrap.children.length > 3) wrap.removeChild(wrap.firstChild);
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      wrap.classList.remove('on');
      setTimeout(() => {
        while (wrap.firstChild) wrap.removeChild(wrap.firstChild);
      }, 260);
    }, 2200);
  }

  // ------------------------------------------------------------------- end

  showEnd(p) {
    $('end').classList.remove('hidden');
    $('endTag').textContent = p.victory ? 'VICTORY' : 'DEFEAT';
    $('endTag').style.color = p.victory ? '#5ee07a' : '#ff5f4d';
    $('endTitle').textContent = p.victory ? 'The line held.' : 'The road got through.';
    $('endBody').textContent = p.victory
      ? `All ${p.waves} waves repelled. The neighbourhood is still standing.`
      : `You held out for ${p.waves} waves before the last one walked through.`;
    $('endWaves').textContent = p.waves;
    $('endKills').textContent = p.kills;
    $('endEarned').textContent = p.earned.toLocaleString();
    $('endBuilt').textContent = p.built;
  }

  hideEnd() {
    $('end').classList.add('hidden');
  }
}
