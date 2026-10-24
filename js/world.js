const WORLD_W = 3000;
const GROUND = 300;
const ROAD = 346;

const props = [];
const farBuildings = [];
const debris = [];
let kills = 0;

const CITY_MAX_HEALTH = 500;
const UFO_HEALTH = 70;
const ALIEN_HEALTH = 40;
const ENEMY_SHOT_DAMAGE = 8;
const ENEMY_SHOT_SPEED = 190;
const ENEMY_ATTACK_INTERVAL = 1.8;
const UFO_SPAWN_INTERVAL = 4.0;
const WAVE_DURATION = 90;
const ALLY_HEALTH = 30;
const ALLY_SHOT_DAMAGE = 5;
const ALLY_SHOT_SPEED = 250;
const ALLY_ATTACK_INTERVAL = 1.2;

let cityHealth = CITY_MAX_HEALTH;
let invasionWave = 0;
let mothership = null;
let waveTimer = 0;
let mothershipMsgShown = false;
const enemies = [];
const enemyProjectiles = [];
const allies = [];
const allyProjectiles = [];
const rockets = [];
const smokeParticles = [];
const helicopters = [];
const fallingMeteors = [];
let meteorSpawnTimer = 0;
let meteorsActive = false;

let collapseTimer = 0;
let reinforcementCooldown = 0;

const mothershipPhrases = [
  "That thing's way too massive... gotta protect the people!",
  "Super or not, I'm still just a little guy... focus on the city!",
  "No way I can take that beast down... better save who I can!",
  "Way above my league... time to protect what matters!",
  "Even heroes know when to pick their battles!",
];

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
    const hp = 1.2 + h / 150;

    props.push({
      kind: 'building', x: x + w / 2, y: GROUND, w, h, img,
      color: pick(buildingColors), hp, maxHp: hp,
      seed: Math.floor(r() * 1e9), flash: 0, shake: 0, healFlash: 0,
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
      const scale = 0.15;
      props.push({
        kind: 'car', x, y: ROAD - 18, w: img.width * scale, h: img.height * scale,
        img, color: pick(carColors), hp: 0.4, maxHp: 0.4, seed: 0, flash: 0, shake: 0, healFlash: 0,
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

function healProp(p, dt) {
  if (p.collapsing !== undefined) return;
  if (p.kind !== 'building') return;
  p.hp = Math.min(p.maxHp, p.hp + dt * 0.4);
  p.healFlash = 0.06;
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
      if (p.flash <= 0) { p.flash = 0; p.shake = 0; }
    }
    if (p.healFlash > 0) {
      p.healFlash -= dt;
      if (p.healFlash <= 0) p.healFlash = 0;
    }
  }
}

function startNextWave() {
  invasionWave++;
  waveTimer = WAVE_DURATION;
  mothershipMsgShown = false;
  mothership = {
    kind: 'mothership',
    x: WORLD_W + 200,
    y: -420,
    w: 900,
    h: 600,
    hp: 1,
    maxHp: 1,
    ufoTimer: 1.0,
  };
}

function spawnUfo() {
  if (!mothership) return;
  const sx = mothership.x - mothership.w * 0.45 + Math.random() * mothership.w * 0.3;
  const sy = mothership.y + mothership.h * 0.72;
  const role = Math.random() < 0.35 ? 'chaser' : 'lander';
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

function spawnReinforcementUfo() {
  // Spawn near mothership if it exists, otherwise from above
  let sx, sy;
  if (mothership) {
    sx = mothership.x + (Math.random() - 0.5) * mothership.w * 0.6;
    sy = mothership.y + mothership.h * 0.5 + Math.random() * 60;
  } else {
    sx = Math.random() * WORLD_W;
    sy = -300 - Math.random() * 200;
  }
  const role = Math.random() < 0.3 ? 'chaser' : 'lander';
  enemies.push({
    kind: 'ufo', role, x: sx, y: sy,
    w: 54, h: 30,
    hp: UFO_HEALTH, maxHp: UFO_HEALTH,
    vx: (Math.random() - 0.5) * 80,
    vy: 40 + Math.random() * 30,
    attackTimer: 2 + Math.random() * 2,
    phase: Math.random() * Math.PI * 2,
    landTimer: 0, hasDropped: false,
  });
}

function spawnAlien(x, y) {
  enemies.push({
    kind: 'alien', role: 'walker', x, y,
    w: 18, h: 22,
    hp: ALIEN_HEALTH, maxHp: ALIEN_HEALTH,
    vx: (Math.random() < 0.5 ? -1 : 1) * 35,
    vy: 0,
    attackTimer: 1.0 + Math.random(),
    phase: Math.random() * Math.PI * 2,
    buildingTarget: null,
  });
}

function spawnAlly(x, y, role = 'soldier') {
  allies.push({
    x, y, vx: 0,
    hp: ALLY_HEALTH, maxHp: ALLY_HEALTH,
    attackTimer: 1.0 + Math.random(),
    facing: 1,
    role,
    healTimer: 0,
  });
}

function spawnHelicopter(targetX) {
  helicopters.push({
    x: -100, y: 60,
    targetX: Math.max(100, Math.min(WORLD_W - 100, targetX)),
    state: 'entering',
    dropCount: 0, maxDrops: 5,
    dropTimer: 0,
    groundY: GROUND - 18,
    dropOrder: ['soldier', 'soldier', 'healer', 'rocketeer', 'soldier'],
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
    kind, life: 5,
  });
}

function fireAlienProjectile(x, y, tx, ty) {
  const dx = tx - x;
  const dy = ty - y;
  const len = Math.hypot(dx, dy) || 1;
  enemyProjectiles.push({
    x, y,
    vx: dx / len * ENEMY_SHOT_SPEED * 0.7,
    vy: dy / len * ENEMY_SHOT_SPEED * 0.7,
    damage: ENEMY_SHOT_DAMAGE * 0.5,
    kind: 'alien', life: 4,
  });
}

function fireAllyProjectile(x, y, tx, ty) {
  const dx = tx - x;
  const dy = ty - y;
  const len = Math.hypot(dx, dy) || 1;
  allyProjectiles.push({
    x, y,
    vx: dx / len * ALLY_SHOT_SPEED,
    vy: dy / len * ALLY_SHOT_SPEED,
    damage: ALLY_SHOT_DAMAGE,
    life: 3,
  });
}

function updateCityCollapse(dt) {
  const ratio = cityHealth / CITY_MAX_HEALTH;
  if (ratio >= 0.99) { collapseTimer = 0; return; }

  const interval = 1 + ratio * 6;
  collapseTimer -= dt;
  if (collapseTimer > 0) return;
  collapseTimer = interval;

  const count = Math.ceil((1 - ratio) * 3);
  const buildings = props.filter(p => p.kind === 'building' && p.collapsing === undefined);
  for (let i = 0; i < Math.min(count, buildings.length); i++) {
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
    updateAllies(dt);
    updateAllyProjectiles(dt);
    updateRockets(dt);
    updateSmoke(dt);
    updateHelicopters(dt);
    updateMeteors(dt);
    return;
  }

  waveTimer -= dt;
  if (waveTimer <= 0) {
    burst(mothership.x - mothership.w * 0.3, mothership.y + mothership.h * 0.5, '#ff44ff', 30);
    shake(8, 500);
    mothership = null;
    showToast('WAVE ' + invasionWave + ' SURVIVED!', 3);
    if (invasionWave >= 2 && !meteorsActive) {
      meteorsActive = true;
      meteorSpawnTimer = 3;
    }
    updateEnemyProjectiles(dt);
    updateEnemies(dt);
    updateAllies(dt);
    updateAllyProjectiles(dt);
    updateRockets(dt);
    updateSmoke(dt);
    updateHelicopters(dt);
    updateMeteors(dt);
    return;
  }

  const cityRatio = cityHealth / CITY_MAX_HEALTH;
  const waveScale = 1 + invasionWave * 0.4;
  const spawnInterval = Math.max(0.4, UFO_SPAWN_INTERVAL / waveScale * (0.12 + 0.88 * cityRatio));

  mothership.ufoTimer -= dt;
  if (mothership.ufoTimer <= 0) {
    const batch = invasionWave >= 3 ? (Math.random() < 0.3 ? 2 : 1) : 1;
    for (let b = 0; b < batch; b++) spawnUfo();
    mothership.ufoTimer = spawnInterval;
  }

  reinforcementCooldown -= dt;
  const ufoCount = enemies.filter(e => e.kind === 'ufo').length;
  if (reinforcementCooldown <= 0 && cityRatio < 0.7 && ufoCount < 3) {
    const batchSize = 3 + Math.floor((1 - cityRatio) * 5);
    for (let i = 0; i < batchSize; i++) {
      spawnReinforcementUfo();
    }
    reinforcementCooldown = 18;
  }

  updateEnemies(dt);
  updateEnemyProjectiles(dt);
  updateAllies(dt);
  updateAllyProjectiles(dt);
  updateRockets(dt);
  updateSmoke(dt);
  updateHelicopters(dt);
  updateMeteors(dt);
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
    const dx = player.x - e.x;
    const dy = (player.y - 20) - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    const spd = 110 + invasionWave * 10;
    e.vx += (dx / dist * spd - e.vx) * Math.min(1, dt * 3);
    e.vy += (dy / dist * spd - e.vy) * Math.min(1, dt * 3);
    e.x += e.vx * dt;
    e.y += e.vy * dt;

    if (Math.hypot(player.x - e.x, (player.y - 15) - e.y) < 26) {
      damagePlayer(12);
      e.hp = 0;
      return;
    }

    e.attackTimer -= dt;
    if (e.attackTimer <= 0) {
      fireEnemyProjectile(e.x, e.y + e.h / 2, 'ufo');
      e.attackTimer = Math.max(0.8, ENEMY_ATTACK_INTERVAL - invasionWave * 0.1);
    }

    if (e.x < -200 || e.x > WORLD_W + 200 || e.y > GROUND + 200) e.hp = 0;
  } else {
    const targetY = GROUND - e.h / 2 - 5;
    if (e.y < targetY) {
      e.vy += (80 - e.vy) * Math.min(1, dt * 2);
      const dx = player.x - e.x;
      e.vx += (Math.sign(dx) * 30 - e.vx) * Math.min(1, dt * 1.5);
      e.x += e.vx * dt;
      e.y += e.vy * dt;
    } else {
      e.y = targetY;
      if (!e.hasDropped) {
        e.hasDropped = true;
        for (let i = 0; i < 3; i++) {
          spawnAlien(e.x + (i - 1) * 20, GROUND);
        }
        e.landTimer = 0.6;
      }
      e.landTimer -= dt;
      if (e.landTimer <= 0) e.hp = 0;
    }
  }
}

function updateAlien(e, dt) {
  // Find closest target: buildings, player, or military allies
  let moveTarget = null;
  let moveDist = Infinity;
  let moveType = null;

  for (const p of props) {
    if (p.kind !== 'building' || p.collapsing !== undefined) continue;
    const d = Math.abs(p.x - e.x);
    if (d < moveDist) { moveDist = d; moveTarget = p; moveType = 'building'; }
  }

  const pDist = Math.abs(player.x - e.x);
  if (pDist < moveDist) { moveDist = pDist; moveTarget = player; moveType = 'player'; }

  for (const a of allies) {
    const d = Math.abs(a.x - e.x);
    if (d < moveDist) { moveDist = d; moveTarget = a; moveType = 'ally'; }
  }

  if (moveTarget) {
    const dx = moveTarget.x - e.x;
    if (moveType === 'building') {
      e.buildingTarget = moveTarget;
      if (Math.abs(dx) > 15) {
        e.vx = Math.sign(dx) * 35;
      } else {
        e.vx = 0;
        hurtProp(moveTarget, dt * 0.5);
      }
    } else {
      e.buildingTarget = null;
      if (Math.abs(dx) > 25) {
        e.vx = Math.sign(dx) * 38;
      } else {
        e.vx = 0;
      }
    }
  } else {
    e.vx = 0;
    e.buildingTarget = null;
  }

  e.x += e.vx * dt;
  if (e.x < 20 || e.x > WORLD_W - 20) e.vx *= -1;
  e.y = GROUND;

  e.attackTimer -= dt;
  if (e.attackTimer <= 0) {
    let target = null;
    let targetDist = 400;

    const playerDist = Math.hypot(player.x - e.x, (player.y - 15) - (e.y - e.h));
    if (playerDist < targetDist) {
      target = { x: player.x, y: player.y - 15 };
      targetDist = playerDist;
    }

    for (const a of allies) {
      const d = Math.abs(a.x - e.x);
      if (d < targetDist) {
        target = { x: a.x, y: a.y - 10 };
        targetDist = d;
      }
    }

    if (target) {
      fireAlienProjectile(e.x, e.y - e.h, target.x, target.y);
      e.attackTimer = Math.max(1.0, ENEMY_ATTACK_INTERVAL - invasionWave * 0.08);
    } else {
      e.attackTimer = 0.5;
    }
  }
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

    let hit = false;
    for (let j = allies.length - 1; j >= 0; j--) {
      const a = allies[j];
      if (Math.hypot(p.x - a.x, p.y - (a.y - 10)) < 12) {
        a.hp -= p.damage;
        if (a.hp <= 0) {
          burst(a.x, a.y - 10, '#556b2f', 10);
          allies.splice(j, 1);
        }
        enemyProjectiles.splice(i, 1);
        hit = true;
        break;
      }
    }
    if (hit) continue;

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

function updateAllies(dt) {
  for (let i = allies.length - 1; i >= 0; i--) {
    const a = allies[i];

    if (a.role === 'healer') {
      updateHealerAlly(a, dt);
    } else if (a.role === 'rocketeer') {
      updateRocketeerAlly(a, dt);
    } else {
      updateSoldierAlly(a, dt);
    }

    a.x += a.vx * dt;
    a.x = Math.max(20, Math.min(WORLD_W - 20, a.x));
    a.y = GROUND;

    if (a.hp <= 0) {
      burst(a.x, a.y - 10, a.role === 'healer' ? '#44ff66' : (a.role === 'rocketeer' ? '#ff6644' : '#556b2f'), 10);
      allies.splice(i, 1);
    }
  }
}

function updateSoldierAlly(a, dt) {
  let target = null;
  let targetDist = 600;

  for (const e of enemies) {
    if (e.kind !== 'alien') continue;
    const d = Math.abs(e.x - a.x);
    if (d < targetDist) { target = e; targetDist = d; }
  }

  if (target) {
    const dx = target.x - a.x;
    a.facing = dx > 0 ? 1 : -1;
    if (Math.abs(dx) > 80) {
      a.vx = Math.sign(dx) * 40;
    } else {
      a.vx = 0;
      a.attackTimer -= dt;
      if (a.attackTimer <= 0) {
        fireAllyProjectile(a.x, a.y - 10, target.x, target.y - target.h / 2);
        a.attackTimer = ALLY_ATTACK_INTERVAL;
      }
    }
  } else {
    patrolAlly(a);
  }
}

function updateHealerAlly(a, dt) {
  // Find nearest damaged building
  let target = null;
  let targetDist = 400;

  for (const p of props) {
    if (p.kind !== 'building' || p.collapsing !== undefined) continue;
    if (p.hp >= p.maxHp) continue;
    const d = Math.abs(p.x - a.x);
    if (d < targetDist) { target = p; targetDist = d; }
  }

  if (target) {
    const dx = target.x - a.x;
    a.facing = dx > 0 ? 1 : -1;
    if (Math.abs(dx) > 20) {
      a.vx = Math.sign(dx) * 30;
    } else {
      a.vx = 0;
      a.healTimer += dt;
      if (a.healTimer >= 0.3) {
        a.healTimer = 0;
        healProp(target, 0.8);
        cityHealth = Math.min(CITY_MAX_HEALTH, cityHealth + 0.5);
      }
    }
  } else {
    patrolAlly(a);
  }
}

function updateRocketeerAlly(a, dt) {
  // Target UFOs specifically
  let target = null;
  let targetDist = 900;

  for (const e of enemies) {
    if (e.kind !== 'ufo') continue;
    const d = Math.hypot(e.x - a.x, e.y - a.y);
    if (d < targetDist) { target = e; targetDist = d; }
  }

  if (target) {
    a.facing = target.x > a.x ? 1 : -1;
    a.vx = 0;
    a.attackTimer -= dt;
    if (a.attackTimer <= 0) {
      fireRocket(a.x, a.y - 14, target);
      a.attackTimer = 3.0;
    }
  } else {
    // Also shoot aliens if no UFOs
    let alienTarget = null;
    let alienDist = 600;
    for (const e of enemies) {
      if (e.kind !== 'alien') continue;
      const d = Math.abs(e.x - a.x);
      if (d < alienDist) { alienTarget = e; alienDist = d; }
    }
    if (alienTarget) {
      const dx = alienTarget.x - a.x;
      a.facing = dx > 0 ? 1 : -1;
      if (Math.abs(dx) > 80) {
        a.vx = Math.sign(dx) * 40;
      } else {
        a.vx = 0;
        a.attackTimer -= dt;
        if (a.attackTimer <= 0) {
          fireAllyProjectile(a.x, a.y - 10, alienTarget.x, alienTarget.y - alienTarget.h / 2);
          a.attackTimer = ALLY_ATTACK_INTERVAL;
        }
      }
    } else {
      patrolAlly(a);
    }
  }
}

function patrolAlly(a) {
  if (!a.patrolTarget || Math.abs(a.patrolTarget - a.x) < 30) {
    a.patrolTarget = Math.max(80, Math.min(WORLD_W - 80,
      a.x + (Math.random() - 0.5) * 600));
  }
  const dx = a.patrolTarget - a.x;
  a.facing = dx > 0 ? 1 : -1;
  a.vx = Math.sign(dx) * 22;
}

function fireRocket(x, y, target) {
  const dx = target.x - x;
  const dy = target.y - y;
  const len = Math.hypot(dx, dy) || 1;
  const speed = 120;
  rockets.push({
    x, y,
    vx: dx / len * speed,
    vy: dy / len * speed,
    target,
    damage: 35,
    life: 6,
    age: 0,
    trail: [],
    smokeTimer: 0,
  });
}

function updateRockets(dt) {
  for (let i = rockets.length - 1; i >= 0; i--) {
    const r = rockets[i];
    r.age += dt;
    r.life -= dt;

    // Homing: steer toward target if still alive
    if (r.target && r.target.hp > 0) {
      const dx = r.target.x - r.x;
      const dy = (r.target.y - r.target.h / 2) - r.y;
      const dist = Math.hypot(dx, dy) || 1;
      const speed = 160 + r.age * 40; // accelerates over time
      const turnRate = 3.5;

      // Smoothly steer toward target
      const desiredVx = dx / dist * speed;
      const desiredVy = dy / dist * speed;
      r.vx += (desiredVx - r.vx) * Math.min(1, turnRate * dt);
      r.vy += (desiredVy - r.vy) * Math.min(1, turnRate * dt);

      // Add slight wobble for organic feel
      const wobble = Math.sin(r.age * 8) * 15;
      r.x += (r.vx + wobble * (dy / dist)) * dt;
      r.y += (r.vy - wobble * (dx / dist)) * dt;
    } else {
      // Lost target, fly straight
      r.x += r.vx * dt;
      r.y += r.vy * dt;
    }

    // Emit smoke particles
    r.smokeTimer -= dt;
    if (r.smokeTimer <= 0) {
      r.smokeTimer = 0.02;
      smokeParticles.push({
        x: r.x + (Math.random() - 0.5) * 3,
        y: r.y + (Math.random() - 0.5) * 3,
        vx: -r.vx * 0.1 + (Math.random() - 0.5) * 20,
        vy: -r.vy * 0.1 + (Math.random() - 0.5) * 20 - 15,
        size: 3 + Math.random() * 4,
        life: 0.6 + Math.random() * 0.3,
        maxLife: 0.6 + Math.random() * 0.3,
        color: Math.random() < 0.4 ? '#ffaa33' : '#888888',
      });
    }

    // Store trail positions
    r.trail.push({ x: r.x, y: r.y });
    if (r.trail.length > 20) r.trail.shift();

    // Check hit against enemies
    let hit = false;
    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j];
      if (Math.hypot(r.x - e.x, r.y - (e.y - e.h / 2)) < 20) {
        e.hp -= r.damage;
        // Explosion effect
        burst(r.x, r.y, '#ff6622', 25, 140, 100);
        burst(r.x, r.y, '#ffcc33', 15, 80, 60);
        // Explosion smoke
        for (let s = 0; s < 8; s++) {
          smokeParticles.push({
            x: r.x + (Math.random() - 0.5) * 10,
            y: r.y + (Math.random() - 0.5) * 10,
            vx: (Math.random() - 0.5) * 60,
            vy: (Math.random() - 0.5) * 60 - 20,
            size: 6 + Math.random() * 8,
            life: 0.8 + Math.random() * 0.5,
            maxLife: 0.8 + Math.random() * 0.5,
            color: '#555555',
          });
        }
        shake(3, 200);
        rockets.splice(i, 1);
        hit = true;
        break;
      }
    }
    if (hit) continue;

    if (r.life <= 0 || r.x < -100 || r.x > WORLD_W + 100 || r.y < -600 || r.y > GROUND + 50) {
      rockets.splice(i, 1);
    }
  }
}

function updateSmoke(dt) {
  for (let i = smokeParticles.length - 1; i >= 0; i--) {
    const s = smokeParticles[i];
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.vy -= 10 * dt; // slight upward drift
    s.size += dt * 3; // expand
    s.life -= dt;
    if (s.life <= 0) smokeParticles.splice(i, 1);
  }
}

function updateAllyProjectiles(dt) {
  for (let i = allyProjectiles.length - 1; i >= 0; i--) {
    const p = allyProjectiles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;

    let hit = false;
    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j];
      if (Math.hypot(p.x - e.x, p.y - (e.y - e.h / 2)) < 15) {
        e.hp -= p.damage;
        allyProjectiles.splice(i, 1);
        hit = true;
        break;
      }
    }
    if (hit) continue;

    if (p.life <= 0 || p.x < 0 || p.x > WORLD_W || p.y < -500) {
      allyProjectiles.splice(i, 1);
    }
  }
}

function updateHelicopters(dt) {
  for (let i = helicopters.length - 1; i >= 0; i--) {
    const h = helicopters[i];

    if (h.state === 'entering') {
      h.x += 150 * dt;
      if (h.x >= h.targetX) {
        h.x = h.targetX;
        h.state = 'descending';
      }
    } else if (h.state === 'descending') {
      h.y += 100 * dt;
      if (h.y >= h.groundY) {
        h.y = h.groundY;
        h.state = 'dropping';
        h.dropTimer = 0.5;
      }
    } else if (h.state === 'dropping') {
      h.dropTimer -= dt;
      if (h.dropTimer <= 0 && h.dropCount < h.maxDrops) {
        const role = h.dropOrder[h.dropCount] || 'soldier';
        spawnAlly(h.x + (Math.random() - 0.5) * 30, GROUND, role);
        h.dropCount++;
        h.dropTimer = 0.4;
      }
      if (h.dropCount >= h.maxDrops) {
        h.state = 'ascending';
      }
    } else if (h.state === 'ascending') {
      h.y -= 120 * dt;
      if (h.y <= 60) {
        h.y = 60;
        h.state = 'leaving';
      }
    } else if (h.state === 'leaving') {
      h.x += 180 * dt;
      if (h.x > WORLD_W + 200) {
        helicopters.splice(i, 1);
      }
    }
  }
}

function updateMeteors(dt) {
  if (!meteorsActive) return;

  meteorSpawnTimer -= dt;
  if (meteorSpawnTimer <= 0) {
    spawnFallingMeteor();
    meteorSpawnTimer = 4 + Math.random() * 5;
  }

  for (let i = fallingMeteors.length - 1; i >= 0; i--) {
    const m = fallingMeteors[i];
    m.x += m.vx * dt;
    m.y += m.vy * dt;
    m.vy += 55 * dt;

    if (m.y >= GROUND - m.r) {
      cityHealth = Math.max(0, cityHealth - 6);
      shake(4, 300);
      burst(m.x, GROUND, '#ff6633', 20, 120, 80);
      for (const p of props) {
        if (p.kind === 'building' && p.collapsing === undefined &&
            Math.abs(p.x - m.x) < p.w / 2 + m.r * 2) {
          hurtProp(p, 0.4);
        }
      }
      fallingMeteors.splice(i, 1);
      continue;
    }

    if (m.hp <= 0) {
      burst(m.x, m.y, '#ff8844', 15, 100, 60);
      fallingMeteors.splice(i, 1);
      kills++;
    }
  }
}

function spawnFallingMeteor() {
  const x = cam.x + 100 + Math.random() * 440;
  fallingMeteors.push({
    x: x + (Math.random() - 0.5) * 200,
    y: -100 - Math.random() * 200,
    vx: (Math.random() - 0.5) * 30,
    vy: 50 + Math.random() * 30,
    r: 14 + Math.random() * 8,
    s: 1.5 + Math.random(),
    hp: 120,
    maxHp: 120,
  });
}
