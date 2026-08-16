import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/* ---------- данные зон ---------- */
const ZONES = [
  {
    id: 'hood', label: 'Капот', anchor: [0, 0.74, 0.75],
    boxes: [{ c: [0, 0.62, 0.75], s: [1.0, 0.2, 0.75] }],
    desc: 'Самая уязвимая зона: сколы от гравия, выгорание лака.',
    services: [
      ['Полировка + керамика 9H', 'от 24 000 ₽'],
      ['Антигравийная плёнка (полиуретан)', '18 000 ₽'],
      ['Удаление сколов и рисок', 'от 4 500 ₽'],
    ],
  },
  {
    id: 'lights', label: 'Оптика', anchor: [0.46, 0.5, 1.22],
    boxes: [{ c: [0, 0.49, 1.16], s: [1.18, 0.16, 0.22] }],
    desc: 'Мутные фары режут свет на 40% и старят машину.',
    services: [
      ['Полировка фар (пара)', '3 500 ₽'],
      ['Бронирование оптики плёнкой', '6 000 ₽'],
      ['Восстановление стёкол фар', 'от 8 000 ₽'],
    ],
  },
  {
    id: 'bumper', label: 'Бампер', anchor: [0, 0.33, 1.3],
    boxes: [{ c: [0, 0.3, 1.19], s: [1.24, 0.3, 0.24] }],
    desc: 'Притёртости на парковке — чиним локально, без перекраса детали.',
    services: [
      ['Локальная покраска', 'от 8 000 ₽'],
      ['Удаление царапин полировкой', 'от 3 000 ₽'],
      ['Оклейка плёнкой', '12 000 ₽'],
    ],
  },
  {
    id: 'doors', label: 'Двери и пороги', anchor: [0.68, 0.58, 0.05],
    boxes: [
      { c: [0.62, 0.52, 0.0], s: [0.14, 0.65, 1.15] },
      { c: [-0.62, 0.52, 0.0], s: [0.14, 0.65, 1.15] },
    ],
    desc: 'Двери, пороги, зеркала: плёнка на кромки и химчистка изнутри.',
    services: [
      ['Плёнка на кромки дверей + пороги', '5 500 ₽'],
      ['Химчистка салона', 'от 12 000 ₽'],
      ['Полировка боковин', 'от 9 000 ₽'],
    ],
  },
  {
    id: 'roof', label: 'Крыша и стёкла', anchor: [0, 1.14, -0.15],
    boxes: [{ c: [0, 0.98, -0.15], s: [0.95, 0.3, 1.15] }],
    desc: 'Антидождь на стёкла и винил на крышу — быстрое преображение.',
    services: [
      ['Оклейка крыши винилом (чёрный глянец)', '14 000 ₽'],
      ['Антидождь на все стёкла', '4 000 ₽'],
      ['Полировка лобового стекла', '7 500 ₽'],
    ],
  },
  {
    id: 'trunk', label: 'Багажник и спойлер', anchor: [0, 0.84, -1.18],
    boxes: [{ c: [0, 0.58, -1.05], s: [1.15, 0.5, 0.55] }],
    meshNames: ['spoiler'],
    desc: 'Задняя часть собирает пыль и выхлоп — керамика решает.',
    services: [
      ['Керамика задней части', 'от 6 000 ₽'],
      ['Оклейка спойлера', '4 500 ₽'],
      ['Полировка фонарей', '3 000 ₽'],
    ],
  },
  {
    id: 'wheels', label: 'Диски и резина', anchor: [0.5, 0.3, 0.72],
    boxes: [],
    meshNames: ['wheel-front-left', 'wheel-front-right', 'wheel-back-left', 'wheel-back-right'],
    desc: 'Диски первыми ловят реагенты и тормозную пыль.',
    services: [
      ['Керамика на диски (4 шт)', '4 000 ₽'],
      ['Глубокая мойка + чернение резины', '1 500 ₽'],
      ['Порошковая покраска дисков', 'от 16 000 ₽'],
    ],
  },
];

/* ---------- сцена ---------- */
const container = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 60);
const LOOK_AT = new THREE.Vector3(0, 0.5, 0);

scene.add(new THREE.HemisphereLight(0xdfe8f5, 0x14161a, 1.1));
const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(3, 6, 3); scene.add(key);
const rim = new THREE.DirectionalLight(0xc8f04c, 0.55); rim.position.set(-5, 3, -4); scene.add(rim);
const fill = new THREE.DirectionalLight(0x88a0ff, 0.5); fill.position.set(-2, 2, 5); scene.add(fill);

const car = new THREE.Group();
scene.add(car);

/* блоб-тень */
(function makeShadow() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 256;
  const g = cv.getContext('2d');
  const grd = g.createRadialGradient(128, 128, 20, 128, 128, 128);
  grd.addColorStop(0, 'rgba(0,0,0,0.55)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(cv);
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(3.6, 3.6),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
  );
  m.rotation.x = -Math.PI / 2; m.position.y = 0.002; car.add(m);
})();

/* подиум-кольцо */
(function makeRing() {
  const geo = new THREE.RingGeometry(1.72, 1.75, 96);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
    color: 0xc8f04c, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false,
  }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.004; car.add(m);
})();

/* ---------- зоны: хитбоксы и подсветка ---------- */
const HL_COLOR = 0xc8f04c;
const pickables = [];
const zoneById = {};
ZONES.forEach(z => { zoneById[z.id] = z; z.hlObjects = []; });

function addZoneBoxes() {
  ZONES.forEach(z => {
    z.boxes.forEach(b => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(b.s[0], b.s[1], b.s[2]),
        new THREE.MeshBasicMaterial({ color: HL_COLOR, transparent: true, opacity: 0, depthWrite: false })
      );
      mesh.position.set(b.c[0], b.c[1], b.c[2]);
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
  });
}

/* ---------- загрузка модели ---------- */
const bin = Uint8Array.from(atob(window.MODEL_B64), c => c.charCodeAt(0));
new GLTFLoader().parse(bin.buffer, '', gltf => {
  const model = gltf.scene;
  model.traverse(o => {
    if (o.isMesh) {
      o.material.roughness = 0.55;
      o.material.metalness = 0.05;
      const nodeName = (o.parent && o.parent.name) || o.name;
      const zone = ZONES.find(z => z.meshNames && (z.meshNames.includes(o.name) || z.meshNames.includes(nodeName)));
      if (zone) {
        o.material = o.material.clone();
        o.userData.zoneId = zone.id;
        pickables.push(o);
        zone.realMeshes = zone.realMeshes || [];
        zone.realMeshes.push(o);
      }
    }
  });
  car.add(model);
  addZoneBoxes();
  document.getElementById('loader').style.display = 'none';
  buildMarkers();
  const preset = new URLSearchParams(location.search).get('zone');
  if (preset && zoneById[preset]) selectZone(preset);
}, err => {
  document.getElementById('loader').textContent = 'ОШИБКА ЗАГРУЗКИ';
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
    markerEls.push({ el, v: new THREE.Vector3(...z.anchor), id: z.id });
  });
}
const projV = new THREE.Vector3();
function updateMarkers() {
  markerEls.forEach(m => {
    projV.copy(m.v).applyMatrix4(car.matrixWorld).project(camera);
    const behind = projV.z > 1;
    const x = (projV.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-projV.y * 0.5 + 0.5) * window.innerHeight;
    m.el.style.transform = `translate(${x}px, ${y}px)`;
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
  z.hlObjects.forEach(o => { o.material.opacity = on ? (o.isLineSegments ? 0.85 : 0.14) : 0; });
  (z.realMeshes || []).forEach(o => {
    if (on) { o.userData._em = o.material.emissive.getHex(); o.material.emissive.setHex(0x3a4d0a); }
    else if (o.userData._em !== undefined) o.material.emissive.setHex(o.userData._em);
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
  if (dx * dx + dy * dy > 64) return; // это был drag
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
  const dist = portrait ? 8.6 : 6.8;
  camera.position.set(2.6, 2.0, 3.4).normalize().multiplyScalar(dist);
  if (portrait) camera.position.y += 0.5;
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
