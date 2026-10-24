const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const cam = { x: 0, y: 0, follow: false, shake: 0, shakeDecay: 0 };
const flash = { a: 0 };
const keys = {};
const mouse = { x: 320, y: 180, down: false };
let scene = 'city';
let gameOver = false;
let toastMsg = '';
let toastTimer = 0;

function showToast(msg, duration) {
  toastMsg = msg;
  toastTimer = duration || 3;
}

function shake(amount, ms) {
  cam.shake = amount;
  cam.shakeDecay = amount / (ms / 1000);
}

function camTarget() {
  return {
    x: Math.max(0, Math.min(WORLD_W - 640, player.x - 320)),
    y: Math.max(-420, Math.min(0, player.y - 40 - 180)),
  };
}

function snapCamera() {
  const t = camTarget();
  cam.x = t.x;
  cam.y = t.y;
}

function restartGame() {
  gameOver = false;
  scene = 'city';
  toastMsg = '';
  toastTimer = 0;

  player.x = 300;
  player.y = 200;
  player.vx = 0;
  player.vy = 0;
  player.form = 'super';
  player.facing = 1;
  player.control = true;
  player.beam = false;
  player.bx = 0;
  player.by = 0;
  player.t = 0;
  player.superFly = false;
  player.flyPose = 'normal';
  player.hp = PLAYER_MAX_HEALTH;
  player.maxHp = PLAYER_MAX_HEALTH;
  player.damageTime = -Infinity;
  player.beamTarget = null;
  player.beamHitTimer = 0;
  player.power = 'laser';
  player.backupCooldown = 0;
  player.backupFiring = false;

  props.length = 0;
  farBuildings.length = 0;
  debris.length = 0;
  enemies.length = 0;
  enemyProjectiles.length = 0;
  allies.length = 0;
  allyProjectiles.length = 0;
  rockets.length = 0;
  smokeParticles.length = 0;
  helicopters.length = 0;
  fallingMeteors.length = 0;
  meteorSpawnTimer = 0;
  meteorsActive = false;

  kills = 0;
  cityHealth = CITY_MAX_HEALTH;
  invasionWave = 0;
  mothership = null;
  collapseTimer = 0;
  reinforcementCooldown = 0;
  waveTimer = 0;
  mothershipMsgShown = false;

  buildCity();
  snapCamera();
  cam.follow = true;
  startNextWave();
}

function update(dt) {
  updateTweens(dt);
  updatePlayer(dt);
  updateProps(dt);
  updateDebris(dt);
  updateDialogue(dt);

  if (toastTimer > 0) toastTimer -= dt;

  if (!gameOver && player.control) {
    updateInvasion(dt);
    if (player.hp <= 0 || cityHealth <= 0) {
      gameOver = true;
      player.control = false;
      player.beam = false;
    }
  }

  if (cam.follow) {
    const t = camTarget();
    const k = 1 - Math.exp(-7 * dt);
    cam.x += (t.x - cam.x) * k;
    cam.y += (t.y - cam.y) * k;
  }

  cam.shake = Math.max(0, cam.shake - cam.shakeDecay * dt);
}

let last = performance.now();

function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

addEventListener('keydown', e => {
  keys[e.code] = true;
  keys.Shift = e.shiftKey || e.code === 'ShiftLeft' || e.code === 'ShiftRight';

  if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();

  if (gameOver && !e.repeat && (e.code === 'Space' || e.code === 'Enter')) {
    restartGame();
    return;
  }

  if (!e.repeat && (e.code === 'Space' || e.code === 'Enter')) dialogueInput();

  if (e.code === 'Digit1') player.power = 'laser';
  if (e.code === 'Digit2') player.power = 'heal';
  if (e.code === 'Digit3') player.power = 'backup';
});

addEventListener('keyup', e => {
  keys[e.code] = false;
  keys.Shift = e.shiftKey;
});

addEventListener('blur', () => {
  for (const k in keys) keys[k] = false;
  mouse.down = false;
});

canvas.addEventListener('mousemove', e => {
  const r = canvas.getBoundingClientRect();
  mouse.x = (e.clientX - r.left) / r.width * 640;
  mouse.y = (e.clientY - r.top) / r.height * 360;
});

canvas.addEventListener('mousedown', () => {
  mouse.down = true;
  if (gameOver) {
    if (mouse.x >= PLAY_BTN.x && mouse.x <= PLAY_BTN.x + PLAY_BTN.w &&
        mouse.y >= PLAY_BTN.y && mouse.y <= PLAY_BTN.y + PLAY_BTN.h) {
      restartGame();
      return;
    }
  }
  dialogueInput();
});

addEventListener('mouseup', () => {
  mouse.down = false;
});

loadArt().then(() => {
  buildCity();
  if (location.search.includes('skip')) skipIntro();
  else runIntro();
  requestAnimationFrame(loop);
});
