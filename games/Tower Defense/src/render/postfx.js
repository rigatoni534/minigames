import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// A warm, punchy grade: bloom for the lanterns and muzzle flashes, then a
// gentle S-curve, vignette, grain and a whisper of chromatic aberration.

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uVignette: { value: 0.5 },
    uGrain: { value: 0.02 },
    uAberration: { value: 0.0014 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uVignette;
    uniform float uGrain;
    uniform float uAberration;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    void main() {
      vec2 uv = vUv;
      vec2 c = uv - 0.5;
      float d = dot(c, c);

      // lens fringe
      vec2 dir = normalize(c + 1e-6);
      vec2 off = dir * d * uAberration * 6.0;
      vec3 col;
      col.r = texture2D(tDiffuse, uv + off).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - off).b;

      // warm lift and contrast
      col *= vec3(1.22, 1.16, 1.07);
      col = clamp((col - 0.46) * 1.08 + 0.5, 0.0, 1.7);
      col += vec3(0.016, 0.012, 0.006);

      // vignette
      float vig = smoothstep(0.86, 0.16, d * 2.0) * uVignette;
      col *= mix(1.0, vig, 0.72);

      // film grain
      float n = hash(uv * vec2(1920.0, 1080.0) + uTime * 37.0) - 0.5;
      col += n * uGrain;

      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

export class PostFX {
  constructor(renderer, scene, camera, opts = {}) {
    this.renderer = renderer;
    this.enabled = true;
    this.size = new THREE.Vector2(1, 1);

    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));

    this.bloom = new UnrealBloomPass(
      new THREE.Vector2(1, 1),
      opts.strength ?? 0.3,
      opts.radius ?? 0.7,
      opts.threshold ?? 0.9,
    );
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this.grade = new ShaderPass(GradeShader);
    this.composer.addPass(this.grade);
  }

  setSize(w, h) {
    this.size.set(w, h);
    this.composer.setSize(w, h);
    this.bloom.setSize(w, h);
  }

  render(dt, time) {
    this.grade.uniforms.uTime.value = time % 1000;
    this.composer.render(dt);
  }

  dispose() {
    this.composer.dispose?.();
  }
}
