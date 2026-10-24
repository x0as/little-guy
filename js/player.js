const player = {
  x: 190,
  y: 296,
  vx: 0,
  vy: 0,
  form: 'small',
  facing: 1,
  control: false,
  beam: false,
  bx: 0,
  by: 0,
  t: 0,
  superFly: false,
  flyPose: 'normal',
  hp: 100,
  maxHp: 100,
  damageTime: -Infinity,
  beamTarget: null,
  beamHitTimer: 0,
};

const FLY_SPEED = 220;
const SUPER_SPEED_MULTIPLIER = 3;
const ACCEL = 8;
const BEAM_RANGE = 700;
const EYE_Y = -22;
const PLAYER_MAX_HEALTH = 100;
const PLAYER_REGEN_DELAY = 3;
const PLAYER_REGEN_RATE = 8;
const PLAYER_BEAM_DAMAGE = 30;
const PLAYER_BEAM_HIT_INTERVAL = 0.2;

function damagePlayer(amount) {
  if (gameOver) return;
  player.hp = Math.max(0, player.hp - amount);
  player.damageTime = player.t;
}

function updatePlayer(dt) {
  player.t += dt;
  player.beam = false;

  if (player.hp < player.maxHp &&
    player.t - player.damageTime >= PLAYER_REGEN_DELAY) {
    player.hp = Math.min(player.maxHp, player.hp + PLAYER_REGEN_RATE * dt);
  }

  if (!player.control || gameOver) {
    player.superFly = false;
    player.flyPose = 'normal';
    return;
  }

  const firing = !!(keys.Space || mouse.down);
  const shiftHeld = !!(keys.ShiftLeft || keys.ShiftRight || keys.Shift);
  player.superFly = shiftHeld;
  player.flyPose = player.superFly ? 'sideways' : 'normal';

  let dx = 0;
  let dy = 0;
  if (keys.KeyA || keys.ArrowLeft) dx -= 1;
  if (keys.KeyD || keys.ArrowRight) dx += 1;
  if (keys.KeyW || keys.ArrowUp) dy -= 1;
  if (keys.KeyS || keys.ArrowDown) dy += 1;

  const len = Math.hypot(dx, dy) || 1;
  const speed = FLY_SPEED * (player.superFly ? SUPER_SPEED_MULTIPLIER : 1);
  const k = 1 - Math.exp(-ACCEL * dt);

  player.vx += (dx / len * speed - player.vx) * k;
  player.vy += (dy / len * speed - player.vy) * k;
  player.x = Math.max(20, Math.min(WORLD_W - 20, player.x + player.vx * dt));
  player.y = Math.max(-380, Math.min(340, player.y + player.vy * dt));
  player.beam = firing;

  if (player.beam) {
    fireBeam(dt);
  } else {
    player.beamTarget = null;
    player.beamHitTimer = 0;
    if (Math.abs(player.vx) > 10) player.facing = player.vx > 0 ? 1 : -1;
  }
}

function fireBeam(dt) {
  const ox = player.x;
  const oy = player.y + EYE_Y;
  let dx = mouse.x + cam.x - ox;
  let dy = mouse.y + cam.y - oy;
  const len = Math.hypot(dx, dy);

  if (len < 1) {
    dx = player.facing;
    dy = 0;
  } else {
    dx /= len;
    dy /= len;
  }

  let ex = ox + dx * BEAM_RANGE;
  let ey = oy + dy * BEAM_RANGE;
  let hitProp = null;
  let hitEnemy = null;

  for (let d = 10; d < BEAM_RANGE; d += 6) {
    const px = ox + dx * d;
    const py = oy + dy * d;

    hitProp = propAt(px, py);
    if (hitProp) {
      ex = px;
      ey = py;
      break;
    }

    if (mothership && pointInEntity(px, py, mothership)) {
      hitEnemy = mothership;
      ex = px;
      ey = py;
      break;
    }

    hitEnemy = enemies.find(e => pointInEntity(px, py, e)) || null;
    if (hitEnemy) {
      ex = px;
      ey = py;
      break;
    }
  }

  player.bx = ex;
  player.by = ey;
  player.facing = ex >= player.x ? 1 : -1;

  if (hitProp) {
    hurtProp(hitProp, dt);
    player.beamTarget = null;
    player.beamHitTimer = 0;
  } else if (hitEnemy) {
    if (player.beamTarget !== hitEnemy) {
      player.beamTarget = hitEnemy;
      player.beamHitTimer = 0;
    }
    player.beamHitTimer -= dt;
    if (player.beamHitTimer <= 0) {
      hitEnemy.hp -= PLAYER_BEAM_DAMAGE;
      player.beamHitTimer = PLAYER_BEAM_HIT_INTERVAL;
    }
  } else {
    player.beamTarget = null;
    player.beamHitTimer = 0;
  }
}

function pointInEntity(x, y, entity) {
  return x >= entity.x - entity.w / 2 &&
    x <= entity.x + entity.w / 2 &&
    y >= entity.y - entity.h / 2 &&
    y <= entity.y + entity.h / 2;
}
