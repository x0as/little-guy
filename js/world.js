const WORLD_W = 3000;
const GROUND = 300;
const ROAD = 346;

const props = [];
const farBuildings = [];
const debris = [];
let kills = 0;

const CITY_MAX_HEALTH = 100;
const BOSS_BASE_HEALTH = 2000;
const BOSS_WAVE_HEALTH_SCALE = 1.35;
const UFO_HEALTH = 45;
const ALIEN_HEALTH = 20;
const ENEMY_SHOT_DAMAGE = 8;
const ENEMY_SHOT_SPEED = 190;
const ENEMY_ATTACK_INTERVAL = 1.8;
// Mothership spawns UFOs on a timer
const UFO_SPAWN_INTERVAL = 4.0;  // seconds between UFO launches

let cityHealth = CITY_MAX_HEALTH;
let invasionWave = 0;
let mothership = null;
const enemies = [];
const enemyProjectiles = [];

// City-damage collapse state
let collapseTimer = 0;
let reinforcementCooldown = 0;

function mulberry(seed) {
  return function () {
    seed |= 0;
    seed = seed + 0x6D2B79F5 | 0;
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
    const w = range(60, 120);
    const h = range(110, 270);
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

  const carCounts = new Map();
  x = 120;
  while (x < WORLD_W - 60) {
    let img = null;
    let carKey = null;

    for (let attempt = 0; attempt < 12; attempt++) {
      const candidate = pickArt('car_', 4);
      if (!candidate) break;
      const key = candidate.src || candidate.currentSrc || candidate;
      if ((carCounts.get(key) || 0) < 2) {
        img = candidate;
        carKey = key;
        break;
      }
    }

    if (img) {
      carCounts.set(carKey, (carCounts.get(carKey) || 0) + 1);
      const scale = 0.5;
      props.push({
        kind: 'car', x, y: ROAD - 6, w: img.width * scale, h: img.height * scale,
        img, color: pick(carColors), hp: 0.4, seed: 0, flash: 0, shake: 0,
      });
    }
    x += range(240, 420);
  }
}

function propAt(px, py) {
  for (const p of props) {
    if (p.collapsing !== undefined) continue;
    if (px >= p.x - p.w / 2 && px <= p.x + p.w / 2 &&
      py >= p.y - p.h && py <= p.y) return p;
  }
  return null;
}

function hurtProp(p, dt) {
  if (p.collapsing !== undefined) return;
  p.hp -= dt;
  p.flash = 0.06;
  p.shake = (Math.random() - 0.5) * 2;
  if (p.hp <= 0) breakProp(p);
}

function breakProp(p) {
  if (p.kind === 'building') {
    if (p.collapsing !== undefined) return;
    p.collapsing = 0;
    p.hp = 0;
    return;
  }

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
      life: 0.9,
      color,
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
  for (let i = props.length - 1; i >= 0; i--) {
    const p = props[i];
    if (p.collapsing !== undefined) {
      p.collapsing += dt;
      if (p.collapsing >= 0.65) {
        const n = Math.max(10, Math.min(60, Math.floor(p.w * p.h / 120)));
        burst(p.x, GROUND - 4, p.color, n);
        props.splice(i, 1);
        kills++;
      }
      continue;
    }
    if (p.flash > 0) {
      p.flash -= dt;
      if (p.flash <= 0) {
        p.flash = 0;
        p.shake = 0;
      }
    }
  }
}

function startNextWave() {
  invasionWave++;
  const health = BOSS_BASE_HEALTH * Math.pow(BOSS_WAVE_HEALTH_SCALE, invasionWave - 1);
  mothership = {
    kind: 'mothership',
    x: WORLD_W + 200,
    y: -420,
    w: 900,
    h: 600,
    hp: health,
    maxHp: health,
    ufoTimer: 1.0,  // no attackTimer — mothership only deploys UFOs
  };
}

// Spawn a UFO from the mothership's visible underside (left portion that peeks in)
function spawnUfo() {
  if (!mothership) return;
  const sx = mothership.x - mothership.w * 0.45 + Math.random() * mothership.w * 0.3;
  const sy = mothership.y + mothership.h * 0.72;
  const role = Math.random() < 0.55 ? 'chaser' : 'lander';
  enemies.push({
    kind: 'ufo', role, x: sx, y: sy,
    w: 54, h: 30,
    hp: UFO_HEALTH, maxHp: UFO_HEALTH,
    vx: -60 - Math.random() * 40,
    vy: 20,
    attackTimer: 1.5 + Math.random(),
    phase: Math.random() * Math.PI * 2,
    landTimer: 0, hasDropped: false,
  });
}

// Reinforcement UFOs — drop from high above, scattered across the visible sky
function spawnReinforcementUfo() {
  // Spawn across the whole world width so they rain down from above
  const sx = Math.random() * WORLD_W;
  const sy = -300 - Math.random() * 200;
  const role = Math.random() < 0.6 ? 'chaser' : 'lander';
  enemies.push({
    kind: 'ufo', role, x: sx, y: sy,
    w: 54, h: 30,
    hp: UFO_HEALTH, maxHp: UFO_HEALTH,
    vx: (Math.random() - 0.5) * 80,
    vy: 40 + Math.random() * 30, // falling in fast from space
    attackTimer: 2 + Math.random() * 2,
    phase: Math.random() * Math.PI * 2,
    landTimer: 0, hasDropped: false,
  });
}

// Spawn an alien at world position x, y (dropped by a lander)
function spawnAlien(x, y) {
  enemies.push({
    kind: 'alien',
    role: 'walker',
    x,
    y,
    w: 18,   // much smaller
    h: 22,
    hp: ALIEN_HEALTH,
    maxHp: ALIEN_HEALTH,
    vx: (Math.random() < 0.5 ? -1 : 1) * 35,
    vy: 0,
    attackTimer: 1.0 + Math.random(),
    phase: Math.random() * Math.PI * 2,
  });
}

function fireEnemyProjectile(x, y, kind) {
  const targetPlayer = Math.abs(player.x - x) < 420 && Math.random() < 0.65;
  const tx = targetPlayer ? player.x :
    Math.max(0, Math.min(WORLD_W, x + (Math.random() - 0.5) * 500));
  const ty = targetPlayer ? player.y - 15 : GROUND;
  const dx = tx - x;
  const dy = ty - y;
  const len = Math.hypot(dx, dy) || 1;

  enemyProjectiles.push({
    x, y,
    vx: dx / len * ENEMY_SHOT_SPEED,
    vy: dy / len * ENEMY_SHOT_SPEED,
    damage: ENEMY_SHOT_DAMAGE,
    kind,
    life: 5,
  });
}

// Auto-collapse buildings as city takes damage.
// The lower cityHealth, the shorter the cooldown and the more buildings fall at once.
function updateCityCollapse(dt) {
  const ratio = cityHealth / CITY_MAX_HEALTH;
  if (ratio >= 0.99) { collapseTimer = 0; return; } // city is pristine

  // Interval shrinks from 7s (at 1% damage) to 1s (at full destruction)
  const interval = 1 + ratio * 6;
  collapseTimer -= dt;
  if (collapseTimer > 0) return;
  collapseTimer = interval;

  // Number of simultaneous collapses increases as health drops
  const count = Math.ceil((1 - ratio) * 3); // 1 at 33% damage, 3 at 100%
  const buildings = props.filter(p => p.kind === 'building' && p.collapsing === undefined);
  for (let i = 0; i < Math.min(count, buildings.length); i++) {
    // Pick a random building weighted toward those near the front of the screen
    const idx = Math.floor(Math.random() * buildings.length);
    breakProp(buildings[idx]);
    buildings.splice(idx, 1);
  }
}

function updateInvasion(dt) {
  updateCityCollapse(dt);

  if (!mothership) {
    if (enemies.length === 0) startNextWave();
    updateEnemyProjectiles(dt);
    updateEnemies(dt);
    return;
  }

  // Mothership stays fixed in world-space — no camera tracking, no direct shots.
  // It ONLY launches UFOs, with rate scaling up as city takes damage.

  const cityRatio = cityHealth / CITY_MAX_HEALTH;
  // At full city health: 4s interval. At 0% city health: 0.5s interval.
  const spawnInterval = Math.max(0.5, UFO_SPAWN_INTERVAL * (0.12 + 0.88 * cityRatio));

  mothership.ufoTimer -= dt;
  if (mothership.ufoTimer <= 0) {
    spawnUfo();
    mothership.ufoTimer = spawnInterval;
  }

  // ── Reinforcement batches: when UFO count drops low at damaged city health ──
  reinforcementCooldown -= dt;
  const ufoCount = enemies.filter(e => e.kind === 'ufo').length;
  if (reinforcementCooldown <= 0 && cityRatio < 0.7 && ufoCount < 3) {
    const batchSize = 3 + Math.floor((1 - cityRatio) * 5); // 3 to 8 UFOs
    for (let i = 0; i < batchSize; i++) {
      spawnReinforcementUfo();
    }
    reinforcementCooldown = 18; // don't reinforce again for 18 seconds
  }

  updateEnemies(dt);
  updateEnemyProjectiles(dt);

  if (mothership.hp <= 0) {
    mothership = null;
    if (enemies.length === 0) startNextWave();
  }
}

function updateEnemies(dt) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    e.phase += dt;

    if (e.kind === 'ufo') {
      updateUfo(e, dt);
    } else {
      updateAlien(e, dt);
    }

    if (e.hp <= 0) {
      burst(e.x, e.y, '#63a8cf', 18);
      enemies.splice(i, 1);
      kills++;
    }
  }
}

function updateUfo(e, dt) {
  if (e.role === 'chaser') {
    // Accelerate toward the player
    const dx = player.x - e.x;
    const dy = (player.y - 20) - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    const spd = 110 + invasionWave * 10;
    e.vx += (dx / dist * spd - e.vx) * Math.min(1, dt * 3);
    e.vy += (dy / dist * spd - e.vy) * Math.min(1, dt * 3);
    e.x += e.vx * dt;
    e.y += e.vy * dt;

    // Ram damage
    if (Math.hypot(player.x - e.x, (player.y - 15) - e.y) < 26) {
      damagePlayer(12);
      e.hp = 0;
      return;
    }

    // Shoot at player occasionally
    e.attackTimer -= dt;
    if (e.attackTimer <= 0) {
      fireEnemyProjectile(e.x, e.y + e.h / 2, 'ufo');
      e.attackTimer = Math.max(0.8, ENEMY_ATTACK_INTERVAL - invasionWave * 0.1);
    }

    // Despawn if too far off world
    if (e.x < -200 || e.x > WORLD_W + 200 || e.y > GROUND + 200) e.hp = 0;

  } else {
    // Lander: descend straight down toward the ground
    const targetY = GROUND - e.h / 2 - 5;
    if (e.y < targetY) {
      e.vy += (80 - e.vy) * Math.min(1, dt * 2);
      // slight drift toward player for drama
      const dx = player.x - e.x;
      e.vx += (Math.sign(dx) * 30 - e.vx) * Math.min(1, dt * 1.5);
      e.x += e.vx * dt;
      e.y += e.vy * dt;
    } else {
      // Landed — drop alien and vanish
      e.y = targetY;
      if (!e.hasDropped) {
        e.hasDropped = true;
        spawnAlien(e.x, GROUND);
        e.landTimer = 0.6; // linger briefly then leave
      }
      e.landTimer -= dt;
      if (e.landTimer <= 0) e.hp = 0;
    }
  }
}

function updateAlien(e, dt) {
  // Walk along the ground, bounce off edges, shoot up at player
  e.x += e.vx * dt;
  if (e.x < 20 || e.x > WORLD_W - 20) e.vx *= -1;
  e.y = GROUND; // stay grounded

  e.attackTimer -= dt;
  if (e.attackTimer <= 0) {
    fireEnemyProjectile(e.x, e.y - e.h, 'alien');
    e.attackTimer = Math.max(1.0, ENEMY_ATTACK_INTERVAL - invasionWave * 0.08);
  }

  // Despawn if HP gone (handled in caller)
}

function updateEnemyProjectiles(dt) {
  for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
    const p = enemyProjectiles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;

    if (Math.hypot(p.x - player.x, p.y - (player.y - 15)) < 18) {
      damagePlayer(p.damage);
      enemyProjectiles.splice(i, 1);
      continue;
    }

    if (p.y >= GROUND) {
      cityHealth = Math.max(0, cityHealth - p.damage);
      enemyProjectiles.splice(i, 1);
      continue;
    }

    if (p.life <= 0 || p.x < 0 || p.x > WORLD_W || p.y < -500) {
      enemyProjectiles.splice(i, 1);
    }
  }
}
