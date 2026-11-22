import * as THREE from 'three';
import { buildTower } from './towers.js';

// Renders every tower once into a square PNG so the shop can show the real
// models instead of drawn glyphs.

export function towerIconMap(towers, size = 132) {
  const map = {};
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  } catch (err) {
    console.warn('tower icons unavailable', err);
    return map;
  }
  renderer.setPixelRatio(1);
  renderer.setSize(size, size);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 50);
  camera.position.set(0, 0, 10);

  for (const def of towers) {
    const g = buildTower(def, 1);
    g.scale.setScalar(1);
    scene.add(g);
    // frame the whole model, whatever its silhouette
    const box = new THREE.Box3().setFromObject(g);
    const cx = (box.min.x + box.max.x) / 2;
    const cy = (box.min.y + box.max.y) / 2;
    const half = Math.max(1.1, (box.max.x - box.min.x) / 2, (box.max.y - box.min.y) / 2) * 1.06;
    camera.left = -half;
    camera.right = half;
    camera.top = half;
    camera.bottom = -half;
    camera.position.set(cx, cy, 10);
    camera.updateProjectionMatrix();

    renderer.render(scene, camera);
    map[def.id] = renderer.domElement.toDataURL('image/png');
    scene.remove(g);
  }

  renderer.dispose();
  renderer.forceContextLoss?.();
  return map;
}
