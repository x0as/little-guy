const WORLD_W = 3000;
const GROUND = 300;   // top of the sidewalk
const ROAD = 346;     // where cars sit

const props = [];          // buildings + cars, anything the laser can break
const farBuildings = [];   // background silhouettes, not breakable
const debris = [];
let kills = 0;

// seeded random so the city is the same every time you test
function mulberry(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function buildCity() {
  const r = mulberry(7);
  const range = (a, b) => a + r() * (b - a);
  const buildingColors = ['#4a5568', '#5a4a6a', '#6b4a4a', '#3f5a63', '#5c5f73', '#66584a'];
  const carColors = ['#c0392b', '#2980b9', '#f1c40f', '#27ae60', '#ecf0f1', '#8e44ad'];
  const pick = list => list[Math.floor(r() * list.length)];

  let x = -50;
  while (x < WORLD_W + 50) {
    const w = range(60, 120), h = range(110, 270);
    farBuildings.push({ x, y: GROUND - h, w, h });
    x += w + range(0, 12);
  }

  x = 80;
  while (x < WORLD_W - 80) {
    const img = pickArt('building_', 6);
    const w = img ? img.width : range(54, 110);
    const h = img ? img.height : range(90, 230);
    props.push({
      kind: 'building', x: x + w / 2, y: GROUND, w, h, img,
      color: pick(buildingColors), hp: 1.2 + h / 150,
      seed: Math.floor(r() * 1e9), flash: 0, shake: 0,
    });
    x += w + range(6, 30);
  }

  x = 120;
  while (x < WORLD_W - 60) {
    const img = pickArt('car_', 4);
    props.push({
      kind: 'car', x, y: ROAD, w: img ? img.width : 30, h: img ? img.height : 13, img,
      color: pick(carColors), hp: 0.4, seed: 0, flash: 0, shake: 0,
    });
    x += range(90, 220);
  }
}

function propAt(px, py) {
  for (const p of props) {
    if (px >= p.x - p.w / 2 && px <= p.x + p.w / 2 && py >= p.y - p.h && py <= p.y) return p;
  }
  return null;
}

function hurtProp(p, dt) {
  p.hp -= dt;
  p.flash = 0.06;
  p.shake = (Math.random() - 0.5) * 2;
  if (p.hp <= 0) breakProp(p);
}

function breakProp(p) {
  const n = Math.max(10, Math.min(60, Math.floor(p.w * p.h / 120)));
  burst(p.x, p.y - p.h / 2, p.color, n);
  props.splice(props.indexOf(p), 1);
  kills++;
}

function burst(x, y, color, count, spread = 160, up = 120) {
  for (let i = 0; i < count; i++) {
    debris.push({
      x: x + (Math.random() - 0.5) * 12,
      y: y + (Math.random() - 0.5) * 12,
      vx: (Math.random() * 2 - 1) * spread,
      vy: -up * 1.5 + Math.random() * up * 1.8,
      s: 2 + Math.floor(Math.random() * 4),
      life: 0.9, color,
    });
  }
}

function updateDebris(dt) {
  for (let i = debris.length - 1; i >= 0; i--) {
    const d = debris[i];
    d.vy += 500 * dt;
    d.x += d.vx * dt;
    d.y += d.vy * dt;
    d.life -= dt;
    if (d.life <= 0) debris.splice(i, 1);
  }
}

function updateProps(dt) {
  for (const p of props) {
    if (p.flash > 0) {
      p.flash -= dt;
      if (p.flash <= 0) { p.flash = 0; p.shake = 0; }
    }
  }
}
