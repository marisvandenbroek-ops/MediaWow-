/* Lilou — 3D-uitnodigingen (three.js)
 * Gedeelde engine: tafel, licht, papier, reliëf, folie, camera en tijdlijn.
 * Wordt geïmporteerd door opening.html en proefdiner.html.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const gsap = window.gsap;
export { THREE };

/* ------------------------------------------------------------------ */
/* Hulpmiddelen                                                        */
/* ------------------------------------------------------------------ */
export function rng(seed = 1) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function cnv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

/* hoogtekaart (grijs) -> normal map */
function heightToNormal(hc, strength = 2) {
  const w = hc.width, h = hc.height;
  const src = hc.getContext('2d').getImageData(0, 0, w, h).data;
  const out = cnv(w, h), octx = out.getContext('2d');
  const img = octx.createImageData(w, h), d = img.data;
  const H = (x, y) => src[((y < 0 ? 0 : y >= h ? h - 1 : y) * w + (x < 0 ? 0 : x >= w ? w - 1 : x)) * 4];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (H(x + 1, y) - H(x - 1, y)) / 255 * strength;
      const dy = (H(x, y + 1) - H(x, y - 1)) / 255 * strength;
      let nx = -dx, ny = dy, nz = 1;
      const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
      const i = (y * w + x) * 4;
      d[i] = (nx * .5 + .5) * 255; d[i + 1] = (ny * .5 + .5) * 255; d[i + 2] = (nz * .5 + .5) * 255; d[i + 3] = 255;
    }
  }
  octx.putImageData(img, 0, 0);
  return out;
}

/* papierstructuur in een hoogtekaart tekenen */
function paperGrain(ctx, w, h, seed, amp = 9) {
  const r = rng(seed);
  // lage frequentie (wolkerig vilt)
  const s = cnv(48, 48), sx = s.getContext('2d'), si = sx.createImageData(48, 48);
  for (let i = 0; i < si.data.length; i += 4) { const v = 128 + (r() - .5) * 36; si.data[i] = si.data[i + 1] = si.data[i + 2] = v; si.data[i + 3] = 255; }
  sx.putImageData(si, 0, 0);
  ctx.save(); ctx.globalAlpha = .45; ctx.imageSmoothingEnabled = true; ctx.filter = 'blur(6px)'; ctx.drawImage(s, 0, 0, w, h); ctx.restore();
  // fijne korrel + vezels
  const g = ctx.getImageData(0, 0, w, h), gd = g.data;
  for (let i = 0; i < gd.length; i += 4) { const n = (r() - .5) * amp; gd[i] += n; gd[i + 1] += n; gd[i + 2] += n; }
  ctx.putImageData(g, 0, 0);
  ctx.save(); ctx.globalAlpha = .18; ctx.lineCap = 'round';
  for (let i = 0; i < w * h / 2500; i++) {
    const x = r() * w, y = r() * h, a = r() * Math.PI, L = 6 + r() * 22;
    ctx.strokeStyle = r() < .5 ? '#9a9a9a' : '#6a6a6a'; ctx.lineWidth = .6 + r();
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.cos(a + .6) * L * .5, y + Math.sin(a + .6) * L * .5, x + Math.cos(a) * L, y + Math.sin(a) * L); ctx.stroke();
  }
  ctx.restore();
  ctx.save(); ctx.filter = 'blur(.6px)'; ctx.drawImage(ctx.canvas, 0, 0); ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Drukwerk: kaartvlak met inkt, reliëf (blind), folie en letterpress  */
/* ------------------------------------------------------------------ */
export function printSheet({ wmm, hmm, ppm = 12, base, seed = 3, draw }) {
  const W = Math.round(wmm * ppm), Hh = Math.round(hmm * ppm);
  const col = cnv(W, Hh), hgt = cnv(W, Hh), orm = cnv(W, Hh);
  const c = col.getContext('2d'), hc = hgt.getContext('2d'), oc = orm.getContext('2d');
  // basis
  c.fillStyle = base; c.fillRect(0, 0, W, Hh);
  hc.fillStyle = '#808080'; hc.fillRect(0, 0, W, Hh);
  oc.fillStyle = 'rgb(255, 205, 0)'; oc.fillRect(0, 0, W, Hh);       // R=ao, G=ruwheid .8, B=metaal 0
  paperGrain(hc, W, Hh, seed);
  // lichte vlekkerigheid in de kleur
  const r = rng(seed + 9); const m = cnv(32, 32), mx = m.getContext('2d');
  for (let i = 0; i < 32 * 32; i++) { mx.fillStyle = `rgba(${r() < .5 ? '0,0,0' : '255,255,255'},${r() * .018})`; mx.fillRect(i % 32, (i / 32) | 0, 1, 1); }
  c.save(); c.filter = 'blur(20px)'; c.drawImage(m, 0, 0, W, Hh); c.restore();

  const mm = v => v * ppm;
  const api = {
    W, H: Hh, mm, ctx: c,
    /* tekst: kind = 'ink' | 'foil' | 'blind' (reliëf zonder inkt) */
    text(str, xmm, ymm, { font, size, weight = 400, style = 'normal', spacing = 0, align = 'center', color = '#000', kind = 'ink', depth = 1 }) {
      const px = mm(size), sp = mm(size) * spacing;
      const f = `${style} ${weight} ${px}px ${font}`;
      const set = ctx => { ctx.font = f; ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.letterSpacing = `${sp}px`; };
      const X = mm(xmm) + (align === 'center' ? sp / 2 : 0), Y = mm(ymm);
      if (kind === 'ink' || kind === 'foil') {
        set(c); c.fillStyle = kind === 'foil' ? '#c9964f' : color; c.fillText(str, X, Y);
        set(hc); hc.save(); hc.fillStyle = `rgba(0,0,0,${kind === 'foil' ? .28 : .16 * depth})`; hc.filter = 'blur(1.2px)'; hc.fillText(str, X, Y); hc.restore();
        if (kind === 'foil') { set(oc); oc.fillStyle = 'rgb(255, 60, 255)'; oc.fillText(str, X, Y); }
      } else { // blind reliëf
        set(hc);
        hc.save(); hc.fillStyle = `rgba(255,255,255,${.5 * depth})`; hc.filter = `blur(${px * .035}px)`; hc.fillText(str, X, Y); hc.restore();
        hc.save(); hc.fillStyle = `rgba(255,255,255,${.35 * depth})`; hc.filter = `blur(${px * .012}px)`; hc.fillText(str, X, Y); hc.restore();
        set(c); c.save(); c.globalAlpha = .05; c.fillStyle = '#fff'; c.fillText(str, X, Y); c.restore();
      }
    },
    line(x1, y1, x2, y2, { color = '#000', width = .25, kind = 'ink' } = {}) {
      for (const [ctx, st, lw] of [[c, kind === 'foil' ? '#d9b072' : color, 1], [hc, kind === 'blind' ? 'rgba(255,255,255,.55)' : 'rgba(0,0,0,.18)', kind === 'blind' ? 2.2 : 1]]) {
        ctx.save(); ctx.strokeStyle = st; ctx.lineWidth = mm(width) * lw; if (ctx === hc) ctx.filter = 'blur(1.5px)';
        if (!(ctx === c && kind === 'blind')) { ctx.beginPath(); ctx.moveTo(mm(x1), mm(y1)); ctx.lineTo(mm(x2), mm(y2)); ctx.stroke(); }
        ctx.restore();
      }
      if (kind === 'foil') { oc.save(); oc.strokeStyle = 'rgb(255,60,255)'; oc.lineWidth = mm(width); oc.beginPath(); oc.moveTo(mm(x1), mm(y1)); oc.lineTo(mm(x2), mm(y2)); oc.stroke(); oc.restore(); }
    },
    rect(x, y, w, h, opts = {}) { this.line(x, y, x + w, y, opts); this.line(x + w, y, x + w, y + h, opts); this.line(x + w, y + h, x, y + h, opts); this.line(x, y + h, x, y, opts); },
    arc(cx, cy, r, a0, a1, { color = '#000', width = .25, kind = 'ink' } = {}) {
      if (kind !== 'blind') { c.save(); c.strokeStyle = color; c.lineWidth = mm(width); c.beginPath(); c.arc(mm(cx), mm(cy), mm(r), a0, a1); c.stroke(); c.restore(); }
      hc.save(); hc.strokeStyle = kind === 'blind' ? 'rgba(255,255,255,.6)' : 'rgba(0,0,0,.15)'; hc.lineWidth = mm(width) * (kind === 'blind' ? 2.4 : 1); hc.filter = 'blur(2px)';
      hc.beginPath(); hc.arc(mm(cx), mm(cy), mm(r), a0, a1); hc.stroke(); hc.restore();
    }
  };
  draw(api);
  return { color: col, normal: heightToNormal(hgt, 4.2), orm };
}

function tex(canvas, srgb, aniso) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = aniso; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

export function sheetMaterial(sheet, aniso, { normalScale = 1, envIntensity = .35, flip = false } = {}) {
  const T = c => { const t = tex(c, c === sheet.color, aniso); if (flip) { t.center.set(.5, .5); t.rotation = Math.PI; } return t; };
  return new THREE.MeshStandardMaterial({
    map: T(sheet.color),
    normalMap: T(sheet.normal), normalScale: new THREE.Vector2(flip ? -normalScale : normalScale, flip ? -normalScale : normalScale),
    roughnessMap: T(sheet.orm), metalnessMap: T(sheet.orm),
    roughness: 1, metalness: 1, envMapIntensity: envIntensity
  });
}

/* algemeen papier (envelop) */
export function plainPaper({ color, seed = 5, aniso, size = 1024, repeat = 1 }) {
  const c = cnv(size, size), h = cnv(size, size);
  const cc = c.getContext('2d'); cc.fillStyle = color; cc.fillRect(0, 0, size, size);
  const hc = h.getContext('2d'); hc.fillStyle = '#808080'; hc.fillRect(0, 0, size, size); paperGrain(hc, size, size, seed, 12);
  const map = tex(c, true, aniso), nrm = tex(heightToNormal(h, 2.2), false, aniso);
  for (const t of [map, nrm]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); }
  return new THREE.MeshStandardMaterial({ map, normalMap: nrm, roughness: .86, metalness: 0, envMapIntensity: .4, side: THREE.DoubleSide });
}

/* ------------------------------------------------------------------ */
/* Linnen tafelkleed                                                   */
/* ------------------------------------------------------------------ */
function linenMaterial(aniso) {
  const S = 1024, P = 4, N = S / P, r = rng(21);
  const col = cnv(S, S), hgt = cnv(S, S);
  const c = col.getContext('2d'), h = hgt.getContext('2d');
  c.fillStyle = '#6e2116'; c.fillRect(0, 0, S, S);
  h.fillStyle = '#3a3a3a'; h.fillRect(0, 0, S, S);
  const weft = Array.from({ length: N }, () => (r() - .5) * 26), warp = Array.from({ length: N }, () => (r() - .5) * 26);
  const slub = (i, j) => Math.sin(i * 12.9898 + j * 78.233) * 43758.5453 % 1;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const over = (i + j) % 2 === 0;
    const v = over ? warp[i] : weft[j];
    const s = (slub(over ? i : j, over ? j : i) - .5) * 14;
    const L = 30 + v * .35 + s * .3;
    c.fillStyle = `hsl(7, ${48 + v * .3}%, ${Math.max(7, L * .42)}%)`;
    if (over) c.fillRect(i * P + .5, j * P - .3, P - 1, P + .6); else c.fillRect(i * P - .3, j * P + .5, P + .6, P - 1);
    // hoogte: draad bol
    const g = h.createLinearGradient(over ? i * P : 0, over ? 0 : j * P, over ? i * P + P : 0, over ? 0 : j * P + P);
    const top = 200 + s * 2;
    g.addColorStop(0, '#555'); g.addColorStop(.5, `rgb(${top},${top},${top})`); g.addColorStop(1, '#555');
    h.fillStyle = g;
    if (over) h.fillRect(i * P + .4, j * P - .2, P - .8, P + .4); else h.fillRect(i * P - .2, j * P + .4, P + .4, P - .8);
  }
  const map = tex(col, true, aniso), nrm = tex(heightToNormal(hgt, 3), false, aniso);
  for (const t of [map, nrm]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(30, 30); }
  return new THREE.MeshStandardMaterial({ map, normalMap: nrm, normalScale: new THREE.Vector2(.7, .7), roughness: .95, metalness: 0, envMapIntensity: .12 });
}

/* ------------------------------------------------------------------ */
/* Scène                                                               */
/* ------------------------------------------------------------------ */
export async function createStage({ canvas, fonts = [] }) {
  await Promise.all(fonts.map(f => document.fonts.load(f)));
  const params = new URLSearchParams(location.search);
  const VIDEO = params.has('video'), STORY = params.has('story');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: VIDEO, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, VIDEO ? 1 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .9;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const aniso = renderer.capabilities.getMaxAnisotropy();

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#120403');
  scene.fog = new THREE.Fog('#120403', .9, 2.6);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), .04).texture;
  scene.environmentRotation && scene.environmentRotation.set(0, 0, 0);

  const camera = new THREE.PerspectiveCamera(30, 1, .01, 10);

  // tafel
  const table = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), linenMaterial(aniso));
  table.rotation.x = -Math.PI / 2; table.receiveShadow = true; scene.add(table);

  // kaarslicht (hoofdlicht) + zachte vulling
  const key = new THREE.SpotLight('#ffbf80', 2.4, 0, Math.PI / 6.5, 1, 2);
  key.position.set(-.42, .55, -.38); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 9; key.shadow.blurSamples = 20;
  key.shadow.bias = -.00025; key.shadow.normalBias = .0012; key.shadow.camera.near = .1; key.shadow.camera.far = 2;
  scene.add(key, key.target);
  const fill = new THREE.HemisphereLight('#ffd9bd', '#1a0503', .12); scene.add(fill);
  const rim = new THREE.DirectionalLight('#ffd2ad', .12); rim.position.set(.6, .5, .5); scene.add(rim);

  // onscherpe kaarsjes op de achtergrond
  const bokeh = new THREE.Group();
  const r = rng(77);
  const bc = cnv(128, 128), bx = bc.getContext('2d');
  const gr = bx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,214,160,.95)'); gr.addColorStop(.62, 'rgba(255,190,120,.7)'); gr.addColorStop(.8, 'rgba(255,170,100,.35)'); gr.addColorStop(1, 'rgba(255,160,90,0)');
  bx.fillStyle = gr; bx.fillRect(0, 0, 128, 128);
  const btex = new THREE.CanvasTexture(bc); btex.colorSpace = THREE.SRGBColorSpace;
  for (let i = 0; i < 11; i++) {
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: btex, transparent: true, opacity: .35 + r() * .45, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false }));
    const sz = .05 + r() * .07; m.scale.set(sz, sz, 1);
    m.position.set(-.8 + r() * 1.6, .1 + r() * .25, -1.2 - r() * .8); bokeh.add(m);
  }
  scene.add(bokeh);

  // nabewerking: scherptediepte
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const dof = new BokehPass(scene, camera, { focus: .4, aperture: .03, maxblur: .02 });
  composer.addPass(dof);
  composer.addPass(new OutputPass());

  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false); composer.setSize(w, h);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  resize();

  /* afstand zodat een vlak (w x h meter) het beeld vult */
  function fitDistance(w, h, fracW = .9, fracH = .86) {
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    return Math.max(w / (fracW * 2 * t * camera.aspect), h / (fracH * 2 * t));
  }

  return { THREE, renderer, scene, camera, composer, dof, key, fill, rim, bokeh, aniso, resize, fitDistance, VIDEO, STORY, params };
}

/* ------------------------------------------------------------------ */
/* Kaart (dun blok met voor- en achterkant)                            */
/* ------------------------------------------------------------------ */
export function makeCard(stage, { wmm, hmm, front, back, edge, thick = .55 }) {
  const w = wmm / 1000, h = hmm / 1000, t = thick / 1000;
  const g = new THREE.BoxGeometry(w, t, h);
  const edgeMat = new THREE.MeshStandardMaterial({ color: edge, roughness: .9 });
  const mesh = new THREE.Mesh(g, [edgeMat, edgeMat, front, back, edgeMat, edgeMat]);
  mesh.castShadow = true; mesh.receiveShadow = true;
  const pivot = new THREE.Group(); pivot.add(mesh);
  return { pivot, mesh, w, h, t };
}

/* ------------------------------------------------------------------ */
/* Camera / pose-staat + render                                        */
/* ------------------------------------------------------------------ */
export function rig(stage) {
  const cam = { px: 0, py: .3, pz: .3, tx: 0, ty: 0, tz: 0 };
  const light = { x: -.42, y: .55, z: -.38, tx: 0, tz: 0, flick: 1 };
  const look = new THREE.Vector3();
  function apply(t) {
    const { camera, key, dof } = stage;
    camera.position.set(cam.px, cam.py, cam.pz);
    look.set(cam.tx, cam.ty, cam.tz); camera.lookAt(look);
    const f = 1 + .035 * Math.sin(t * 7.1) + .025 * Math.sin(t * 13.7 + 1.3) + .015 * Math.sin(t * 23.3 + 2.1);
    key.intensity = 1.7 * f * light.flick;
    key.position.set(light.x, light.y, light.z);
    key.target.position.set(light.tx, 0, light.tz); key.target.updateMatrixWorld();
    dof.uniforms.focus.value = camera.position.distanceTo(look);
  }
  return { cam, light, apply };
}

/* gemeenschappelijke UI + afspeellus */
export function runner(stage, { build, onReady }) {
  const { renderer, composer, VIDEO } = stage;
  const state = build();             // { tl, apply(t), flip(), finalFrame() }
  let t0 = performance.now(), introDone = false;
  state.tl.eventCallback('onComplete', () => { introDone = true; });

  function frame(t) { state.apply(t); composer.render(); }

  if (VIDEO) {
    const master = state.videoTimeline();
    window.__duration = master.duration();
    window.__seek = t => { master.seek(t, false); frame(t); };
    window.__seek(0);
    document.body.classList.add('ready', 'video');
    window.__ready = Promise.resolve();
    return;
  }
  state.tl.play(0);
  document.body.classList.add('ready');
  addEventListener('resize', () => { stage.resize(); state.onResize && state.onResize(); });
  renderer.setAnimationLoop(() => frame((performance.now() - t0) / 1000));

  const flip = () => { if (introDone) state.flip(); };
  document.getElementById('flipBtn')?.addEventListener('click', flip);
  stage.renderer.domElement.addEventListener('click', flip);
  document.getElementById('replayBtn')?.addEventListener('click', () => { introDone = false; state.reset && state.reset(); state.tl.invalidate().restart(); });
  addEventListener('pointermove', e => state.pointer && state.pointer(e.clientX / innerWidth * 2 - 1, e.clientY / innerHeight * 2 - 1, introDone));
  onReady && onReady();
}
