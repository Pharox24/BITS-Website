import * as THREE from 'three';
import { GPUComputationRenderer } from 'three/examples/jsm/misc/GPUComputationRenderer.js';
import { bakeTextTargets, bakeScatterTexture } from './particles/bakeTargets.js';
import { velocityShader, positionShader } from './particles/sim.glsl.js';
import { renderVertex, renderFragment } from './particles/render.glsl.js';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const els = {
  canvas: document.getElementById('grid-canvas'),
  fallback: document.getElementById('fallback'),
  fallbackReason: document.getElementById('fallback-reason'),
  count: document.getElementById('count'),
  fps: document.getElementById('fps'),
  gpu: document.getElementById('gpu'),
  hint: document.getElementById('hint'),
};

function showFallback(reason) {
  els.fallback.classList.add('on');
  els.canvas.style.display = 'none';
  if (reason) els.fallbackReason.textContent = reason;
  console.warn('[living-grid] fallback:', reason);
}

// ---- capability gate ----------------------------------------------------
function detectWebGL2() {
  const c = document.createElement('canvas');
  return c.getContext('webgl2');
}

if (reduced) {
  showFallback('Reduced-motion is on — showing the static field.');
} else {
  const gl = detectWebGL2();
  if (!gl) {
    showFallback('WebGL2 unavailable in this browser — static fallback.');
  } else {
    // float render targets are required for GPGPU
    const hasFloat = gl.getExtension('EXT_color_buffer_float');
    if (!hasFloat) {
      showFallback('This GPU lacks float render targets — static fallback.');
    } else {
      try {
        init();
      } catch (err) {
        showFallback('Engine failed to start — static fallback.');
        console.error(err);
      }
    }
  }
}

// ---- engine -------------------------------------------------------------
function init() {
  const TEX = 256;                 // 256^2 = 65,536 particles
  const COUNT = TEX * TEX;

  const renderer = new THREE.WebGLRenderer({
    canvas: els.canvas,
    antialias: false,
    alpha: false,
    powerPreference: 'high-performance',
  });
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(DPR);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x06070d, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 70;

  // surface GPU name in the HUD
  try {
    const dbg = renderer.getContext().getExtension('WEBGL_debug_renderer_info');
    if (dbg) {
      const name = renderer.getContext().getParameter(dbg.UNMASKED_RENDERER_WEBGL);
      els.gpu.textContent = String(name).slice(0, 28);
    }
  } catch (_) { /* ignore */ }

  // ---- bake targets ----
  const baked = bakeTextTargets({ text: 'BITS', texSize: TEX, worldWidth: 64 });
  const scatter = bakeScatterTexture(TEX, 95);

  // ---- GPGPU ----
  const gpu = new GPUComputationRenderer(TEX, TEX, renderer);

  const pos0 = gpu.createTexture();
  const vel0 = gpu.createTexture();
  // seed positions from scatter so particles fly inward to form BITS
  pos0.image.data.set(scatter.image.data);
  // velocities start at zero
  vel0.image.data.fill(0);

  const velVar = gpu.addVariable('textureVelocity', velocityShader, vel0);
  const posVar = gpu.addVariable('texturePosition', positionShader, pos0);
  gpu.setVariableDependencies(velVar, [posVar, velVar]);
  gpu.setVariableDependencies(posVar, [posVar, velVar]);

  Object.assign(velVar.material.uniforms, {
    uTarget: { value: baked.texture },
    uMouse: { value: new THREE.Vector2(9999, 9999) },
    uMouseRadius: { value: 10.0 },
    uMouseForce: { value: 2.2 },
    uStiffness: { value: 0.018 },
    uDamping: { value: 0.90 },
    uTime: { value: 0 },
  });
  posVar.material.uniforms.uDelta = { value: 0.016 };

  const gpuErr = gpu.init();
  if (gpuErr !== null) throw new Error(gpuErr);

  // ---- points mesh ----
  const geo = new THREE.BufferGeometry();
  const refs = new Float32Array(COUNT * 2);
  const seeds = new Float32Array(COUNT);
  const positions = new Float32Array(COUNT * 3); // placeholder; real pos from texture
  for (let i = 0; i < COUNT; i++) {
    refs[i * 2 + 0] = (i % TEX) / TEX;
    refs[i * 2 + 1] = Math.floor(i / TEX) / TEX;
    seeds[i] = Math.random();
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('ref', new THREE.BufferAttribute(refs, 2));
  geo.setAttribute('seed', new THREE.BufferAttribute(seeds, 1));

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uPosition: { value: null },
      uVelocity: { value: null },
      uSize: { value: 2.4 },
      uPixelRatio: { value: DPR },
      uColor: { value: new THREE.Color(0xE9EBF5) },
      uAccent: { value: new THREE.Color(0x5E6CFF) },
      uAccent2: { value: new THREE.Color(0x9AA5FF) },
    },
    vertexShader: renderVertex,
    fragmentShader: renderFragment,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  scene.add(points);

  els.count.textContent = COUNT.toLocaleString();

  // ---- mouse (screen -> world plane at z=0) ----
  const mouseWorld = velVar.material.uniforms.uMouse.value;
  const ndc = new THREE.Vector2(2, 2);
  const ray = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const hit = new THREE.Vector3();
  let moved = false;
  window.addEventListener('pointermove', (e) => {
    ndc.x = (e.clientX / window.innerWidth) * 2 - 1;
    ndc.y = -(e.clientY / window.innerHeight) * 2 + 1;
    ray.setFromCamera(ndc, camera);
    if (ray.ray.intersectPlane(plane, hit)) {
      mouseWorld.set(hit.x, hit.y);
    }
    if (!moved) { moved = true; els.hint.classList.remove('show'); }
  }, { passive: true });
  window.addEventListener('pointerleave', () => mouseWorld.set(9999, 9999));
  setTimeout(() => { if (!moved) els.hint.classList.add('show'); }, 1400);

  // ---- resize ----
  window.addEventListener('resize', () => {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });

  // ---- loop + fps ----
  const clock = new THREE.Clock();
  let frames = 0, fpsT = 0;
  function tick() {
    const dt = Math.min(clock.getDelta(), 0.05);
    velVar.material.uniforms.uTime.value += dt;
    posVar.material.uniforms.uDelta.value = dt;

    gpu.compute();
    mat.uniforms.uPosition.value = gpu.getCurrentRenderTarget(posVar).texture;
    mat.uniforms.uVelocity.value = gpu.getCurrentRenderTarget(velVar).texture;

    renderer.render(scene, camera);

    // fps readout (twice a second)
    frames++; fpsT += dt;
    if (fpsT >= 0.5) {
      els.fps.textContent = Math.round(frames / fpsT);
      frames = 0; fpsT = 0;
    }
    requestAnimationFrame(tick);
  }
  tick();
}
