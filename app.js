import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/* ---------- зоны: геометрия задаётся долями габаритов, считается после загрузки ----------
   fx: -1..1 (лево..право от ширины), fy: 0..1 (низ..верх), fz: 0..1 (перед..зад) */
const ZONES = [
  {
    id: 'hood', label: 'Капот',
    boxes: [{ c: [0, 0.42, 0.22], s: [0.82, 0.22, 0.30] }],
    anchor: [0, 0.52, 0.24],
    desc: 'Самая уязвимая зона: сколы от гравия, выгорание лака.',
    services: [
      ['Полировка + керамика 9H', 'от 24 000 ₽'],
      ['Антигравийная плёнка (полиуретан)', '18 000 ₽'],
      ['Удаление сколов и рисок', 'от 4 500 ₽'],
    ],
  },
  {
    id: 'lights', label: 'Оптика',
    boxes: [
      { c: [0.36, 0.58, 0.12], s: [0.26, 0.16, 0.18] },
      { c: [-0.36, 0.58, 0.12], s: [0.26, 0.16, 0.18] },
    ],
    meshNames: ['lights', 'leds'],
    anchor: [0.4, 0.62, 0.1],
    desc: 'Мутные фары режут свет на 40% и старят машину.',
    services: [
      ['Полировка фар (пара)', '3 500 ₽'],
      ['Бронирование оптики плёнкой', '6 000 ₽'],
      ['Восстановление стёкол фар', 'от 8 000 ₽'],
    ],
  },
  {
    id: 'bumper', label: 'Передний бампер',
    boxes: [{ c: [0, 0.2, 0.03], s: [1.0, 0.28, 0.12] }],
    anchor: [0, 0.22, 0.0],
    desc: 'Притёртости на парковке — чиним локально, без перекраса детали.',
    services: [
      ['Локальная покраска', 'от 8 000 ₽'],
      ['Удаление царапин полировкой', 'от 3 000 ₽'],
      ['Оклейка плёнкой', '12 000 ₽'],
    ],
  },
  {
    id: 'doors', label: 'Двери и пороги',
    boxes: [
      { c: [0.44, 0.38, 0.52], s: [0.14, 0.5, 0.34] },
      { c: [-0.44, 0.38, 0.52], s: [0.14, 0.5, 0.34] },
    ],
    anchor: [0.5, 0.45, 0.5],
    desc: 'Двери, пороги, зеркала: плёнка на кромки и химчистка изнутри.',
    services: [
      ['Плёнка на кромки дверей + пороги', '5 500 ₽'],
      ['Химчистка салона', 'от 12 000 ₽'],
      ['Полировка боковин', 'от 9 000 ₽'],
    ],
  },
  {
    id: 'glass', label: 'Стёкла',
    boxes: [{ c: [0, 0.82, 0.42], s: [0.7, 0.2, 0.16] }],
    meshNames: ['glass', 'wipers'],
    anchor: [0, 0.85, 0.4],
    desc: 'Антидождь и защита лобового — видимость решает.',
    services: [
      ['Антидождь на все стёкла', '4 000 ₽'],
      ['Бронеплёнка на лобовое', '15 000 ₽'],
      ['Полировка лобового стекла', '7 500 ₽'],
    ],
  },
  {
    id: 'rear', label: 'Задняя часть',
    boxes: [{ c: [0, 0.45, 0.9], s: [0.95, 0.5, 0.2] }],
    meshNames: ['lights_red', 'grills'],
    anchor: [0, 0.62, 0.92],
    desc: 'Крышка двигателя и фонари собирают пыль и выхлоп — керамика решает.',
    services: [
      ['Керамика задней части', 'от 6 000 ₽'],
      ['Полировка фонарей', '3 000 ₽'],
      ['Чернение выхлопных насадок', '2 500 ₽'],
    ],
  },
  {
    id: 'wheels', label: 'Диски и резина',
    boxes: [],
    wheelSubtrees: true,
    anchor: [0.5, 0.18, 0.24],
    desc: 'Диски первыми ловят реагенты и тормозную пыль.',
    services: [
      ['Керамика на диски (4 шт)', '4 000 ₽'],
      ['Глубокая мойка + чернение резины', '1 500 ₽'],
      ['Порошковая покраска дисков', 'от 16 000 ₽'],
    ],
  },
];

/* ---------- рендер ---------- */
window.addEventListener('error', e => {
  const l = document.getElementById('loader');
  if (l) l.textContent = 'JS: ' + (e.message || e.type);
});

const container = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 100);
const LOOK_AT = new THREE.Vector3(0, 0.55, 0);

const key = new THREE.DirectionalLight(0xffffff, 1.1); key.position.set(4, 8, 4); scene.add(key);
const rim = new THREE.DirectionalLight(0xc8f04c, 0.35); rim.position.set(-6, 4, -5); scene.add(rim);

const car = new THREE.Group();
scene.add(car);

/* ---------- материалы (по мотивам webgl_materials_car) ---------- */
const bodyMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x6e0d25, metalness: 1.0, roughness: 0.45, clearcoat: 1.0, clearcoatRoughness: 0.03,
});
const detailsMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1.0, roughness: 0.5 });
const glassMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xffffff, metalness: 0.25, roughness: 0, transmission: 1.0, transparent: true,
});

/* ---------- загрузка ---------- */
const HL_COLOR = 0xc8f04c;
const pickables = [];
const zoneById = {};
ZONES.forEach(z => { zoneById[z.id] = z; z.hlObjects = []; z.realMeshes = []; });
let carSize = null, carBox = null, frontZ = -1;

const draco = new DRACOLoader();
draco.setDecoderPath('draco/');
const loader = new GLTFLoader();
loader.setDRACOLoader(draco);

loader.load('ferrari.glb', gltf => {
 try {
  const model = gltf.scene.children[0];

  model.getObjectByName('body').material = bodyMaterial;
  ['rim_fl', 'rim_fr', 'rim_rl', 'rim_rr', 'trim', 'chrome', 'metal'].forEach(n => {
    const o = model.getObjectByName(n); if (o) o.material = detailsMaterial;
  });
  const g = model.getObjectByName('glass'); if (g) g.material = glassMaterial;

  car.add(model);
  car.updateMatrixWorld(true);

  /* центрируем: bbox-центр в (0, *, 0), низ на y=0 */
  const box0 = new THREE.Box3().setFromObject(car);
  const c0 = box0.getCenter(new THREE.Vector3());
  model.position.x -= c0.x;
  model.position.z -= c0.z;
  model.position.y -= box0.min.y;
  car.updateMatrixWorld(true);

  carBox = new THREE.Box3().setFromObject(car);
  carSize = carBox.getSize(new THREE.Vector3());
  LOOK_AT.set(0, carSize.y * 0.42, 0);

  /* перед: по передним колёсам */
  const wf = model.getObjectByName('wheel_fl').getWorldPosition(new THREE.Vector3());
  const wr = model.getObjectByName('wheel_rl').getWorldPosition(new THREE.Vector3());
  frontZ = wf.z < wr.z ? carBox.min.z : carBox.max.z;
  const rearZ = frontZ === carBox.min.z ? carBox.max.z : carBox.min.z;

  const fx = v => v * carSize.x / 2;                       // -1..1 → метры от центра
  const fy = v => carBox.min.y + v * carSize.y;            // 0..1 → метры
  const fz = v => frontZ + v * (rearZ - frontZ);           // 0 перед → 1 зад

  /* AO-тень под машиной */
  new THREE.TextureLoader().load('ferrari_ao.png', tex => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(carSize.x * 1.15, carSize.z * 1.15),
      new THREE.MeshBasicMaterial({ map: tex, blending: THREE.MultiplyBlending, toneMapped: false, transparent: true })
    );
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = frontZ === carBox.min.z ? 0 : Math.PI;
    m.position.y = carBox.min.y + 0.003;
    m.renderOrder = 2;
    car.add(m);
  });

  /* подиум-кольцо */
  const ringR = Math.max(carSize.x, carSize.z) * 0.72;
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(ringR, ringR + 0.02, 128),
    new THREE.MeshBasicMaterial({ color: HL_COLOR, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false })
  );
  ring.rotation.x = -Math.PI / 2; ring.position.y = carBox.min.y + 0.004; car.add(ring);

  /* хитбоксы зон */
  ZONES.forEach(z => {
    z.boxes.forEach(b => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(carSize.x * b.s[0], carSize.y * b.s[1], Math.abs(rearZ - frontZ) * b.s[2]),
        new THREE.MeshBasicMaterial({ color: HL_COLOR, transparent: true, opacity: 0, depthWrite: false })
      );
      mesh.position.set(fx(b.c[0]), fy(b.c[1]), fz(b.c[2]));
      mesh.userData.zoneId = z.id;
      mesh.renderOrder = 5;
      car.add(mesh);
      pickables.push(mesh);
      z.hlObjects.push(mesh);
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(mesh.geometry),
        new THREE.LineBasicMaterial({ color: HL_COLOR, transparent: true, opacity: 0 })
      );
      mesh.add(edges);
      z.hlObjects.push(edges);
    });
    /* реальные меши зоны */
    (z.meshNames || []).forEach(n => {
      const o = model.getObjectByName(n);
      if (o) o.traverse(c => { if (c.isMesh) { c.userData.zoneId = z.id; pickables.push(c); z.realMeshes.push(c); } });
    });
  });
  /* колёса: поддеревья wheel_* */
  ['wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr'].forEach(n => {
    const w = model.getObjectByName(n);
    if (w) w.traverse(c => {
      if (c.isMesh) { c.userData.zoneId = 'wheels'; pickables.push(c); zoneById.wheels.realMeshes.push(c); }
    });
  });
  /* кузов кликабелен как ближайшая зона? нет — кузов вне зон закрывает панель */

  /* якоря маркеров в метры */
  ZONES.forEach(z => { z.anchorV = new THREE.Vector3(fx(z.anchor[0]), fy(z.anchor[1]), fz(z.anchor[2])); });

  /* стартовый ракурс: передом 3/4 к камере */
  car.rotation.y = frontZ === carBox.min.z ? Math.PI * 0.92 : -Math.PI * 0.08;

  document.getElementById('loader').style.display = 'none';
  buildMarkers();
  layout();
  const preset = new URLSearchParams(location.search).get('zone');
  if (preset && zoneById[preset]) selectZone(preset);
 } catch (e) {
  document.getElementById('loader').textContent = 'INIT: ' + e.message;
  throw e;
 }
}, xhr => {
  if (xhr.total) document.getElementById('loader').textContent =
    'ЗАГРУЗКА 3D… ' + Math.round(xhr.loaded / xhr.total * 100) + '%';
}, err => {
  document.getElementById('loader').textContent = 'ОШИБКА: ' + (err && err.message || 'загрузка');
  console.error(err);
});

/* ---------- маркеры ---------- */
const markerLayer = document.getElementById('markers');
const markerEls = [];
function buildMarkers() {
  ZONES.forEach(z => {
    const el = document.createElement('button');
    el.className = 'dot';
    el.setAttribute('aria-label', z.label);
    el.innerHTML = '<span class="dot-core"></span>';
    el.addEventListener('click', e => { e.stopPropagation(); selectZone(z.id); });
    markerLayer.appendChild(el);
    markerEls.push({ el, id: z.id, z });
  });
}
const projV = new THREE.Vector3();
function updateMarkers() {
  markerEls.forEach(m => {
    if (!m.z.anchorV) return;
    projV.copy(m.z.anchorV).applyMatrix4(car.matrixWorld).project(camera);
    const behind = projV.z > 1;
    m.el.style.transform = `translate(${(projV.x * 0.5 + 0.5) * window.innerWidth}px, ${(-projV.y * 0.5 + 0.5) * window.innerHeight}px)`;
    m.el.style.opacity = behind ? 0 : 1;
    m.el.style.pointerEvents = behind ? 'none' : 'auto';
    m.el.classList.toggle('active', m.id === activeZone);
  });
}

/* ---------- выбор зоны / панель ---------- */
let activeZone = null;
const panel = document.getElementById('panel');
const panelTitle = document.getElementById('p-title');
const panelDesc = document.getElementById('p-desc');
const panelList = document.getElementById('p-list');

function setHighlight(zoneId, on) {
  const z = zoneById[zoneId]; if (!z) return;
  z.hlObjects.forEach(o => { o.material.opacity = on ? (o.isLineSegments ? 0.8 : 0.1) : 0; });
  z.realMeshes.forEach(o => {
    if (on) {
      if (o.userData._em === undefined) o.userData._em = o.material.emissive ? o.material.emissive.getHex() : null;
      if (o.material.emissive) { o.material = o.material.clone(); o.material.emissive.setHex(0x5a6e12); o.userData._cloned = true; }
    } else if (o.userData._em !== undefined && o.material.emissive) {
      o.material.emissive.setHex(o.userData._em || 0x000000);
    }
  });
}

function selectZone(id) {
  if (activeZone === id) { closePanel(); return; }
  if (activeZone) setHighlight(activeZone, false);
  activeZone = id;
  setHighlight(id, true);
  const z = zoneById[id];
  panelTitle.textContent = z.label;
  panelDesc.textContent = z.desc;
  panelList.innerHTML = z.services.map(s =>
    `<div class="svc"><span>${s[0]}</span><b>${s[1]}</b></div>`).join('');
  panel.classList.add('open');
  idleT = 0;
}
function closePanel() {
  if (activeZone) setHighlight(activeZone, false);
  activeZone = null;
  panel.classList.remove('open');
}
document.getElementById('p-close').addEventListener('click', closePanel);

/* ---------- raycast ---------- */
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let downXY = null;
renderer.domElement.addEventListener('pointerdown', e => { downXY = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('pointerup', e => {
  if (!downXY) return;
  const dx = e.clientX - downXY[0], dy = e.clientY - downXY[1];
  downXY = null;
  if (dx * dx + dy * dy > 64) return;
  ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects(pickables, false);
  if (hits.length) selectZone(hits[0].object.userData.zoneId);
  else closePanel();
});

/* ---------- вращение ---------- */
let vel = 0, dragging = false, lastX = 0, idleT = 0;
renderer.domElement.addEventListener('pointerdown', e => { dragging = true; lastX = e.clientX; idleT = 0; });
window.addEventListener('pointermove', e => {
  if (!dragging) return;
  const d = e.clientX - lastX; lastX = e.clientX;
  car.rotation.y += d * 0.008; vel = d * 0.008; idleT = 0;
});
window.addEventListener('pointerup', () => { dragging = false; });

/* ---------- камера / резайз ---------- */
function layout() {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  const portrait = h > w;
  const L = carSize ? Math.max(carSize.x, carSize.z) : 4.5;
  const dist = L * (portrait ? 2.55 : 1.85);
  camera.position.set(2.6, 1.6, 3.4).normalize().multiplyScalar(dist);
  if (portrait) camera.position.y += 0.6;
  camera.lookAt(LOOK_AT);
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
window.addEventListener('resize', layout);
layout();

/* ---------- цикл ---------- */
const clock = new THREE.Clock();
function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  idleT += dt;
  if (!dragging) {
    car.rotation.y += vel; vel *= 0.94;
    if (idleT > 3 && !activeZone) car.rotation.y += dt * 0.25;
  }
  updateMarkers();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();
