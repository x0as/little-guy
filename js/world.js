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
const UFO_SPAWN_INTERVAL = 7.5;
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

let reinforcementCooldown = 0;

const mothershipPhrases = [
  "That mothership is way too massive for me. I have to protect the people!",
  "I'm still just a little guy. That mothership is out of my league!",
  "I can't take down the mothership alone, but I can save the city!",
  "The mothership is way above my league. Time to protect what matters!",
  "I'm no match for the mothership yet. I have to protect the city!",
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

  x = 330;
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

  props.push({
    kind: 'building', isLab: true, x: 220, y: GROUND, w: 140, h: 190,
    color: '#315064', hp: 2.8, maxHp: 2.8,
    seed: 3, flash: 0, shake: 0, healFlash: 0,
  });

  const buildings = props.filter(p => p.kind === 'building');
  const share = buildings.length ? CITY_MAX_HEALTH / buildings.length : 0;
  for (const p of buildings) p.cityShare = share;
  syncCityHealth();

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
      const scale = 0.18;
      props.push({
        kind: 'car', x, y: ROAD - 18, w: img.width * scale, h: img.height * scale,
        img, color: pick(carColors), hp: 0.4, maxHp: 0.4, seed: 0, flash: 0, shake: 0, healFlash: 0,
      });
    }
    x += range(240, 420);
  }
}

function syncCityHealth() {
  let remaining = 0;
  for (const p of props) {
    if (p.kind !== 'building' || !p.cityShare) continue;
    remaining += p.cityShare * Math.max(0, Math.min(1, p.hp / p.maxHp));
  }
  cityHealth = Math.max(0, Math.min(CITY_MAX_HEALTH, remaining));
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
  p.hp = Math.max(0, p.hp - dt);
  p.flash = 0.06;
  p.shake = (Math.random() - 0.5) * 2;
  if (p.hp <= 0) breakProp(p);
  else if (p.kind === 'building') syncCityHealth();
}

function healProp(p, dt) {
  if (p.collapsing !== undefined) return;
  if (p.kind !== 'building') return;
  p.hp = Math.min(p.maxHp, p.hp + dt * 0.4);
  p.healFlash = 0.06;
  syncCityHealth();
}

function breakProp(p) {
  if (p.kind === 'building') {
    if (p.collapsing !== undefined) return;
    p.collapsing = 0;
    p.hp = 0;
    playSound('sonicBoom');
    syncCityHealth();
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

    if (p.kind === 'building' && p.collapsing === undefined && p.hp / p.maxHp <= 0.45) {
      p.damageSmokeTimer = (p.damageSmokeTimer || 0) - dt;
      if (p.damageSmokeTimer <= 0) {
        p.damageSmokeTimer = 0.32 + Math.random() * 0.2;
        smokeParticles.push({
          x: p.x + (Math.random() - 0.5) * p.w * 0.45,
          y: p.y - p.h - 2,
          vx: (Math.random() - 0.5) * 8,
          vy: -18 - Math.random() * 16,
          size: 3 + Math.random() * 3,
          life: 1.1,
          maxLife: 1.1,
          color: '#55545a',
        });
      }
    }
  }
}

function startNextWave() {
  invasionWave++;
  playSound('wave');
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
    laserTimer: invasionWave >= 2 ? 3 + Math.random() * 2 : 4 + Math.random() * 2,
  };
}

function fireMothershipLaser() {
  if (!mothership) return;
  const x = mothership.x - mothership.w * 0.42;
  const y = mothership.y + mothership.h * 0.68;
  const dx = player.x - x;
  const dy = player.y - 15 - y;
  const len = Math.hypot(dx, dy) || 1;
  const speed = 340;
  enemyProjectiles.push({
    x, y,
    vx: dx / len * speed,
    vy: dy / len * speed,
    damage: 14,
    kind: 'mothershipLaser',
    life: 8,
  });
}

function spawnUfo() {
  if (!mothership) return;
  const sx = mothership.x - mothership.w * 0.45 + Math.random() * mothership.w * 0.3;
  const sy = mothership.y + mothership.h * 0.72;
  const roll = Math.random();
  const role = roll < 0.3 ? 'chaser' : roll < 0.55 ? 'striker' : 'lander';
  const hunterChance = Math.min(0.6, 0.28 + invasionWave * 0.025);
  const hunter = role === 'chaser' && Math.random() < hunterChance;
  const variant = hunter ? 'hunter' : role === 'striker' ? 'striker' : 'standard';
  const standardHealth = UFO_HEALTH + Math.max(0, invasionWave - 1) * 8;
  const hunterHealth = standardHealth + 60 + invasionWave * 12;
  enemies.push({
    kind: 'ufo', role, variant, x: sx, y: sy,
    w: hunter ? 70 : role === 'striker' ? 60 : 54,
    h: hunter ? 41 : role === 'striker' ? 34 : 30,
    hp: hunter ? hunterHealth : standardHealth, maxHp: hunter ? hunterHealth : standardHealth,
    vx: role === 'striker' ? (Math.random() < 0.5 ? -1 : 1) * 65 : -60 - Math.random() * 40,
    vy: 20,
    attackTimer: 1.5 + Math.random(),
    strikeTimer: 2.5 + Math.random() * 2,
    windup: 0,
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
  const roll = Math.random();
  const role = roll < 0.28 ? 'chaser' : roll < 0.53 ? 'striker' : 'lander';
  const hunterChance = Math.min(0.6, 0.28 + invasionWave * 0.025);
  const hunter = role === 'chaser' && Math.random() < hunterChance;
  const variant = hunter ? 'hunter' : role === 'striker' ? 'striker' : 'standard';
  const standardHealth = UFO_HEALTH + Math.max(0, invasionWave - 1) * 8;
  const hunterHealth = standardHealth + 60 + invasionWave * 12;
  enemies.push({
    kind: 'ufo', role, variant, x: sx, y: sy,
    w: hunter ? 70 : role === 'striker' ? 60 : 54,
    h: hunter ? 41 : role === 'striker' ? 34 : 30,
    hp: hunter ? hunterHealth : standardHealth, maxHp: hunter ? hunterHealth : standardHealth,
    vx: role === 'striker' ? (Math.random() < 0.5 ? -1 : 1) * 65 : (Math.random() - 0.5) * 80,
    vy: 40 + Math.random() * 30,
    attackTimer: 2 + Math.random() * 2,
    strikeTimer: 2.5 + Math.random() * 2,
    windup: 0,
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
    sound: null,
    soundStarted: false,
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

function updateInvasion(dt) {
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
    const batch = Math.min(7, 2 + Math.floor((invasionWave - 1) / 2) + Math.floor(Math.random() * 2));
    for (let b = 0; b < batch; b++) spawnUfo();
    mothership.ufoTimer = spawnInterval;
  }

  if (invasionWave >= 2) {
    mothership.laserTimer -= dt;
    if (mothership.laserTimer <= 0) {
      fireMothershipLaser();
      const wavePressure = Math.min(1.5, (invasionWave - 2) * 0.25);
      mothership.laserTimer = 5.5 - wavePressure + Math.random() * 2;
    }
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
  if (e.empStun > 0) {
    e.empStun = Math.max(0, e.empStun - dt);
    e.vx = 0;
    e.vy = 0;
    if (e.empDropping) {
      const groundY = GROUND - e.h / 2 - 5;
      e.empVy = (e.empVy || 0) + 420 * dt;
      e.y = Math.min(groundY, e.y + e.empVy * dt);
      if (e.y >= groundY) {
        e.y = groundY;
        e.empDropping = false;
        if (e.role === 'lander') {
          e.hasDropped = true;
          e.landTimer = 0.5;
        }
      }
    }
    return;
  }

  if (e.role === 'chaser') {
    const dx = player.x - e.x;
    const dy = (player.y - 20) - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    const spd = (e.variant === 'hunter' ? 205 : 110) + invasionWave * (e.variant === 'hunter' ? 16 : 10);
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
      e.attackTimer = Math.max(0.55, ENEMY_ATTACK_INTERVAL - invasionWave * (e.variant === 'hunter' ? 0.12 : 0.1));
    }

    if (e.x < -200 || e.x > WORLD_W + 200 || e.y > GROUND + 200) e.hp = 0;
  } else if (e.role === 'striker') {
    e.x += e.vx * dt;
    if (e.x < 80 || e.x > WORLD_W - 80) e.vx *= -1;
    e.y = 86 + Math.sin(e.phase * 1.8) * 12;

    if (e.windup > 0) {
      e.windup -= dt;
      if (e.windup <= 0) {
        fireStrikerVolley(e);
        e.strikeTimer = Math.max(1.8, 4.2 - invasionWave * 0.12);
      }
    } else {
      e.strikeTimer -= dt;
      if (e.strikeTimer <= 0) e.windup = 0.75;
    }
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

function fireStrikerVolley(e) {
  const target = getStrikerTarget(e);
  const dx = target.x - e.x;
  const dy = target.y - e.y;
  const angle = Math.atan2(dy, dx);
  const speed = 230;
  for (const spread of [-0.2, 0, 0.2]) {
    const shotAngle = angle + spread;
    enemyProjectiles.push({
      x: e.x, y: e.y + e.h / 2,
      vx: Math.cos(shotAngle) * speed,
      vy: Math.sin(shotAngle) * speed,
      damage: 12,
      kind: 'striker',
      life: 5,
    });
  }
}

function getStrikerTarget(e) {
  let target = { x: player.x, y: player.y - 15 };
  let nearest = Math.hypot(target.x - e.x, target.y - e.y);
  for (const ally of allies) {
    if (ally.hp <= 0) continue;
    const distance = Math.hypot(ally.x - e.x, ally.y - 10 - e.y);
    if (distance < nearest) {
      nearest = distance;
      target = { x: ally.x, y: ally.y - 10 };
    }
  }
  return target;
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

    const playerHitRadius = p.kind === 'striker' ? 26 : 18;
    if (Math.hypot(p.x - player.x, p.y - (player.y - 15)) < playerHitRadius) {
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
  let targetDist = 650;

  for (const e of enemies) {
    const d = Math.hypot(e.x - a.x, (e.y - e.h / 2) - (a.y - 10));
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
  playSound('rocketTakeoff');
  const dx = target.x - x;
  const dy = target.y - y;
  const len = Math.hypot(dx, dy) || 1;
  const speed = 120;
  rockets.push({
    x, y,
    vx: dx / len * speed,
    vy: dy / len * speed,
    target,
    damage: 60,
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
        playSound('rocketBoom');
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
        stopSound(h.sound);
        helicopters.splice(i, 1);
      }
    }

    const onScreen = h.x >= cam.x - 60 && h.x <= cam.x + 700;
    if (onScreen && !h.soundStarted) {
      h.sound = playSound('helicopter');
      h.soundStarted = true;
    } else if (!onScreen && h.soundStarted && h.sound) {
      stopSound(h.sound);
      h.sound = null;
      h.soundStarted = false;
    }
  }
}

function updateMeteors(dt) {
  if (!meteorsActive) return;

  meteorSpawnTimer -= dt;
  if (meteorSpawnTimer <= 0) {
    spawnFallingMeteor();
    meteorSpawnTimer = 7 + Math.random() * 6;
  }

  for (let i = fallingMeteors.length - 1; i >= 0; i--) {
    const m = fallingMeteors[i];
    m.x += m.vx * dt;
    m.y += m.vy * dt;
    m.vy += 32 * dt;

    const hitTargets = m.hitTargets;
    if (!hitTargets.has(player) && Math.hypot(m.x - player.x, m.y - (player.y - 15)) < m.r * m.s + 10) {
      hitTargets.add(player);
      damagePlayer(18);
      burst(m.x, m.y, '#ffb14c', 8, 55, 35);
    }

    for (const e of enemies) {
      const targetY = e.kind === 'alien' ? e.y - e.h / 2 : e.y;
      if (!hitTargets.has(e) && Math.hypot(m.x - e.x, m.y - targetY) < m.r * m.s + Math.max(e.w, e.h) * 0.35) {
        hitTargets.add(e);
        e.hp -= 35;
        burst(m.x, m.y, '#ffb14c', 8, 55, 35);
      }
    }

    for (const a of allies) {
      if (!hitTargets.has(a) && Math.hypot(m.x - a.x, m.y - (a.y - 10)) < m.r * m.s + 10) {
        hitTargets.add(a);
        a.hp -= 20;
        burst(m.x, m.y, '#ffb14c', 8, 55, 35);
      }
    }

    if (m.y >= GROUND - m.r) {
      shake(4, 300);
      burst(m.x, GROUND, '#ff6633', 20, 120, 80);
      for (const p of props) {
        if (p.kind === 'building' && p.collapsing === undefined &&
            Math.abs(p.x - m.x) < p.w / 2 + m.r * 2) {
          hurtProp(p, 0.8);
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
    vx: -48 - Math.random() * 35,
    vy: 48 + Math.random() * 22,
    r: 14 + Math.random() * 8,
    s: 1.5 + Math.random(),
    hp: 190,
    maxHp: 190,
    hitTargets: new Set(),
  });
}
