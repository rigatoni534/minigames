// Modes and wave composition.
//
// Waves are built from a hand-authored ladder of enemy groupings, so wave 7
// always means the same trouble, then scaled by the mode's growth curve.

import { BOSS_ORDER } from './enemies.js';

export const MODES = [
  {
    id: 'tutorial',
    name: 'Tutorial',
    waves: 15,
    lives: 20,
    cash: 900,
    hp: 0.62,
    growth: 1.1,
    boss: false,
    blurb: 'Fifteen gentle waves. Learn the towers, keep the lawn.',
  },
  {
    id: 'standard',
    name: 'Standard',
    waves: 40,
    lives: 20,
    cash: 650,
    hp: 1,
    growth: 1.155,
    boss: true,
    blurb: 'Forty waves and four bosses. The full argument.',
  },
  {
    id: 'endless',
    name: 'Endless',
    waves: Infinity,
    lives: 20,
    cash: 750,
    hp: 1,
    growth: 1.15,
    boss: true,
    blurb: 'No finish line. See how long the line holds.',
  },
];

export function getMode(id) {
  return MODES.find((m) => m.id === id) || MODES[1];
}

const LADDER = [
  ['straggler'],
  ['sprint', 'straggler'],
  ['swarmling'],
  ['slime', 'straggler'],
  ['batty'],
  ['spitter', 'sprint'],
  ['bruiser'],
  ['swarmling', 'sprint'],
  ['tank'],
  ['bomber', 'runner'],
  ['vampire'],
  ['frosty', 'slime'],
  ['wasp', 'runner'],
  ['mole'],
  ['brute', 'bruiser'],
  ['shade', 'batty'],
  ['pyre', 'spitter'],
  ['thorn', 'tank'],
  ['juggernaut'],
  ['necromancer', 'swarmling'],
];

function bossForWave(mode, wave) {
  if (!mode.boss) return null;
  const isMega = mode.waves === Infinity ? wave % 40 === 0 : wave === mode.waves;
  if (isMega) return BOSS_ORDER[3];
  if (wave % 10 !== 0) return null;
  return BOSS_ORDER[Math.min(2, Math.floor(wave / 10) - 1)];
}

/** Builds the spawn schedule for one wave. */
export function waveFor(modeId, wave, map) {
  const mode = getMode(modeId);
  const pattern = LADDER[(wave - 1) % LADDER.length];
  const groupCount = 1 + Math.min(2, Math.floor(wave / 6));
  const types = pattern.slice(0, groupCount);
  const baseCount = Math.round(6 + wave * 0.85);

  const groups = [];
  let delay = 0;
  for (let i = 0; i < types.length; i++) {
    const count = Math.max(2, Math.round((baseCount / types.length) * (i === 0 ? 1.25 : 0.9)));
    groups.push({
      type: types[i],
      count,
      gap: Math.max(0.22, 0.78 - wave * 0.008) * (types.length > 1 && i > 0 ? 0.7 : 1),
      delay,
    });
    delay += Math.min(2.2, 0.5 + i * 0.6);
  }

  const boss = bossForWave(mode, wave);
  if (boss) {
    groups.push({ type: boss, count: 1, gap: 1, delay: delay + 1.5 });
  }

  return {
    wave,
    hpScale: mode.hp * Math.pow(mode.growth, wave - 1),
    speedScale: 1 + Math.min(0.45, (wave - 1) * 0.006),
    groups,
    boss,
    total: groups.reduce((n, g) => n + g.count, 0),
  };
}

export function waveLabel(modeId, wave) {
  const mode = getMode(modeId);
  return mode.waves === Infinity ? `${wave}` : `${wave} / ${mode.waves}`;
}

export { BOSS_ORDER };
