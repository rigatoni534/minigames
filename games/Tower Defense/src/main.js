import { Game } from './game.js';
import { UI } from './ui.js';
import { MapPreview } from './render/preview.js';
import { MAPS, getMap } from './data/maps.js';

let game = null;
let preview = null;
let ui = null;
let lastMap = 'city';
let lastMode = 'standard';

function freshCanvas() {
  const old = document.getElementById('scene');
  const canvas = document.createElement('canvas');
  canvas.id = 'scene';
  if (old && old.parentNode) old.parentNode.replaceChild(canvas, old);
  else document.querySelector('.stage').prepend(canvas);
  return canvas;
}

function destroyGame() {
  if (game) {
    game.dispose();
    game = null;
    window.__game = null;
  }
}

function startGame(mapId, modeId) {
  lastMap = mapId;
  lastMode = modeId;
  destroyGame();
  const canvas = freshCanvas();
  ui.hideEnd();
  ui.setMode('game');
  ui.setGameInfo(getMap(mapId).name, modeId === 'standard' ? 'Standard' : modeId === 'endless' ? 'Endless' : 'Tutorial');
  ui.toast('Pick a tower, then click the map');
  preview?.setActive(false);

  game = new Game({
    canvas,
    mapId,
    modeId,
    onEvent: (ev) => {
      if (ev.type === 'toast') ui.toast(ev.payload);
      else if (ev.type === 'end') ui.showEnd(ev.payload);
    },
  });
  game.start();
  window.__game = game;
  ui.update(game.snapshot());
}

function quitToMenu() {
  destroyGame();
  ui.setMode('menu');
  ui.hideEnd();
  preview?.setActive(true);
}

let previewCanvas = document.getElementById('preview-canvas');
try {
  preview = new MapPreview(previewCanvas);
  preview.setMap(MAPS[0]);
} catch (err) {
  console.warn('menu preview unavailable', err);
  preview = null;
}

ui = new UI({
  getGame: () => game,
  onStart: startGame,
  onRetry: () => startGame(lastMap, lastMode),
  onMenu: quitToMenu,
  onMapSelect: (id) => preview?.setMap(getMap(id)),
  onModeChange: (mode) => preview?.setActive(mode !== 'game'),
});

window.addEventListener('resize', () => {
  preview?.resize();
  game?.resize();
});

setInterval(() => {
  if (game && !game.over) ui.update(game.snapshot());
}, 100);
