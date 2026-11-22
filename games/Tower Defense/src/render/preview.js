import * as THREE from 'three';
import { prepareMap } from '../data/maps.js';
import { buildWorldArt } from './world.js';

// The menu backdrop: the selected map, alive, slowly drifting behind the
// frosted menu card.

export class MapPreview {
  constructor(canvas) {
    this.canvas = canvas;
    this.active = true;
    this.time = 0;
    this.root = null;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 500);
    this.camera.position.set(0, 0, 100);
    this.camera.rotation.z = -0.06;

    this.map = null;
    this.loop = this.loop.bind(this);
    this.resize();
    this.frameHandle = requestAnimationFrame(this.loop);
  }

  setMap(mapDef) {
    if (this.mapDef === mapDef) return;
    this.mapDef = mapDef;
    this.map = prepareMap(mapDef);

    if (this.root) {
      this.scene.remove(this.root);
      this.root.traverse((o) => {
        if (o.isMesh) {
          o.geometry?.dispose?.();
        }
      });
    }
    this.scene.background = new THREE.Color(mapDef.palette.bg);
    const { root } = buildWorldArt(this.scene, this.map);
    this.root = root;
    this.time = 0;
  }

  setActive(on) {
    this.active = on;
  }

  resize() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    const aspect = w / Math.max(1, h);
    const b = this.map ? this.map.bounds : { w: 100, h: 70 };
    // frame a little inside the map so the art fills the card
    let vh = Math.max(b.h * 0.72, 40);
    let vw = vh * aspect;
    if (vw < b.w * 0.55) {
      vw = b.w * 0.55;
      vh = vw / aspect;
    }
    this.camera.left = -vw / 2;
    this.camera.right = vw / 2;
    this.camera.top = vh / 2;
    this.camera.bottom = -vh / 2;
    this.camera.updateProjectionMatrix();
    this.viewW = vw;
    this.viewH = vh;
  }

  loop(now) {
    this.frameHandle = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, (now - (this.last || now)) / 1000);
    this.last = now;
    if (!this.active || !this.map) return;

    this.time += dt;
    const b = this.map.bounds;
    const t = this.time * 0.07;
    const cx = b.cx + Math.cos(t) * b.w * 0.055;
    const cy = b.cy + Math.sin(t * 0.8) * b.h * 0.045;
    this.camera.position.set(cx, cy, 100);
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    cancelAnimationFrame(this.frameHandle);
    this.renderer.dispose();
  }
}
